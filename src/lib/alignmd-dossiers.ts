/**
 * alignmd-dossiers.ts — server-side loader + priority model for the AlignMD
 * operator dossier queue surfaced at /admin/alignmd.
 *
 * The T4/T5 agent fleet now emits structured output:
 *   - public/data/alignmd/dossier-queue.json  — the operator review queue
 *     (sample/stub today; real CREDENTIAL-PARSED-* dossiers slot in unchanged)
 *   - public/data/alignmd/verifier-flags.json — evidence-verifier mismatches,
 *     keyed by dossier_id
 *
 * This module reads both, joins flags onto their dossier, and computes a
 * single deterministic priority ordering so the operator works the riskiest
 * dossiers first. The pure functions (urgency / chip / sort) take an explicit
 * `now` so they are unit-testable and never depend on wall-clock at import.
 *
 * Read-only. Safe to call from a server component; never bundled to client.
 */

import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "public/data/alignmd");
const QUEUE_FILE = path.join(DATA_DIR, "dossier-queue.json");
const FLAGS_FILE = path.join(DATA_DIR, "verifier-flags.json");

const DAY_MS = 86_400_000;
/** A license whose last verification is older than this needs a re-check. */
export const STALE_CHECK_DAYS = 90;
/** Inside this window an upcoming expiry counts as "expiring soon". */
export const EXPIRING_SOON_DAYS = 30;

export type FlagSeverity = "high" | "medium" | "low" | "info";

export interface VerifierFlag {
  dossier_id: string;
  field: string;
  parsed_value?: string | null;
  source_value?: string | null;
  severity: FlagSeverity;
  mismatch_detail?: string;
  recommended_fix?: string;
  source_filename?: string;
  is_stub?: boolean;
  checked_at?: string;
}

export interface DossierRecord {
  dossier_id: string;
  provider_name: string;
  specialty?: string;
  license_number?: string;
  issuing_state?: string;
  board_name?: string;
  expiration_date?: string | null;
  last_check_date?: string | null;
  contract_value_usd?: number | null;
  placement_date?: string | null;
  stage?: string;
  is_stub?: boolean;
  source_filename?: string;
}

/** Which priority dimension wins a row's top-of-list chip. */
export type ChipKind = "license" | "flag" | "value";

export interface PriorityChip {
  kind: ChipKind;
  /** Short human label, e.g. "expiring in 14 days". */
  label: string;
  /** Severity tone for styling: red = act now, amber = soon, blue = info. */
  tone: "red" | "amber" | "blue";
}

export interface LicenseUrgency {
  /** Lower sorts first. 0 expired, 1 soon, 2 stale/never-checked, 3 ok. */
  rank: 0 | 1 | 2 | 3;
  /** Whole days until expiry (negative = already expired); null if unknown. */
  daysToExpiry: number | null;
  expired: boolean;
  expiringSoon: boolean;
  staleCheck: boolean;
  neverChecked: boolean;
}

export interface EnrichedDossier extends DossierRecord {
  flags: VerifierFlag[];
  /** Highest-severity flag rank present (lower = worse), or null when clean. */
  topFlagRank: number | null;
  urgency: LicenseUrgency;
  chip: PriorityChip;
}

export interface DossierQueue {
  /** True when the queue is sample/stub data (no live parse has run). */
  isSample: boolean;
  asOf: string | null;
  dossiers: EnrichedDossier[];
  flagsTotal: number;
}

// ── pure helpers (testable, no fs) ──────────────────────────────────────────

const SEVERITY_RANK: Record<FlagSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
  info: 3,
};

/** Parse an ISO YYYY-MM-DD into epoch ms at UTC midnight, or null. */
function parseDay(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(ms) ? ms : null;
}

function wholeDaysBetween(fromMs: number, toMs: number): number {
  return Math.round((toMs - fromMs) / DAY_MS);
}

/** Compute license-status urgency for a dossier relative to `now`. */
export function licenseUrgency(d: DossierRecord, now: number): LicenseUrgency {
  const expMs = parseDay(d.expiration_date);
  const daysToExpiry = expMs === null ? null : wholeDaysBetween(now, expMs);
  const expired = daysToExpiry !== null && daysToExpiry < 0;
  const expiringSoon =
    daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= EXPIRING_SOON_DAYS;

  const lastMs = parseDay(d.last_check_date);
  const neverChecked = d.last_check_date === null || d.last_check_date === undefined;
  const staleCheck =
    !neverChecked && lastMs !== null && wholeDaysBetween(lastMs, now) > STALE_CHECK_DAYS;

  let rank: LicenseUrgency["rank"] = 3;
  if (expired) rank = 0;
  else if (expiringSoon) rank = 1;
  else if (neverChecked || staleCheck) rank = 2;

  return { rank, daysToExpiry, expired, expiringSoon, staleCheck, neverChecked };
}

function topFlagRankOf(flags: VerifierFlag[]): number | null {
  if (flags.length === 0) return null;
  return flags.reduce(
    (best, f) => Math.min(best, SEVERITY_RANK[f.severity] ?? 3),
    3,
  );
}

function currency(n: number): string {
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

/**
 * Pick the single chip shown on a dossier row: the top sort reason, in the
 * task's priority order — license urgency first, then verifier flags, then
 * contract value / placement.
 */
export function topReasonChip(
  d: DossierRecord,
  flags: VerifierFlag[],
  urgency: LicenseUrgency,
  now: number,
): PriorityChip {
  // (a) license-status urgency
  if (urgency.expired) {
    const days = Math.abs(urgency.daysToExpiry ?? 0);
    return { kind: "license", tone: "red", label: `license expired ${days}d ago` };
  }
  if (urgency.expiringSoon) {
    return {
      kind: "license",
      tone: "red",
      label: `expiring in ${urgency.daysToExpiry} days`,
    };
  }

  // (b) verifier-flag presence
  if (flags.length > 0) {
    const worst = [...flags].sort(
      (a, b) => (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3),
    )[0]!;
    const field = worst.field.replace(/_/g, "-");
    return {
      kind: "flag",
      tone: worst.severity === "high" ? "red" : "amber",
      label: `verifier flag: ${field} mismatch`,
    };
  }

  // (a continued) staleness is lower urgency than a live flag but still license-driven
  if (urgency.neverChecked) {
    return { kind: "license", tone: "amber", label: "license never verified" };
  }
  if (urgency.staleCheck) {
    return { kind: "license", tone: "amber", label: "license check stale" };
  }

  // (c) contract value / placement date
  const value = d.contract_value_usd ?? 0;
  const placeMs = parseDay(d.placement_date);
  if (placeMs !== null) {
    const days = wholeDaysBetween(now, placeMs);
    if (value >= 250_000) {
      return {
        kind: "value",
        tone: "blue",
        label: `high-value placement · ${currency(value)}`,
      };
    }
    if (days >= 0) {
      return { kind: "value", tone: "blue", label: `placement in ${days} days` };
    }
  }
  if (value > 0) {
    return { kind: "value", tone: "blue", label: `placement · ${currency(value)}` };
  }
  return { kind: "value", tone: "blue", label: "queued for review" };
}

/**
 * Deterministic priority comparator implementing the task's three-key sort:
 *   1. license-status urgency (expiring/expired first)
 *   2. verifier-flag presence + severity (flagged first)
 *   3. contract value desc, then nearest placement date
 * Ties break on dossier_id so ordering is stable.
 */
export function compareDossiers(
  a: EnrichedDossier,
  b: EnrichedDossier,
  now: number,
): number {
  if (a.urgency.rank !== b.urgency.rank) return a.urgency.rank - b.urgency.rank;

  // Within equal urgency rank, sort by soonest expiry when both have a date.
  const ad = a.urgency.daysToExpiry;
  const bd = b.urgency.daysToExpiry;
  if (a.urgency.rank <= 1 && ad !== null && bd !== null && ad !== bd) {
    return ad - bd;
  }

  const af = a.topFlagRank;
  const bf = b.topFlagRank;
  if (af !== bf) {
    if (af === null) return 1;
    if (bf === null) return -1;
    return af - bf;
  }

  const av = a.contract_value_usd ?? 0;
  const bv = b.contract_value_usd ?? 0;
  if (av !== bv) return bv - av;

  const ap = parseDay(a.placement_date) ?? Number.POSITIVE_INFINITY;
  const bp = parseDay(b.placement_date) ?? Number.POSITIVE_INFINITY;
  if (ap !== bp) return ap - bp;

  return a.dossier_id.localeCompare(b.dossier_id);
}

/** Enrich + sort a raw dossier list against a verifier-flag map. */
export function buildQueue(
  records: DossierRecord[],
  flagsByDossier: Map<string, VerifierFlag[]>,
  now: number,
): EnrichedDossier[] {
  const enriched = records.map<EnrichedDossier>((d) => {
    const flags = flagsByDossier.get(d.dossier_id) ?? [];
    const urgency = licenseUrgency(d, now);
    return {
      ...d,
      flags,
      topFlagRank: topFlagRankOf(flags),
      urgency,
      chip: topReasonChip(d, flags, urgency, now),
    };
  });
  enriched.sort((a, b) => compareDossiers(a, b, now));
  return enriched;
}

// ── fs loader ───────────────────────────────────────────────────────────────

async function readJson(file: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Load the operator dossier queue: read the queue + flags files, join, enrich,
 * and sort by priority. Never throws — returns an empty queue if the data
 * files are absent or malformed.
 */
export async function loadDossierQueue(now: number = Date.now()): Promise<DossierQueue> {
  const [queueRaw, flagsRaw] = await Promise.all([
    readJson(QUEUE_FILE),
    readJson(FLAGS_FILE),
  ]);

  const queueObj = (queueRaw ?? {}) as {
    is_sample?: boolean;
    _meta?: { as_of?: string };
    dossiers?: unknown;
  };
  const records: DossierRecord[] = Array.isArray(queueObj.dossiers)
    ? (queueObj.dossiers as DossierRecord[]).filter(
        (d) => d && typeof d.dossier_id === "string",
      )
    : [];

  const flagsObj = (flagsRaw ?? {}) as { flags?: unknown };
  const flagList: VerifierFlag[] = Array.isArray(flagsObj.flags)
    ? (flagsObj.flags as VerifierFlag[]).filter(
        (f) => f && typeof f.dossier_id === "string",
      )
    : [];

  const flagsByDossier = new Map<string, VerifierFlag[]>();
  for (const f of flagList) {
    const bucket = flagsByDossier.get(f.dossier_id);
    if (bucket) bucket.push(f);
    else flagsByDossier.set(f.dossier_id, [f]);
  }

  return {
    isSample: queueObj.is_sample === true,
    asOf: queueObj._meta?.as_of ?? null,
    dossiers: buildQueue(records, flagsByDossier, now),
    flagsTotal: flagList.length,
  };
}
