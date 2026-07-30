/**
 * Tech Radar — types and the rule engine behind every ring change.
 *
 * The radar is the delta baseline for the weekly tech scan: anything on it is
 * SETTLED and must not be re-reported as new. That only holds if ring changes
 * are governed, so the four rules from the vault note are enforced HERE, in
 * code, rather than left as prose nobody checks.
 *
 * This module is intentionally pure — no fs, no next/*, no React. It is
 * imported by the dashboard, by the server actions, and by tests/tech-radar.test.ts.
 * File IO lives in `tech-radar-store.ts`.
 *
 * Human source of truth: ~/Claude/Projects/DAY14/Obsidian-Vault/Tech Radar.md
 * Machine copy (what this reads):  public/data/ops/tech-radar.json
 */

export const RADAR_RINGS = ["adopt", "trial", "assess", "hold"] as const;
export type RadarRing = (typeof RADAR_RINGS)[number];

/** Higher = more committed. Used to decide whether a move is up or down. */
const RING_RANK: Record<RadarRing, number> = {
  hold: 0,
  assess: 1,
  trial: 2,
  adopt: 3,
};

export const RING_LABEL: Record<RadarRing, string> = {
  adopt: "Adopt",
  trial: "Trial",
  assess: "Assess",
  hold: "Hold",
};

/** Rule 1: an item only reaches Adopt after a full week running in production. */
export const ADOPT_MIN_PRODUCTION_DAYS = 7;

/** Every ring change records why. Short enough to be quick, long enough to be a sentence. */
export const MIN_EVIDENCE_CHARS = 40;

export type RadarEffort = "minutes" | "hours" | "days" | "weeks";

export interface RadarItem {
  /** Display name. This is the field the headless scan matches against. */
  item: string;
  /** Stable id. Derived via radarSlug() when absent. */
  slug?: string;
  /** Date the item entered its current ring. */
  since?: string;
  /** Why it sits where it sits (Adopt / Trial / Assess). */
  why?: string;
  /** Why it is refused (Hold ring uses this instead of `why`). */
  reason?: string;
  /** Honest current state, e.g. "code shipped, Ollama not installed on the mini". */
  status?: string;
  /** What would justify revisiting a Hold item. */
  revisit?: string;
  /** The vault capability note that carries the maturity detail. */
  capability?: string;
  /** The single next concrete step that would advance this item. */
  next_action?: string;
  /** Rough size of that next step. */
  effort?: RadarEffort;
  /** What stands in the way right now. */
  blocked_by?: string;
  /**
   * Date this started running in production, or null if it is not running.
   * `undefined` means nobody has verified it either way — treated as unverified,
   * which is a flag, not a pass.
   */
  in_production_since?: string | null;
}

export interface RadarChangelogEntry {
  date: string;
  note: string;
  item?: string;
  from?: RadarRing;
  to?: RadarRing;
  evidence?: string;
  actor?: string;
}

export interface TechRadar {
  schema: number;
  title: string;
  purpose: string;
  raw_url?: string;
  updated: string;
  rules_for_changing_a_ring: string[];
  rings: Record<RadarRing, RadarItem[]>;
  changelog: RadarChangelogEntry[];
}

/* ---------------------------------------------------------------- identity */

/** Stable id from a display name. Same input always yields the same slug. */
export function radarSlug(item: string): string {
  return item
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function itemSlug(item: RadarItem): string {
  return item.slug && item.slug.length > 0 ? item.slug : radarSlug(item.item);
}

export interface RadarLocation {
  ring: RadarRing;
  index: number;
  item: RadarItem;
}

export function findRadarItem(radar: TechRadar, slug: string): RadarLocation | null {
  for (const ring of RADAR_RINGS) {
    const list = radar.rings[ring] ?? [];
    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      if (entry && itemSlug(entry) === slug) {
        return { ring, index: i, item: entry };
      }
    }
  }
  return null;
}

export function allRadarItems(radar: TechRadar): RadarLocation[] {
  const out: RadarLocation[] = [];
  for (const ring of RADAR_RINGS) {
    const list = radar.rings[ring] ?? [];
    list.forEach((item, index) => out.push({ ring, index, item }));
  }
  return out;
}

/* ------------------------------------------------------------------- dates */

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/* ---------------------------------------------------- rule 1: adopt window */

export interface AdoptEligibility {
  eligible: boolean;
  /** ISO date the 7-day window closes, or null when the clock has not started. */
  eligibleAt: string | null;
  daysRunning: number | null;
  detail: string;
}

/**
 * Rule 1 — "An item only moves to Adopt after it has run in production for a
 * week. Passing a selftest is not adoption. Being shipped-but-not-armed is
 * not adoption."
 */
export function adoptEligibility(item: RadarItem, now: Date = new Date()): AdoptEligibility {
  if (item.in_production_since === undefined) {
    return {
      eligible: false,
      eligibleAt: null,
      daysRunning: null,
      detail: "No production start recorded — unverified, which is not a pass.",
    };
  }
  if (item.in_production_since === null) {
    return {
      eligible: false,
      eligibleAt: null,
      daysRunning: null,
      detail: "Not running in production. Shipped-but-not-armed is not adoption.",
    };
  }
  const start = parseDate(item.in_production_since);
  if (!start) {
    return {
      eligible: false,
      eligibleAt: null,
      daysRunning: null,
      detail: `Unparseable production start date: ${item.in_production_since}`,
    };
  }
  const daysRunning = daysBetween(start, now);
  const closes = new Date(start.getTime() + ADOPT_MIN_PRODUCTION_DAYS * 86_400_000);
  if (daysRunning < ADOPT_MIN_PRODUCTION_DAYS) {
    return {
      eligible: false,
      eligibleAt: isoDate(closes),
      daysRunning,
      detail: `Running ${daysRunning}d of ${ADOPT_MIN_PRODUCTION_DAYS}d. Eligible ${isoDate(closes)}.`,
    };
  }
  return {
    eligible: true,
    eligibleAt: isoDate(closes),
    daysRunning,
    detail: `Running ${daysRunning}d without intervention. Window satisfied.`,
  };
}

/* ------------------------------------------- rule 2: new evidence, not opinion */

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

const CITATION_RE = /(\d{4}-\d{2}-\d{2})|(https?:\/\/\S+)/;

/**
 * Rule 2 — "Anything in Hold requires new evidence, not a new opinion."
 *
 * Novelty cannot be proven by a string check, so this enforces a deliberate
 * PROXY: an item leaving Hold must cite a date or a URL, and must not merely
 * restate the reason it was held for. That blocks the actual observed failure
 * mode (re-proposing a Hold item on enthusiasm) without pretending to be a
 * judge of evidence quality.
 */
export function checkEvidenceForHoldExit(
  item: RadarItem,
  evidence: string
): { ok: boolean; error?: string } {
  const ev = normalize(evidence);
  const reason = normalize(item.reason ?? "");

  if (!CITATION_RE.test(evidence)) {
    return {
      ok: false,
      error:
        "Leaving Hold needs new evidence, not a new opinion: cite a date (YYYY-MM-DD) or a URL — a launch, a benchmark, a shipped GA feature, a real price.",
    };
  }
  if (reason.length > 0 && (ev === reason || reason.includes(ev))) {
    return {
      ok: false,
      error: "That evidence restates the reason the item was held. Rule 2 needs something new.",
    };
  }
  return { ok: true };
}

/* -------------------------------------------------------- the move validator */

export type MoveDirection = "up" | "down" | "none";

export function moveDirection(from: RadarRing, to: RadarRing): MoveDirection {
  const a = RING_RANK[from];
  const b = RING_RANK[to];
  if (a === b) return "none";
  return b > a ? "up" : "down";
}

export interface RingMoveCheck {
  ok: boolean;
  error?: string;
  /** Which of the radar's four rules rejected the move. */
  rule?: 1 | 2 | 3 | 4;
  direction?: MoveDirection;
}

/**
 * Gate every ring change through the radar's own rules. Called by the server
 * action before anything is written, and unit-tested directly.
 */
export function validateRingMove(
  item: RadarItem,
  from: RadarRing,
  to: RadarRing,
  evidence: string,
  now: Date = new Date()
): RingMoveCheck {
  const direction = moveDirection(from, to);

  if (direction === "none") {
    return { ok: false, error: `Already in ${RING_LABEL[to]}.`, direction };
  }

  // Rule 4 — every ring change is recorded with the evidence that justified it.
  const trimmed = evidence.trim();
  if (trimmed.length < MIN_EVIDENCE_CHARS) {
    return {
      ok: false,
      rule: 4,
      direction,
      error: `Every ring change is recorded with its evidence. Write at least ${MIN_EVIDENCE_CHARS} characters (got ${trimmed.length}).`,
    };
  }

  // Rule 2 — Hold only opens on new evidence.
  if (from === "hold" && direction === "up") {
    const check = checkEvidenceForHoldExit(item, trimmed);
    if (!check.ok) {
      return { ok: false, rule: 2, direction, error: check.error };
    }
  }

  // Rule 1 — Adopt requires a week in production.
  if (to === "adopt") {
    const elig = adoptEligibility(item, now);
    if (!elig.eligible) {
      return {
        ok: false,
        rule: 1,
        direction,
        error: `Not eligible for Adopt. ${elig.detail}`,
      };
    }
  }

  // Rule 3 — moving down is always valid, and is encouraged the moment the
  // evidence turns. No extra gate beyond the recorded evidence above.
  return { ok: true, direction };
}

/* ------------------------------------------------------------- apply a move */

export interface AppliedMove {
  radar: TechRadar;
  entry: RadarChangelogEntry;
}

/**
 * Pure move: returns a new radar object with the item relocated, its `since`
 * reset, and a changelog entry appended. Never mutates the input.
 *
 * Assumes validateRingMove() already passed.
 */
export function applyRingMove(
  radar: TechRadar,
  slug: string,
  to: RadarRing,
  evidence: string,
  actor: string,
  now: Date = new Date()
): AppliedMove {
  const found = findRadarItem(radar, slug);
  if (!found) throw new Error(`No radar item with slug: ${slug}`);

  const date = isoDate(now);
  const moved: RadarItem = { ...found.item, slug: itemSlug(found.item), since: date };

  // Leaving Hold: the old refusal reason no longer describes the placement.
  // Keep it out of the new ring but preserve it in the changelog below.
  if (found.ring === "hold" && to !== "hold") {
    delete moved.reason;
    delete moved.revisit;
    if (!moved.why) moved.why = evidence.trim();
  }
  // Entering Hold: the evidence becomes the recorded reason.
  if (to === "hold") {
    moved.reason = evidence.trim();
    delete moved.why;
  }

  const rings = {} as Record<RadarRing, RadarItem[]>;
  for (const ring of RADAR_RINGS) {
    rings[ring] = (radar.rings[ring] ?? []).filter((x) => itemSlug(x) !== slug);
  }
  rings[to] = [...rings[to], moved];

  const entry: RadarChangelogEntry = {
    date,
    item: found.item.item,
    from: found.ring,
    to,
    evidence: evidence.trim(),
    actor,
    note: `${found.item.item}: ${RING_LABEL[found.ring]} → ${RING_LABEL[to]}`,
  };

  return {
    radar: { ...radar, updated: date, rings, changelog: [...radar.changelog, entry] },
    entry,
  };
}

/** Add a brand-new item. Rule: new entries must not already exist in any ring. */
export function applyAddItem(
  radar: TechRadar,
  item: RadarItem,
  ring: RadarRing,
  actor: string,
  now: Date = new Date()
): AppliedMove {
  const slug = itemSlug(item);
  if (findRadarItem(radar, slug)) {
    throw new Error(
      `"${item.item}" is already on the radar — it is settled, not new. Move its ring instead.`
    );
  }
  const date = isoDate(now);
  const withSlug: RadarItem = { ...item, slug, since: date };
  const rings = {} as Record<RadarRing, RadarItem[]>;
  for (const r of RADAR_RINGS) rings[r] = [...(radar.rings[r] ?? [])];
  rings[ring] = [...rings[ring], withSlug];

  const entry: RadarChangelogEntry = {
    date,
    item: item.item,
    to: ring,
    actor,
    evidence: (item.why ?? item.reason ?? "").trim(),
    note: `Added ${item.item} to ${RING_LABEL[ring]}`,
  };
  return {
    radar: { ...radar, updated: date, rings, changelog: [...radar.changelog, entry] },
    entry,
  };
}

/* --------------------------------------------------------- integrity checks */

export interface RadarIntegrityFlag {
  slug: string;
  item: string;
  ring: RadarRing;
  problem: string;
  severity: "high" | "medium";
}

/**
 * Audit the radar against its own rules. The point is to catch the radar
 * flattering itself — an Adopt ring full of things that are not actually
 * running is exactly the failure the capability notes were written to stop.
 */
export function radarIntegrity(radar: TechRadar, now: Date = new Date()): RadarIntegrityFlag[] {
  const flags: RadarIntegrityFlag[] = [];
  const seen = new Map<string, RadarRing>();

  for (const { ring, item } of allRadarItems(radar)) {
    const slug = itemSlug(item);

    const prior = seen.get(slug);
    if (prior) {
      flags.push({
        slug,
        item: item.item,
        ring,
        severity: "high",
        problem: `Listed in both ${RING_LABEL[prior]} and ${RING_LABEL[ring]}. One item, one ring.`,
      });
    } else {
      seen.set(slug, ring);
    }

    if (ring === "adopt") {
      const elig = adoptEligibility(item, now);
      if (!elig.eligible) {
        flags.push({
          slug,
          item: item.item,
          ring,
          severity: "high",
          problem: `In Adopt but not adopted. ${elig.detail}`,
        });
      }
    }

    if (ring === "hold" && !item.reason) {
      flags.push({
        slug,
        item: item.item,
        ring,
        severity: "medium",
        problem: "Held with no recorded reason — the Hold ring's whole value is the reason.",
      });
    }
  }

  return flags;
}

/** How many Adopt items are genuinely running the full window. */
export function trulyAdopted(radar: TechRadar, now: Date = new Date()): RadarItem[] {
  return (radar.rings.adopt ?? []).filter((i) => adoptEligibility(i, now).eligible);
}

/* -------------------------------------------------- recommendation ordering */

const EFFORT_RANK: Record<RadarEffort, number> = {
  minutes: 0,
  hours: 1,
  days: 2,
  weeks: 3,
};

export interface Recommendation extends RadarLocation {
  blocked: boolean;
}

/**
 * What to integrate next. Cheapest unblocked work first, Trial before Assess,
 * and only items that carry a concrete next action — an item nobody has written
 * a next step for is not a recommendation, it is a bookmark.
 *
 * Hold is excluded by construction: recommending a Hold item is the exact loop
 * the Hold ring exists to prevent.
 */
export function recommendations(radar: TechRadar): Recommendation[] {
  const out: Recommendation[] = [];
  for (const ring of ["adopt", "trial", "assess"] as const) {
    for (const loc of allRadarItems(radar).filter((l) => l.ring === ring)) {
      if (!loc.item.next_action) continue;
      // An Adopt item with a next action is by definition not finished, so it
      // belongs in the queue too — that is the point of the integrity flags.
      out.push({ ...loc, blocked: Boolean(loc.item.blocked_by) });
    }
  }

  const ringRank: Record<string, number> = { adopt: 0, trial: 1, assess: 2 };
  return out.sort((a, b) => {
    if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
    const ae = EFFORT_RANK[a.item.effort ?? "weeks"];
    const be = EFFORT_RANK[b.item.effort ?? "weeks"];
    if (ae !== be) return ae - be;
    const ar = ringRank[a.ring] ?? 9;
    const br = ringRank[b.ring] ?? 9;
    if (ar !== br) return ar - br;
    return a.item.item.localeCompare(b.item.item);
  });
}

/* ------------------------------------------------------------ vault mirroring */

/**
 * The vault note is the human source of truth; this JSON is the machine copy.
 * A dashboard write updates the copy, so hand back the exact line to paste
 * into `Tech Radar.md` rather than pretending the two are in sync.
 */
export function vaultMirrorLine(entry: RadarChangelogEntry): string {
  const from = entry.from ? RING_LABEL[entry.from] : "new";
  const to = entry.to ? RING_LABEL[entry.to] : "?";
  return `- ${entry.date} — **${entry.item}** ${from} → ${to}. Evidence: ${entry.evidence ?? "—"}`;
}
