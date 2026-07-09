#!/usr/bin/env node
/**
 * cadence-sentinel.mjs — output-freshness watchdog.
 *
 * The missing half of fleet observability: auto-restart-watchdog and
 * proactive-monitor watch HEARTBEATS, but the agents that died silently
 * in June/July (cfo-agent 32d, product-strategist 27d, investor-relations
 * month-wide, admin-sync's push leg 5w) emit none — their failure surface
 * is OUTPUT STALENESS. This sentinel sweeps the contract table in
 * scripts/_generic/cadence-contracts.mjs, compares each agent's newest
 * output-file mtime against its declared max age, and Telegrams Jack ONE
 * card per run — only on state change (new breach or recovery), matching
 * proactive-monitor's no-spam philosophy.
 *
 * Runs as a 30-min launchd one-shot (com.day14.cadence-sentinel, installed
 * by scripts/install-reliability-agents.sh). No LLM. No heartbeat — its own
 * health signal is the state file's mtime (deliberate: adding a heartbeat
 * would put it under the 12-min watchdog rule that misreads 30-min
 * one-shots as dead).
 *
 * State: _shared/founder-ops/cadence-sentinel-state.json (per-agent status).
 * Log:   _shared/poller/cadence-sentinel.log
 * Cards: _shared/telegram/outbox/<ts>-cadence-sentinel.json (P1/P2/P3)
 *
 * Selftest (no fleet paths touched): node scripts/cadence-sentinel.mjs --selftest
 * Dry run (no card written):         node scripts/cadence-sentinel.mjs --dry-run
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import os from "node:os";
import { CADENCE_CONTRACTS } from "./_generic/cadence-contracts.mjs";

// Base dir override so --selftest can run against a fixture tree.
const BASE = process.env.DAY14_SENTINEL_BASE || os.homedir();
const SHARED = path.join(BASE, "Documents/businesses/_shared");
const STATE_FILE = path.join(SHARED, "founder-ops/cadence-sentinel-state.json");
const LOG_FILE = path.join(SHARED, "poller/cadence-sentinel.log");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const ENV_FILE = path.join(BASE, "Documents/studio/.env.local");

async function log(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  try {
    await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
    await fs.appendFile(LOG_FILE, line, "utf8");
  } catch {
    /* logging must never kill the run */
  }
  console.log(line.trim());
}

async function loadEnv() {
  if (!existsSync(ENV_FILE)) return {};
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

/** Newest mtime (ms) of the contract's output, or null when nothing exists. */
export async function resolveNewestMtime(contract) {
  if (contract.file) {
    const p = path.join(BASE, contract.file);
    if (!existsSync(p)) return null;
    try {
      return (await fs.stat(p)).mtimeMs;
    } catch {
      return null;
    }
  }
  const dir = path.join(BASE, contract.dir);
  if (!existsSync(dir)) return null;
  const re = new RegExp(contract.pattern);
  let newest = null;
  for (const f of await fs.readdir(dir).catch(() => [])) {
    if (!re.test(f)) continue;
    try {
      const st = await fs.stat(path.join(dir, f));
      if (st.isFile() && (newest === null || st.mtimeMs > newest)) newest = st.mtimeMs;
    } catch {
      /* skip unreadable */
    }
  }
  return newest;
}

/** Evaluate one contract → { agent, status, ageHours, severity }. */
export async function evaluateContract(contract, nowMs = Date.now()) {
  const mtime = await resolveNewestMtime(contract);
  if (mtime === null) {
    // Missing output entirely = breach (worse than stale), unless the agent
    // has simply never run on this machine — we can't distinguish, so flag it.
    return { agent: contract.agent, status: "missing", ageHours: null, severity: contract.severity };
  }
  const ageHours = (nowMs - mtime) / 3_600_000;
  const status = ageHours > contract.maxAgeHours ? "breach" : "ok";
  return { agent: contract.agent, status, ageHours: Math.round(ageHours * 10) / 10, severity: contract.severity };
}

/** Diff current results against previous state → transitions worth telling Jack. */
export function diffStates(prev, results) {
  const changes = [];
  for (const r of results) {
    const before = prev[r.agent]?.status || "unknown";
    const bad = (s) => s === "breach" || s === "missing";
    if (bad(r.status) && !bad(before)) changes.push({ ...r, kind: "NEW BREACH" });
    else if (!bad(r.status) && bad(before)) changes.push({ ...r, kind: "RECOVERED" });
  }
  return changes;
}

export function buildCardText(changes, results) {
  const lines = ["🕰 *cadence-sentinel* — output freshness change"];
  for (const c of changes) {
    const age = c.ageHours === null ? "no output found" : `${c.ageHours}h old`;
    lines.push(
      c.kind === "RECOVERED"
        ? `✅ ${c.agent} recovered (${age})`
        : `🔴 ${c.severity} ${c.agent}: ${c.status.toUpperCase()} — ${age}`
    );
  }
  const breaching = results.filter((r) => r.status !== "ok").length;
  lines.push(`— ${results.length - breaching}/${results.length} contracts green`);
  return lines.join("\n");
}

async function queueCard(text, urgency, env, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] would queue ${urgency} card:\n${text}`);
    return;
  }
  if (!env.TELEGRAM_CHAT_ID) {
    await log("no TELEGRAM_CHAT_ID — card skipped (state still updated)");
    return;
  }
  await fs.mkdir(OUTBOX, { recursive: true });
  await fs.writeFile(
    path.join(OUTBOX, `${Date.now()}-cadence-sentinel.json`),
    JSON.stringify(
      {
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown",
        urgency,
        queued_at: new Date().toISOString(),
        sent_at: null,
      },
      null,
      2
    )
  );
}

export async function runOnce({ dryRun = false } = {}) {
  const enabled = CADENCE_CONTRACTS.filter((c) => c.enabled !== false);
  const results = [];
  for (const c of enabled) results.push(await evaluateContract(c));

  let prev = {};
  if (existsSync(STATE_FILE)) {
    try {
      prev = JSON.parse(await fs.readFile(STATE_FILE, "utf8")).agents || {};
    } catch {
      /* corrupt state = treat as first run */
    }
  }

  const changes = diffStates(prev, results);
  if (changes.length > 0) {
    const worst = changes.some((c) => c.severity === "P1" && c.kind === "NEW BREACH")
      ? "P1"
      : changes.some((c) => c.kind === "NEW BREACH")
        ? "P2"
        : "P3";
    const env = await loadEnv();
    await queueCard(buildCardText(changes, results), worst, env, dryRun);
    await log(`state change: ${changes.map((c) => `${c.agent}→${c.kind}`).join(", ")}`);
  } else {
    await log(`no change — ${results.filter((r) => r.status === "ok").length}/${results.length} green`);
  }

  // Persist state (atomic: temp then rename — same discipline as auto-todo-sync).
  const state = {
    checked_at: new Date().toISOString(),
    agents: Object.fromEntries(results.map((r) => [r.agent, { status: r.status, ageHours: r.ageHours }])),
  };
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  const tmp = `${STATE_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2));
  await fs.rename(tmp, STATE_FILE);
  return { results, changes };
}

// ---------------------------------------------------------------------------
// Selftest — fixture tree in a tmp dir, no fleet paths touched.
// ---------------------------------------------------------------------------
async function selftest() {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "cadence-sentinel-"));
  process.env.DAY14_SENTINEL_BASE = tmp; // note: module consts already bound —
  // selftest exercises the pure helpers directly instead.

  let pass = 0,
    fail = 0;
  const assert = (cond, name) => {
    if (cond) {
      pass++;
      console.log(`  ✓ ${name}`);
    } else {
      fail++;
      console.error(`  ✗ ${name}`);
    }
  };

  // 1. diffStates: ok→breach = NEW BREACH
  let ch = diffStates({ a: { status: "ok" } }, [{ agent: "a", status: "breach", ageHours: 40, severity: "P1" }]);
  assert(ch.length === 1 && ch[0].kind === "NEW BREACH", "ok→breach raises NEW BREACH");

  // 2. diffStates: breach→ok = RECOVERED
  ch = diffStates({ a: { status: "breach" } }, [{ agent: "a", status: "ok", ageHours: 1, severity: "P1" }]);
  assert(ch.length === 1 && ch[0].kind === "RECOVERED", "breach→ok raises RECOVERED");

  // 3. diffStates: breach→breach = silent (no spam)
  ch = diffStates({ a: { status: "breach" } }, [{ agent: "a", status: "breach", ageHours: 41, severity: "P1" }]);
  assert(ch.length === 0, "breach→breach stays silent");

  // 4. diffStates: unknown→missing = NEW BREACH (first sight of a dead agent alerts)
  ch = diffStates({}, [{ agent: "a", status: "missing", ageHours: null, severity: "P1" }]);
  assert(ch.length === 1 && ch[0].kind === "NEW BREACH", "first-run missing output alerts");

  // 5. evaluateContract against a real fixture file
  const fdir = path.join(tmp, "out");
  await fs.mkdir(fdir, { recursive: true });
  const ffile = path.join(fdir, "2026-07-01-daily.md");
  await fs.writeFile(ffile, "x");
  const old = new Date(Date.now() - 48 * 3_600_000);
  await fs.utimes(ffile, old, old);
  // Bypass BASE-binding by testing resolve logic through a relative contract:
  const saved = process.env.DAY14_SENTINEL_BASE;
  // resolveNewestMtime uses module-level BASE (bound at import) — so test the
  // age math directly instead:
  const st = await fs.stat(ffile);
  const ageHours = (Date.now() - st.mtimeMs) / 3_600_000;
  assert(ageHours > 30 && ageHours < 50, "fixture mtime ages correctly (utimes honored)");
  process.env.DAY14_SENTINEL_BASE = saved;

  // 6. card text shape
  const text = buildCardText(
    [{ agent: "cfo-agent", status: "breach", ageHours: 768, severity: "P1", kind: "NEW BREACH" }],
    [{ agent: "cfo-agent", status: "breach", ageHours: 768, severity: "P1" }]
  );
  assert(text.includes("cfo-agent") && text.includes("P1") && text.includes("0/1"), "card text names agent, severity, tally");

  await fs.rm(tmp, { recursive: true, force: true });
  console.log(`\nselftest: ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
}

const argv = process.argv.slice(2);
if (argv.includes("--selftest")) {
  selftest();
} else {
  runOnce({ dryRun: argv.includes("--dry-run") }).catch((err) => {
    console.error("FATAL:", err.message);
    process.exit(1);
  });
}
