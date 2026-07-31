/**
 * pain-index — where is Day14's own operation actually hurting, with numbers.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Tech Radar answers "what should we adopt?". Nothing answered "where does
 * it hurt?" — even though the system already emits that signal in six places and
 * never joined them. Without the second question the first one has no ranking
 * that means anything, which is how this codebase produced 253 market-research
 * briefs in 10 days that moved no business number.
 *
 * A candidate technology with no live pain attached should not rank. That is the
 * structural defence against the loop this project keeps relapsing into, and it
 * only works if "live pain" is a computed number rather than an opinion.
 *
 * DESIGN RULES
 *   - Pure. No fs, no next/*, no network, NO LLM CALLS. The LLM layer is dead as
 *     of writing (92 consecutive failures, zero successes) and this must work
 *     anyway — in fact that outage is the top entry it produces.
 *   - Severity is DERIVED from evidence numbers by a formula you can read below.
 *     Never a hand-assigned adjective. Same inputs must always give same score.
 *   - Derived on read. The caller writes ONE json and overwrites it. There is no
 *     directory of dated reports, because that is precisely what killed the four
 *     saturated loops (~/Claude/Projects/DAY14/analytics/ holds 264 of them).
 *   - If nothing clears the floor, the honest output is zero entries and a line
 *     saying so. An index that always has something to say has stopped
 *     discriminating.
 */

export const SEVERITY_FLOOR = 25;

export type PainSource =
  | "llm-layer"
  | "fleet"
  | "loop-gate"
  | "empire-sync"
  | "radar";

export interface PainEntry {
  /** Stable across runs, so `first_observed` can be carried forward. */
  id: string;
  source: PainSource;
  /** 0-100, computed. See the scoring notes on each rule. */
  severity: number;
  /** One line that names the number. */
  statement: string;
  /** The actual values the severity was derived from. */
  evidence: Record<string, string | number | boolean | null>;
  /** When this id was first seen. Carried forward by mergeWithPrevious(). */
  first_observed: string | null;
  still_true: boolean;
  /** Ids this entry absorbs, so one underlying condition yields one entry. */
  supersedes?: string[];
}

export interface PainIndex {
  schema: 1;
  generated_at: string;
  severity_floor: number;
  /** One line, always present — including when entries is empty. */
  statement: string;
  entries: PainEntry[];
  /** Sources that could not be read, so a gap never masquerades as health. */
  unread_sources: string[];
}

/* ------------------------------------------------------------------ inputs */

export interface LedgerInput {
  consecutive_failures?: number;
  last_success_at?: string | null;
  days?: Record<string, { calls?: number; ok?: number; failed?: number; est_cost_usd?: number }>;
}

export interface LoopGateConfigInput {
  loops?: Record<string, unknown>;
}

export interface LoopGateStateInput {
  loops?: Record<
    string,
    { runs?: number; productive_runs?: number; noop_streak?: number; auto_paused?: boolean }
  >;
}

export interface WorkRegisterInput {
  count: number;
  last_timestamp: string | null;
}

export interface HeartbeatInput {
  name: string;
  age_min: number;
}

export interface SyncInput {
  consecutive_failures?: number;
  last_ok_at?: string | null;
  last_error?: string | null;
}

export interface RadarItemInput {
  item: string;
  slug?: string;
  in_production_since?: string | null;
  blocked_by?: string;
}

export interface RadarInput {
  rings?: { adopt?: RadarItemInput[]; trial?: RadarItemInput[]; assess?: RadarItemInput[]; hold?: RadarItemInput[] };
}

export interface PainInputs {
  now: Date;
  ledger: LedgerInput | null;
  loopGateConfig: LoopGateConfigInput | null;
  /** null means the state FILE IS ABSENT — which is itself a finding, not a gap. */
  loopGateState: LoopGateStateInput | null;
  loopGateWiredInto: number;
  workRegister: WorkRegisterInput | null;
  heartbeats: HeartbeatInput[] | null;
  sync: SyncInput | null;
  radar: RadarInput | null;
  unreadSources?: string[];
}

/* ------------------------------------------------------------------ helpers */

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function daysBetween(fromIso: string | null | undefined, now: Date): number | null {
  if (!fromIso) return null;
  const t = Date.parse(fromIso);
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / 86_400_000);
}

/** Heartbeats older than this are treated as stopped, matching /dashboard's rule. */
export const STALE_HEARTBEAT_MIN = 60;
/** A work register untouched this long means nothing is recording work. */
export const STALE_REGISTER_DAYS = 7;

/* -------------------------------------------------------------------- rules */

/**
 * Each rule returns an entry or null. Severity formulas are deliberately simple
 * and clamped: readable beats clever, because a score nobody can re-derive by
 * hand is a score nobody will trust when it disagrees with them.
 */

/** LLM layer down. severity = 30 + 0.5·streak + 10·days_failing */
function ruleLlmOutage(i: PainInputs): PainEntry | null {
  const l = i.ledger;
  if (!l) return null;
  const streak = Number(l.consecutive_failures || 0);
  if (streak <= 0) return null;

  const days = Object.entries(l.days ?? {});
  const failingDays = days.filter(([, d]) => (d.calls ?? 0) > 0 && (d.ok ?? 0) === 0).length;
  const totalCalls = days.reduce((s, [, d]) => s + (d.calls ?? 0), 0);
  const totalOk = days.reduce((s, [, d]) => s + (d.ok ?? 0), 0);
  const sinceSuccess = daysBetween(l.last_success_at ?? null, i.now);

  const severity = clamp(30 + streak * 0.5 + failingDays * 10);
  const successPhrase =
    l.last_success_at == null
      ? "no successful call has ever been recorded"
      : `last success was ${sinceSuccess}d ago`;

  return {
    id: "llm-layer-down",
    source: "llm-layer",
    severity,
    statement: `LLM layer has returned ${streak} consecutive failures across ${failingDays} day(s) and ${successPhrase}.`,
    evidence: {
      consecutive_failures: streak,
      failing_days: failingDays,
      calls_total: totalCalls,
      calls_ok: totalOk,
      last_success_at: l.last_success_at ?? null,
    },
    first_observed: null,
    still_true: true,
  };
}

/**
 * The one that matters most: heartbeats green while nothing is produced.
 *
 * This is the exact condition fleet-deadman was built for — a 409-failure streak
 * that every dashboard called green. It is a COMPOSITE, and it supersedes the
 * narrower work-register-stale entry so one underlying condition yields one
 * entry rather than three.
 *
 * severity = 40 + fresh_pollers + register_age_days
 */
function ruleFleetTheatre(i: PainInputs): PainEntry | null {
  const hb = i.heartbeats;
  if (!hb || hb.length === 0) return null;
  const fresh = hb.filter((h) => h.age_min <= STALE_HEARTBEAT_MIN).length;
  if (fresh < 5) return null;

  const registerAge = i.workRegister ? daysBetween(i.workRegister.last_timestamp, i.now) : null;
  const llmDead = Number(i.ledger?.consecutive_failures || 0) > 0;
  const registerStale = registerAge !== null && registerAge > STALE_REGISTER_DAYS;
  if (!llmDead && !registerStale) return null;

  const severity = clamp(40 + fresh + (registerAge ?? 0));
  const parts: string[] = [`${fresh} pollers are heartbeating`];
  if (registerStale) parts.push(`no work has been recorded in ${registerAge} days`);
  if (llmDead) parts.push(`every LLM call is failing`);

  return {
    id: "fleet-running-producing-nothing",
    source: "fleet",
    severity,
    statement: `${parts.join(" and ")} — the health signals are green and the output is zero.`,
    evidence: {
      fresh_pollers: fresh,
      total_pollers: hb.length,
      work_register_age_days: registerAge,
      work_register_entries: i.workRegister?.count ?? null,
      llm_consecutive_failures: Number(i.ledger?.consecutive_failures || 0),
    },
    first_observed: null,
    still_true: true,
    supersedes: ["work-register-stale"],
  };
}

/** Narrower fallback when the fleet composite does not fire. */
function ruleWorkRegisterStale(i: PainInputs): PainEntry | null {
  const wr = i.workRegister;
  if (!wr) return null;
  const age = daysBetween(wr.last_timestamp, i.now);
  if (age === null || age <= STALE_REGISTER_DAYS) return null;
  return {
    id: "work-register-stale",
    source: "fleet",
    severity: clamp(20 + age),
    statement: `No skill invocation has been recorded in ${age} days; growth detection is running on frozen input.`,
    evidence: { age_days: age, entries: wr.count, last_timestamp: wr.last_timestamp },
    first_observed: null,
    still_true: true,
  };
}

/** Pollers that have actually stopped. severity = 30 + 5·count, capped. */
function ruleStalePollers(i: PainInputs): PainEntry | null {
  const hb = i.heartbeats;
  if (!hb || hb.length === 0) return null;
  const stale = hb.filter((h) => h.age_min > STALE_HEARTBEAT_MIN);
  if (stale.length === 0) return null;
  const oldest = Math.max(...stale.map((h) => h.age_min));
  return {
    id: "pollers-stopped",
    source: "fleet",
    severity: clamp(30 + stale.length * 5 + Math.min(oldest / 60, 20)),
    statement: `${stale.length} of ${hb.length} pollers have stopped heartbeating; the oldest is ${Math.round(oldest / 60)}h silent.`,
    evidence: {
      stale_count: stale.length,
      total: hb.length,
      oldest_age_min: oldest,
      names: stale.slice(0, 6).map((h) => h.name).join(", "),
    },
    first_observed: null,
    still_true: true,
  };
}

/**
 * The gate is configured and has never recorded a run.
 *
 * A gate that has never been exercised protects nothing, no matter how many
 * loops it is wired into. severity = 45 + 3·loops_configured + 2·wired_into
 */
function ruleLoopGateUnexercised(i: PainInputs): PainEntry | null {
  const cfg = i.loopGateConfig;
  if (!cfg) return null;
  const configured = Object.keys(cfg.loops ?? {}).length;
  if (configured === 0) return null;

  const recorded = Object.keys(i.loopGateState?.loops ?? {}).length;
  if (recorded > 0) return null;

  return {
    id: "loop-gate-never-exercised",
    source: "loop-gate",
    severity: clamp(45 + configured * 3 + i.loopGateWiredInto * 2),
    statement:
      i.loopGateWiredInto === 0
        ? `The loop gate has ${configured} loops configured, has recorded 0 runs, and no loop script imports it — the defence against saturated loops has no callers.`
        : `The loop gate has ${configured} loops configured and is imported by ${i.loopGateWiredInto} loop script(s), but has recorded 0 runs — nothing is actually being gated.`,
    evidence: {
      loops_configured: configured,
      // Its own CLI wrapper is excluded: reporting status is not gating.
      importing_loop_scripts: i.loopGateWiredInto,
      loops_with_recorded_runs: recorded,
      state_file_present: i.loopGateState !== null,
    },
    first_observed: null,
    still_true: true,
  };
}

/** Loops the gate has already auto-paused. */
function ruleLoopsAutoPaused(i: PainInputs): PainEntry | null {
  const loops = Object.entries(i.loopGateState?.loops ?? {});
  const paused = loops.filter(([, s]) => s.auto_paused);
  if (paused.length === 0) return null;
  return {
    id: "loops-auto-paused",
    source: "loop-gate",
    severity: clamp(30 + paused.length * 8),
    statement: `${paused.length} loop(s) auto-paused after consecutive no-op runs: ${paused.map(([n]) => n).join(", ")}.`,
    evidence: {
      paused_count: paused.length,
      names: paused.map(([n]) => n).join(", "),
      worst_streak: Math.max(...paused.map(([, s]) => Number(s.noop_streak || 0))),
    },
    first_observed: null,
    still_true: true,
  };
}

/** Empire-state sync cannot commit. severity = 50 + 2·streak */
function ruleSyncFailing(i: PainInputs): PainEntry | null {
  const s = i.sync;
  if (!s) return null;
  const streak = Number(s.consecutive_failures || 0);
  if (streak <= 0) return null;
  return {
    id: "empire-sync-failing",
    source: "empire-sync",
    severity: clamp(50 + streak * 2),
    statement: `The empire-state sync has failed ${streak} consecutive times; the cloud dashboard's data is frozen.`,
    evidence: {
      consecutive_failures: streak,
      last_ok_at: s.last_ok_at ?? null,
      last_error: (s.last_error ?? "").slice(0, 160) || null,
    },
    first_observed: null,
    still_true: true,
  };
}

/**
 * Decision debt: things placed in Adopt that are not running.
 *
 * Rule 1 of the radar says shipped-but-not-armed is not adoption. Every Adopt
 * entry with a null production date is a decision already made and never
 * collected on. severity = 35 + 10·count
 */
function ruleAdoptNotRunning(i: PainInputs): PainEntry | null {
  const adopt = i.radar?.rings?.adopt ?? [];
  if (adopt.length === 0) return null;
  const notRunning = adopt.filter((x) => x.in_production_since == null);
  if (notRunning.length === 0) return null;
  return {
    id: "adopt-ring-not-running",
    source: "radar",
    severity: clamp(35 + notRunning.length * 10),
    statement: `${notRunning.length} of ${adopt.length} Adopt entries are not running in production — decided and never armed.`,
    evidence: {
      not_running: notRunning.length,
      adopt_total: adopt.length,
      items: notRunning.map((x) => x.item).join("; ").slice(0, 300),
    },
    first_observed: null,
    still_true: true,
  };
}

/**
 * A radar item claiming production time that no state file corroborates.
 *
 * Specific by design rather than general: the loop gate is the one Trial item
 * carrying an `in_production_since`, and its own state file is the evidence.
 * A claim that cannot be checked is worse than no claim, because it accrues
 * toward the Adopt ring on its own.
 */
function ruleUnevidencedProductionClaim(i: PainInputs): PainEntry | null {
  const trial = i.radar?.rings?.trial ?? [];
  const gating = trial.find((x) => (x.slug ?? "").startsWith("trace-to-eval"));
  if (!gating || gating.in_production_since == null) return null;
  const recorded = Object.keys(i.loopGateState?.loops ?? {}).length;
  if (recorded > 0) return null;
  const claimedDays = daysBetween(gating.in_production_since, i.now);
  return {
    id: "radar-production-claim-unevidenced",
    source: "radar",
    severity: clamp(40 + (claimedDays ?? 0) * 4),
    statement: `"${gating.item}" claims ${claimedDays}d in production since ${gating.in_production_since}, but its state file records 0 runs — the Adopt clock is counting on an unverified claim.`,
    evidence: {
      item: gating.item,
      in_production_since: gating.in_production_since,
      claimed_days: claimedDays,
      recorded_runs: 0,
    },
    first_observed: null,
    still_true: true,
  };
}

/** Radar items blocked on something other than their own next step. */
function ruleBlockedItems(i: PainInputs): PainEntry | null {
  const rings = i.radar?.rings ?? {};
  const all = [...(rings.adopt ?? []), ...(rings.trial ?? []), ...(rings.assess ?? [])];
  const blocked = all.filter((x) => x.blocked_by);
  if (blocked.length === 0) return null;
  return {
    id: "radar-items-blocked",
    source: "radar",
    severity: clamp(15 + blocked.length * 6),
    statement: `${blocked.length} radar item(s) are blocked on something outside their own next step.`,
    evidence: {
      blocked_count: blocked.length,
      items: blocked.map((x) => x.item).join("; ").slice(0, 300),
    },
    first_observed: null,
    still_true: true,
  };
}

const RULES = [
  ruleLlmOutage,
  ruleFleetTheatre,
  ruleWorkRegisterStale,
  ruleStalePollers,
  ruleLoopGateUnexercised,
  ruleLoopsAutoPaused,
  ruleSyncFailing,
  ruleAdoptNotRunning,
  ruleUnevidencedProductionClaim,
  ruleBlockedItems,
];

/* ------------------------------------------------------------------ compute */

export function computePainIndex(inputs: PainInputs): PainIndex {
  const raw: PainEntry[] = [];
  for (const rule of RULES) {
    const entry = rule(inputs);
    if (entry) raw.push(entry);
  }

  // One underlying condition, one entry.
  const superseded = new Set<string>();
  for (const e of raw) for (const s of e.supersedes ?? []) superseded.add(s);

  const entries = raw
    .filter((e) => !superseded.has(e.id))
    .filter((e) => e.severity >= SEVERITY_FLOOR)
    .sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id));

  const unread = inputs.unreadSources ?? [];
  const statement =
    entries.length === 0
      ? `Nothing above the severity floor (${SEVERITY_FLOOR}).${
          unread.length ? ` ${unread.length} source(s) unreadable: ${unread.join(", ")}.` : " All sources read and within tolerance."
        }`
      : `${entries.length} live pain${entries.length === 1 ? "" : "s"}, worst at severity ${entries[0]!.severity}: ${entries[0]!.statement}`;

  return {
    schema: 1,
    generated_at: inputs.now.toISOString(),
    severity_floor: SEVERITY_FLOOR,
    statement,
    entries,
    unread_sources: unread,
  };
}

/**
 * Carry `first_observed` forward for ids that persist, so the index can say how
 * long something has hurt without keeping a directory of dated snapshots.
 * Entries that vanished are NOT retained — this file is current state, not a log.
 */
export function mergeWithPrevious(next: PainIndex, previous: PainIndex | null, now: Date): PainIndex {
  const seen = new Map<string, string>();
  for (const e of previous?.entries ?? []) {
    if (e.first_observed) seen.set(e.id, e.first_observed);
  }
  const nowIso = now.toISOString();
  return {
    ...next,
    entries: next.entries.map((e) => ({ ...e, first_observed: seen.get(e.id) ?? nowIso })),
  };
}
