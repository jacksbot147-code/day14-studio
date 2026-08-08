/**
 * lib/llm-ledger.mjs — one honest record of what the LLM layer actually did.
 *
 * Why (2026-07-27): provider-health.json showed 409 consecutive dual-provider
 * failures while every heartbeat log stayed fresh. Heartbeats prove a process
 * is looping; they prove nothing about whether it accomplished anything. This
 * ledger records the one fact that matters — when did an LLM call last SUCCEED
 * — plus token/cost accounting so credit depletion is visible before it bites.
 *
 * Written by _generic/llm-call.mjs on every call. Read by fleet-deadman.mjs.
 *
 * Design rules (mirrors lib/budget-gate.mjs):
 *   - Pure Node. No network. No deletes. Never throws into the caller.
 *   - Atomic temp-then-rename so concurrent daemons don't trample each other.
 *   - Bounded size: per-day buckets, pruned to KEEP_DAYS.
 *   - Failure to write the ledger must never fail an agent run.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

const HOME = homedir();
const OPS_DIR = path.join(HOME, "Documents", "studio", "public", "data", "ops");
const LEDGER_PATH = path.join(OPS_DIR, ".llm-ledger.json");
const KEEP_DAYS = 14;

/** Per-million-token USD rates. Update when provider pricing moves. */
const RATES = {
  "claude-haiku-4-5": { in: 1.0, out: 5.0, cache_read: 0.1, cache_write: 1.25 },
  "claude-sonnet": { in: 3.0, out: 15.0, cache_read: 0.3, cache_write: 3.75 },
  "gemini-2.5-flash": { in: 0.3, out: 2.5, cache_read: 0.075, cache_write: 0.3 },
  local: { in: 0, out: 0, cache_read: 0, cache_write: 0 },
  _default: { in: 1.0, out: 5.0, cache_read: 0.1, cache_write: 1.25 },
};

function rateFor(model = "") {
  const m = String(model).toLowerCase();
  for (const key of Object.keys(RATES)) {
    if (key !== "_default" && m.includes(key)) return RATES[key];
  }
  return RATES._default;
}

export function estimateCostUsd({ model, input = 0, output = 0, cacheRead = 0, cacheWrite = 0 }) {
  const r = rateFor(model);
  return (
    (input / 1e6) * r.in +
    (output / 1e6) * r.out +
    (cacheRead / 1e6) * r.cache_read +
    (cacheWrite / 1e6) * r.cache_write
  );
}

function dayKey(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function emptyLedger() {
  return {
    schema: 1,
    updated_at: null,
    last_success_at: null,
    last_success_provider: null,
    last_failure_at: null,
    last_failure_error: null,
    consecutive_failures: 0,
    days: {},
  };
}

async function readLedger() {
  try {
    const raw = await fs.readFile(LEDGER_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyLedger();
    return { ...emptyLedger(), ...parsed, days: parsed.days || {} };
  } catch {
    return emptyLedger();
  }
}

async function writeLedgerAtomic(ledger) {
  await fs.mkdir(OPS_DIR, { recursive: true });
  const tmp = `${LEDGER_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(ledger, null, 2));
  await fs.rename(tmp, LEDGER_PATH);
}

function emptyDay() {
  return {
    calls: 0,
    ok: 0,
    failed: 0,
    tokens_in: 0,
    tokens_out: 0,
    tokens_cache_read: 0,
    tokens_cache_write: 0,
    est_cost_usd: 0,
    by_provider: {},
  };
}

/**
 * Record one LLM call outcome. Never throws.
 *
 * @param {object} o
 * @param {boolean} o.ok
 * @param {string} o.provider   "anthropic" | "gemini" | "local"
 * @param {string} [o.model]
 * @param {string} [o.agent]    caller label, defaults to DAY14_AGENT or "unknown"
 * @param {string} [o.error]
 * @param {object} [o.usage]    { input, output, cacheRead, cacheWrite }
 */
export async function recordLlmCall({ ok, provider, model, agent, error, usage = {} }) {
  try {
    const now = new Date();
    const iso = now.toISOString();
    const ledger = await readLedger();
    const key = dayKey(now);
    const day = ledger.days[key] || emptyDay();

    const input = Number(usage.input) || 0;
    const output = Number(usage.output) || 0;
    const cacheRead = Number(usage.cacheRead) || 0;
    const cacheWrite = Number(usage.cacheWrite) || 0;
    const cost = estimateCostUsd({ model, input, output, cacheRead, cacheWrite });

    day.calls += 1;
    day.tokens_in += input;
    day.tokens_out += output;
    day.tokens_cache_read += cacheRead;
    day.tokens_cache_write += cacheWrite;
    day.est_cost_usd = Number((day.est_cost_usd + cost).toFixed(6));

    const p = provider || "unknown";
    const pv = day.by_provider[p] || { calls: 0, ok: 0, failed: 0, est_cost_usd: 0 };
    pv.calls += 1;
    pv.est_cost_usd = Number((pv.est_cost_usd + cost).toFixed(6));

    if (ok) {
      day.ok += 1;
      pv.ok += 1;
      ledger.last_success_at = iso;
      ledger.last_success_provider = p;
      ledger.consecutive_failures = 0;
    } else {
      day.failed += 1;
      pv.failed += 1;
      ledger.last_failure_at = iso;
      ledger.last_failure_error = String(error || "").slice(0, 300);
      ledger.consecutive_failures = (ledger.consecutive_failures || 0) + 1;
    }

    day.by_provider[p] = pv;
    ledger.days[key] = day;
    ledger.updated_at = iso;
    if (agent || process.env.DAY14_AGENT) {
      ledger.last_agent = agent || process.env.DAY14_AGENT;
    }

    const keys = Object.keys(ledger.days).sort();
    while (keys.length > KEEP_DAYS) delete ledger.days[keys.shift()];

    await writeLedgerAtomic(ledger);
  } catch {
    /* ledger writes must never break an agent run */
  }
}

/** Read-only accessor for fleet-deadman.mjs and dashboards. */
export async function getLedger() {
  return await readLedger();
}

export const LEDGER_FILE = LEDGER_PATH;
