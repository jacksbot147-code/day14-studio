/**
 * lib/budget-gate.mjs — middle gear between the binary realty killswitch
 * and unlimited daemon traffic.
 *
 * The killswitch (`public/data/ops/.realty-killswitch`) is a fast-path,
 * fully-paused flag. This module adds a per-domain budget on top of that:
 * read the seed shape from `public/data/ops/.budget.json`, track per-hour
 * and per-day call counters in `public/data/ops/.budget-counters.json`,
 * return `{ allowed, reason }` to the caller.
 *
 *     import { checkBudget, recordBudgetUse } from "../lib/budget-gate.mjs";
 *
 *     const gate = await checkBudget("realty");
 *     if (!gate.allowed) {
 *       console.log(`Realty budget gate: ${gate.reason} — exiting`);
 *       process.exit(0);
 *     }
 *     // …do the work…
 *     await recordBudgetUse("realty");
 *
 * Design rules:
 *   - Pure Node. No network. No model calls. No deletes.
 *   - Atomic temp-then-rename writes on the counters file so concurrent
 *     daemons don't trample each other.
 *   - Counter buckets reset by clock: per-hour resets on the hour
 *     (YYYY-MM-DDTHH key), per-day resets at local midnight (YYYY-MM-DD
 *     key in America/New_York — matches the rest of the studio's
 *     scheduled-task TZ).
 *   - Missing budget file → `{ allowed: true, reason: "no-budget-config" }`
 *     (fail-open — the killswitch is still the hard stop).
 *   - Domain not listed in budget → `{ allowed: true, reason:
 *     "domain-not-configured" }`. Same fail-open rationale.
 *   - Explicit `paused: true` on a domain → `{ allowed: false, reason:
 *     "paused: <paused_reason>" }`.
 *   - `max_calls_per_hour: 0` or `max_calls_per_day: 0` → treat zero as
 *     "no calls allowed" (matches the realty seed shape — zero ceiling
 *     is the soft pause).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

const HOME = homedir();
const OPS_DIR = path.join(HOME, "Documents", "studio", "public", "data", "ops");
const BUDGET_PATH = path.join(OPS_DIR, ".budget.json");
const COUNTERS_PATH = path.join(OPS_DIR, ".budget-counters.json");

/** YYYY-MM-DD in America/New_York (matches scheduled-task TZ). */
function todayISO(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

/** YYYY-MM-DDTHH in America/New_York. */
function hourISO(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
  // hour may come back as "24" at midnight on some platforms; normalise.
  const h = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${h}`;
}

/** Read JSON safely; return null on ENOENT, throw on other errors. */
async function readJSON(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err && err.code === "ENOENT") return null;
    throw err;
  }
}

/**
 * Atomic write: temp-then-rename. Rename is atomic on the same
 * filesystem, so a concurrent reader either sees the old file or the
 * new file — never a torn write.
 */
async function atomicWriteJSON(filePath, obj) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.tmp.${process.pid}.${Math.random()
      .toString(36)
      .slice(2, 10)}`,
  );
  await fs.writeFile(tmp, JSON.stringify(obj, null, 2) + "\n", "utf8");
  await fs.rename(tmp, filePath);
}

/**
 * Load the per-domain counters file. Shape:
 *
 *   {
 *     "<domain>": {
 *       "hour_bucket": "YYYY-MM-DDTHH",  // current hour key
 *       "hour_count": <int>,
 *       "day_bucket": "YYYY-MM-DD",       // current day key
 *       "day_count": <int>
 *     }
 *   }
 *
 * Missing or unreadable → empty object (fail-open, will be initialised
 * on first write).
 */
async function loadCounters() {
  const c = await readJSON(COUNTERS_PATH);
  return c && typeof c === "object" ? c : {};
}

/**
 * Snap a domain's counter to the current bucket. If the bucket key has
 * rolled over (new hour or new day), reset the relevant counter to 0.
 * Returns a fresh object — does not mutate the input.
 */
function refreshBucket(domainCounter, now = new Date()) {
  const hour = hourISO(now);
  const day = todayISO(now);
  const c = domainCounter ?? {};
  const hour_bucket = c.hour_bucket === hour ? hour : hour;
  const day_bucket = c.day_bucket === day ? day : day;
  return {
    hour_bucket,
    hour_count: c.hour_bucket === hour ? Number(c.hour_count) || 0 : 0,
    day_bucket,
    day_count: c.day_bucket === day ? Number(c.day_count) || 0 : 0,
  };
}

/**
 * checkBudget(domain, opts?) — non-mutating budget check.
 *
 * Returns:
 *   { allowed: true,  reason: "ok" | "no-budget-config" | "domain-not-configured" }
 *   { allowed: false, reason: "paused: <paused_reason>" |
 *                              "hour-cap-reached (N/M)" |
 *                              "day-cap-reached (N/M)" }
 *
 * Caller MUST exit-clean on `!allowed`. Caller MUST call
 * `recordBudgetUse(domain)` after a successful call to advance the
 * counters.
 *
 * Never throws on a missing budget file or unreadable counters file —
 * the killswitch is the hard stop, this is the soft governor.
 */
export async function checkBudget(domain, { now = new Date() } = {}) {
  if (!domain || typeof domain !== "string") {
    throw new Error("checkBudget: domain (string) is required");
  }

  const budget = await readJSON(BUDGET_PATH);
  if (!budget) return { allowed: true, reason: "no-budget-config" };

  const cfg = budget[domain];
  if (!cfg) return { allowed: true, reason: "domain-not-configured" };

  if (cfg.paused === true) {
    const why = cfg.paused_reason ? `paused: ${cfg.paused_reason}` : "paused";
    return { allowed: false, reason: why };
  }

  const counters = await loadCounters();
  const snap = refreshBucket(counters[domain], now);

  const hourCap = Number(cfg.max_calls_per_hour);
  const dayCap = Number(cfg.max_calls_per_day);

  if (Number.isFinite(hourCap) && snap.hour_count >= hourCap) {
    return {
      allowed: false,
      reason: `hour-cap-reached (${snap.hour_count}/${hourCap})`,
    };
  }
  if (Number.isFinite(dayCap) && snap.day_count >= dayCap) {
    return {
      allowed: false,
      reason: `day-cap-reached (${snap.day_count}/${dayCap})`,
    };
  }

  return { allowed: true, reason: "ok" };
}

/**
 * recordBudgetUse(domain) — increments the per-domain per-hour + per-day
 * counters by 1. Atomic temp-then-rename write. Snaps the bucket keys
 * to the current hour/day before incrementing, so a counter that crossed
 * a clock boundary while idle resets cleanly.
 *
 * Returns the post-increment counter snapshot for the domain.
 */
export async function recordBudgetUse(domain, { now = new Date() } = {}) {
  if (!domain || typeof domain !== "string") {
    throw new Error("recordBudgetUse: domain (string) is required");
  }
  const counters = await loadCounters();
  const snap = refreshBucket(counters[domain], now);
  const next = {
    hour_bucket: snap.hour_bucket,
    hour_count: snap.hour_count + 1,
    day_bucket: snap.day_bucket,
    day_count: snap.day_count + 1,
  };
  counters[domain] = next;
  await atomicWriteJSON(COUNTERS_PATH, counters);
  return next;
}

// Surfaced for tests / introspection. Not part of the stable API.
export const _internals = {
  BUDGET_PATH,
  COUNTERS_PATH,
  todayISO,
  hourISO,
  refreshBucket,
  loadCounters,
  atomicWriteJSON,
};
