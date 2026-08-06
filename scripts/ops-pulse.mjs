#!/usr/bin/env node
/**
 * ops-pulse.mjs — publish the numbers that actually decide whether Day14 lives.
 *
 * WHY THIS EXISTS
 * Two scheduled scans watch the outside world. Nothing watches the pipeline.
 * Meanwhile: zero paying software customers, a checkout that has never opened
 * across 12 SKUs, and 14 outreach drafts unsent for over a month. A research
 * function that reports on Anthropic's changelog while those three facts hold
 * is pointed in the wrong direction.
 *
 * A headless cloud session cannot read this Mac. It CAN read a public raw URL.
 * So this script emits `public/data/ops/ops-pulse.json`, which admin-sync
 * publishes to the public repo, which the weekly scan fetches and ranks ABOVE
 * every research finding. That is the only closed loop this architecture allows
 * between local reality and a scheduled agent.
 *
 * Deliberate design choice: this script NEVER infers a send from a draft's
 * mtime. Editing a draft is not sending it, and conflating the two would
 * manufacture exactly the false green that let a 17-day LLM blackout run
 * behind fresh heartbeats. No outreach log means `last_outreach_sent_at: null`
 * and `days_since_outreach: null`, reported honestly as unknown.
 *
 * Usage:
 *   node scripts/ops-pulse.mjs             write the pulse file
 *   node scripts/ops-pulse.mjs --print     write and pretty-print
 *   node scripts/ops-pulse.mjs --dry-run   compute and print, write nothing
 *   node scripts/ops-pulse.mjs --selftest  no network, no files required
 *
 * To record a send (the one manual convention this depends on):
 *   node scripts/ops-pulse.mjs --log-send "acme-pools.com" "spark-touch-1"
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import os from "node:os";
import { pathToFileURL } from "node:url";

const HOME = process.env.DAY14_PULSE_BASE || os.homedir();
const STUDIO = path.join(HOME, "Documents/studio");
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const OPS = path.join(STUDIO, "public/data/ops");
const PULSE_PATH = path.join(OPS, "ops-pulse.json");
const OUTREACH_LOG = path.join(OPS, "outreach-log.jsonl");
const LEDGER = path.join(OPS, ".llm-ledger.json");
const GATE_STATE = path.join(OPS, ".loop-gate-state.json");
const DEADMAN = path.join(SHARED, "ops/fleet-deadman.json");
const PROVIDER_HEALTH = path.join(SHARED, "ops/provider-health.json");
const INSIGHTS = path.join(STUDIO, "public/data/insights/index.json");
const ENV_FILE = path.join(STUDIO, ".env.local");

async function readJson(p, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch {
    return fallback;
  }
}

async function loadEnv() {
  if (!existsSync(ENV_FILE)) return {};
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

function daysSince(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

/** Outreach: only an explicit logged send counts. Draft mtimes are ignored on purpose. */
async function outreachState() {
  try {
    const raw = await fs.readFile(OUTREACH_LOG, "utf8");
    const rows = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter((r) => r && r.sent_at);
    if (!rows.length) return { log_exists: true, total_sends: 0, last_outreach_sent_at: null, sends_7d: 0 };
    rows.sort((a, b) => Date.parse(b.sent_at) - Date.parse(a.sent_at));
    const cutoff = Date.now() - 7 * 86400000;
    return {
      log_exists: true,
      total_sends: rows.length,
      last_outreach_sent_at: rows[0].sent_at,
      sends_7d: rows.filter((r) => Date.parse(r.sent_at) >= cutoff).length,
    };
  } catch {
    return { log_exists: false, total_sends: 0, last_outreach_sent_at: null, sends_7d: 0 };
  }
}

/** Stripe: count Checkout Sessions created in the last 7 days. Null if no key or the call fails. */
export async function stripeState(env) {
  const key = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!key) return { key_present: false, checkouts_7d: null, completed_7d: null, paying_customers: null, note: "no STRIPE_SECRET_KEY — till status unknown" };
  const since = Math.floor((Date.now() - 7 * 86400000) / 1000);
  try {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions?limit=100&created[gte]=${since}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const t = await res.text();
      return { key_present: true, checkouts_7d: null, completed_7d: null, paying_customers: null, note: `stripe ${res.status}: ${t.slice(0, 160)}` };
    }
    const data = await res.json();
    const rows = data.data || [];

    // Paying customers = distinct customers on a live subscription. Counted
    // separately from checkout sessions, because a 7-day checkout window says
    // nothing about a retainer sold three months ago and still billing.
    let payingCustomers = null;
    let subsNote = null;
    try {
      const subs = await fetch("https://api.stripe.com/v1/subscriptions?status=all&limit=100", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (subs.ok) {
        const sd = await subs.json();
        const live = (sd.data || []).filter((x) => x.status === "active" || x.status === "trialing");
        payingCustomers = new Set(live.map((x) => x.customer).filter(Boolean)).size;
      } else {
        subsNote = `stripe subscriptions ${subs.status}`;
      }
    } catch (e) {
      subsNote = `stripe subscriptions error: ${String(e).slice(0, 120)}`;
    }

    return {
      key_present: true,
      checkouts_7d: rows.length,
      completed_7d: rows.filter((r) => r.status === "complete" || r.payment_status === "paid").length,
      paying_customers: payingCustomers,
      note:
        subsNote ??
        (rows.length === 0 ? "no checkout sessions in 7 days — the till is still closed" : null),
    };
  } catch (e) {
    return {
      key_present: true,
      checkouts_7d: null,
      completed_7d: null,
      paying_customers: null,
      note: `stripe error: ${String(e).slice(0, 160)}`,
    };
  }
}

async function loopGateState() {
  const st = await readJson(GATE_STATE, { loops: {} });
  const paused = [];
  let neverProductive = [];
  for (const [loop, s] of Object.entries(st.loops || {})) {
    if (s.auto_paused) paused.push({ loop, paused_at: s.auto_paused_at || null, days: daysSince(s.auto_paused_at) });
    else if (s.manual_pause) paused.push({ loop, paused_at: null, manual: s.manual_pause });
    if ((s.runs || 0) >= 5 && (s.productive_runs || 0) === 0) neverProductive.push(loop);
  }
  paused.sort((a, b) => (b.days || 0) - (a.days || 0));
  return { paused, oldest_pause_days: paused.length ? paused[0].days : null, never_productive: neverProductive };
}

async function llmState() {
  const led = await readJson(LEDGER, null);
  const ph = await readJson(PROVIDER_HEALTH, null);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const streaks = ph?.streaks || {};
  const worstStreak = Object.values(streaks).length ? Math.max(...Object.values(streaks).map(Number)) : null;
  const providersDown = ph?.providers ? Object.entries(ph.providers).filter(([, v]) => v?.status === "down").map(([k]) => k) : [];
  const allDown = ph?.providers ? providersDown.length === Object.keys(ph.providers).length : null;
  return {
    last_success_at: led?.last_success_at || null,
    days_since_llm_success: daysSince(led?.last_success_at),
    consecutive_failures: Number(led?.consecutive_failures || 0),
    est_spend_today_usd: Number(led?.days?.[today]?.est_cost_usd || 0),
    providers_down: providersDown,
    all_providers_down: allDown,
    worst_failure_streak: worstStreak,
  };
}

async function deadmanState() {
  const dm = await readJson(DEADMAN, null);
  const env = await loadEnv();
  const configured = !!(env.DAY14_HEALTHCHECK_URL || process.env.DAY14_HEALTHCHECK_URL);
  return {
    armed: !!(dm && dm.healthcheck_configured) || configured,
    last_check_at: dm?.checked_at || null,
    last_severity: dm?.severity || null,
    note: configured ? null : "DAY14_HEALTHCHECK_URL not set — the dead-man switch is not armed",
  };
}

async function insightsState() {
  const idx = await readJson(INSIGHTS, { posts: [] });
  const posts = (idx.posts || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  return {
    published_count: posts.length,
    last_published: posts[0]?.date || null,
    days_since_published: daysSince(posts[0]?.date ? `${posts[0].date}T12:00:00Z` : null),
  };
}

function buildEscalations(p) {
  const out = [];
  if (!p.outreach.log_exists) {
    out.push("CRITICAL: no outreach log exists. 14 drafts have sat unsent for over a month. Send one, then record it: node scripts/ops-pulse.mjs --log-send \"<domain>\" \"<sequence>\"");
  } else if (p.outreach.sends_7d === 0) {
    const d = p.outreach.days_since_outreach;
    out.push(`CRITICAL: zero outreach sent in 7 days${d === null ? "" : ` (last send ${d} days ago)`}. At zero customers this outranks every research finding.`);
  }
  if (p.stripe.checkouts_7d === 0) out.push("CRITICAL: zero Stripe checkout sessions in 7 days across 12 SKUs. Check the dashboard for an account restriction before debugging code.");
  if (p.stripe.checkouts_7d === null && p.stripe.key_present === false) out.push("Till status unknown — no Stripe key available to this script.");
  if (!p.fleet_deadman.armed) out.push("The dead-man switch is NOT armed. Until it is, a silent fleet outage recurs undetected.");
  if (p.llm.all_providers_down) out.push(`All LLM providers down (worst streak ${p.llm.worst_failure_streak}). The daemon fleet is looping without accomplishing anything.`);
  if (p.loop_gate.oldest_pause_days !== null && p.loop_gate.oldest_pause_days >= 14) out.push(`Loop-gate pauses accumulating unreviewed — oldest is ${p.loop_gate.oldest_pause_days} days old.`);
  if (p.loop_gate.never_productive.length) out.push(`Loops that have NEVER produced a state change: ${p.loop_gate.never_productive.join(", ")}. Retarget or retire them.`);
  return out;
}

export async function computePulse() {
  const env = await loadEnv();
  const [outreach, stripe, loop_gate, llm, fleet_deadman, insights] = await Promise.all([
    outreachState(),
    stripeState(env),
    loopGateState(),
    llmState(),
    deadmanState(),
    insightsState(),
  ]);
  outreach.days_since_outreach = daysSince(outreach.last_outreach_sent_at);
  const pulse = {
    schema: 1,
    _purpose: "Day14 business pulse. Published for headless scheduled agents that cannot read the Mac. The weekly scan ranks these numbers ABOVE every research finding.",
    generated_at: new Date().toISOString(),
    // MEASURED, never asserted. This was a hardcoded 0 until 2026-08-06, which
    // meant the one number the weekly scan is told to rank above every research
    // finding could not change in either direction — it would have reported 0
    // just as confidently on the day of the first sale. Null means "could not
    // read the till", which is a different and worse state than "the till is
    // empty"; pain-index has a separate, higher-severity rule for it.
    paying_software_customers: stripe.paying_customers,
    revenue_measurable: stripe.paying_customers !== null,
    outreach,
    stripe,
    llm,
    fleet_deadman,
    loop_gate,
    insights,
    // Ping URLs for the scheduled cloud scans. A headless task cannot be given
    // a secret at creation time without hard-coding it into the trigger, so it
    // reads them from here instead: set them once in .env.local and both scans
    // self-arm on their next run. Empty means the scan skips its heartbeat.
    ping_urls: {
      weekly: env.DAY14_PING_WEEKLY || null,
      secwatch: env.DAY14_PING_SECWATCH || null,
    },
  };
  pulse.escalations = buildEscalations(pulse);
  return pulse;
}

async function logSend(domain, sequence) {
  if (!domain) {
    console.error('usage: node scripts/ops-pulse.mjs --log-send "<domain>" "<sequence>"');
    process.exit(1);
  }
  await fs.mkdir(OPS, { recursive: true });
  const row = { sent_at: new Date().toISOString(), to_domain: domain, sequence: sequence || null };
  await fs.appendFile(OUTREACH_LOG, JSON.stringify(row) + "\n");
  console.log(`logged send -> ${domain}${sequence ? ` (${sequence})` : ""} at ${row.sent_at}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "--log-send") return await logSend(args[1], args[2]);

  if (args.includes("--selftest")) {
    const p = {
      outreach: { log_exists: false, sends_7d: 0, days_since_outreach: null },
      stripe: { key_present: false, checkouts_7d: 0 },
      llm: { all_providers_down: true, worst_failure_streak: 409 },
      fleet_deadman: { armed: false },
      loop_gate: { oldest_pause_days: 20, never_productive: ["market-research"] },
    };
    const esc = buildEscalations(p);
    const hasOutreach = esc.some((e) => e.includes("no outreach log"));
    const hasTill = esc.some((e) => e.includes("zero Stripe checkout"));
    const hasBlackout = esc.some((e) => e.includes("409"));
    const outreachFirst = esc[0].startsWith("CRITICAL: no outreach log");
    console.log(`selftest: escalates missing outreach log   -> ${hasOutreach ? "PASS" : "FAIL"}`);
    console.log(`selftest: escalates closed till            -> ${hasTill ? "PASS" : "FAIL"}`);
    console.log(`selftest: escalates 409 blackout           -> ${hasBlackout ? "PASS" : "FAIL"}`);
    console.log(`selftest: revenue escalation ranks first   -> ${outreachFirst ? "PASS" : "FAIL"}`);
    const pass = hasOutreach && hasTill && hasBlackout && outreachFirst;
    console.log(pass ? "SELFTEST PASS" : "SELFTEST FAIL");
    process.exit(pass ? 0 : 1);
  }

  const pulse = await computePulse();

  if (args.includes("--dry-run")) {
    console.log(JSON.stringify(pulse, null, 2));
    console.log("\n--dry-run: nothing written");
    return;
  }

  await fs.mkdir(OPS, { recursive: true });
  const tmp = `${PULSE_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(pulse, null, 2));
  await fs.rename(tmp, PULSE_PATH);

  if (args.includes("--print")) console.log(JSON.stringify(pulse, null, 2));
  else {
    console.log(`ops-pulse written: ${PULSE_PATH}`);
    for (const e of pulse.escalations) console.log(`  ! ${e}`);
    if (!pulse.escalations.length) console.log("  no escalations");
  }
}

// Run ONLY when executed directly. This file exports stripeState/computePulse
// for tests, and an unguarded main() meant that merely importing it rewrote the
// live public/data/ops/ops-pulse.json — with whatever the importer had mocked.
// A test that silently overwrites the operational pulse is worse than no test.
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((e) => {
    console.error("ops-pulse fatal:", e);
    process.exit(2);
  });
}
