#!/usr/bin/env node
/**
 * system-pulse.mjs — the fleet's ONE ambient notifier (consolidated).
 *
 * 2026-07-10 consolidation (marathon W1 / audit B5): absorbs
 * growth-narrator's per-event play-by-play — that daemon is retired.
 * The old shape was ~48 near-identical pulse cards/day PLUS a 90-second
 * narrator loop; important cards drowned. New shape, three signal classes:
 *
 *   1. IMMEDIATE (within one 5-min cycle): money/launch events — new
 *      sale, launch complete, posts/videos actually published — and any
 *      INCREASE in stale daemons (alert-on-change; recovery rides the
 *      digest). These are the cards worth buzzing a phone for.
 *   2. HOURLY DIGEST (at most one/hour, only when something happened):
 *      batched narration lines from every tenant's audit log since the
 *      last digest + the ambient counters (opps, drafts, taps waiting,
 *      daemon tally).
 *   3. QUIET REASSURANCE: if nothing has been sent for 6h, one line so
 *      Jack knows the wire itself is alive.
 *
 * Expected volume: ~48+/day → typically ≤ 10/day.
 *
 * Runs as the same KeepAlive daemon (com.day14.system-pulse); heartbeat
 * name/cadence unchanged so the watchdog keeps tracking it. State file
 * gains narrator fields (absorbs founder-ops/growth-narrator-state.json's
 * job; old file is left untouched/orphaned — sentinel doesn't watch it).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const BIZ = path.join(HOME, "Documents/businesses");
const OPPS_DIR = path.join(SHARED, "opportunities");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const POLLER_DIR = path.join(SHARED, "poller");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const SKILLS_DRAFTS = path.join(HOME, "Documents/studio/docs/seeds/skills/_drafts");
const STATE_FILE = path.join(SHARED, "founder-ops/system-pulse-state.json");
const LOG_FILE = path.join(SHARED, "poller/system-pulse.log");
const HEARTBEAT_FILE = path.join(SHARED, "poller/system-pulse-heartbeat.log");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");

const POLL_INTERVAL_MS = 5 * 60_000; // finer cycle so IMMEDIATE events land fast
const HEARTBEAT_INTERVAL_MS = 60_000;
const DIGEST_MIN_GAP_MS = 60 * 60_000; // at most one ambient digest per hour
const QUIET_REASSURE_MS = 6 * 60 * 60_000; // one "all quiet" line after 6h of silence
const MAX_PENDING_NARRATIONS = 40;

// ---- narration verbs (absorbed from growth-narrator, retired 2026-07-10) ----
const NARRATORS = {
  draft_created: (ev) => `📦 ${ev.tenant}: drafted "${ev.quote || ev.slug || "new product"}"`,
  product_created: (ev) => `🛒 ${ev.tenant}: created Printify product${ev.title ? ` — "${ev.title.slice(0, 60)}"` : ""}`,
  post_drafted: (ev) => `📝 ${ev.tenant}: blog post drafted${ev.slug ? ` — "${ev.slug}"` : ""}`,
  issue_drafted: (ev) => `📧 ${ev.tenant}: newsletter issue #${ev.issue || "?"} drafted${ev.subject ? ` — "${ev.subject}"` : ""}`,
  scripts_generated: (ev) => `🎬 ${ev.tenant}: ${ev.count || 3} TikTok scripts ready`,
  pins_generated: (ev) => `📌 ${ev.tenant}: ${ev.count || 3} Pinterest pins generated`,
  video_created: (ev) => `🎥 ${ev.tenant}: AI video done${ev.duration_sec ? ` (${ev.duration_sec.toFixed(1)}s)` : ""}`,
  trends_scanned: (ev) => `📈 ${ev.tenant}: ${ev.count || "—"} trends scanned`,
  calendar_planned: (ev) => `🗓 ${ev.tenant}: ${ev.entries || "30 days"} of content planned`,
  new_order_detected: (ev) => `💸 ${ev.tenant}: NEW SALE — order ${ev.order_id} ($${((ev.amount_cents || 0) / 100).toFixed(2)})`,
  launch_completed: (ev) => `🚀 ${ev.tenant}: launch complete — ${ev.products_created}/${ev.products_attempted} products live`,
  cs_triage_completed: (ev) => `📨 ${ev.tenant}: CS draft ready (${ev.details?.classification || "?"})`,
  drafts_generated: (ev) => `📣 ${ev.tenant}: ${ev.count || 3} marketing drafts ready`,
  queue_built: (ev) => `🚦 ${ev.tenant}: ${ev.count || 0} posts queued for today`,
  pins_published: (ev) => `📌 ${ev.tenant}: published ${ev.count || 0} pins to Pinterest 🎉`,
  videos_uploaded: (ev) => `🎥 ${ev.tenant}: ${ev.count || 0} videos uploaded to YouTube 🎉`,
};

/** Events worth a phone buzz NOW, not an hourly digest line. */
const IMMEDIATE_ACTIONS = new Set([
  "new_order_detected",
  "launch_completed",
  "pins_published",
  "videos_uploaded",
]);

async function loadEnv() {
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
  await fs.appendFile(LOG_FILE, line);
}

async function heartbeat() {
  await fs.mkdir(path.dirname(HEARTBEAT_FILE), { recursive: true });
  await fs.appendFile(HEARTBEAT_FILE, `${new Date().toISOString()} alive\n`);
}

async function loadState() {
  const defaults = {
    last_check: null,
    last_opp_count: 0,
    last_skill_draft_count: 0,
    // consolidated fields (2026-07-10)
    last_event_ts: {}, // per-tenant audit cursor (was growth-narrator's)
    pending_narrations: [], // batched for the next digest
    last_digest_at: 0,
    last_sent_at: 0, // any card, for quiet-reassurance
    last_stale_count: 0,
  };
  if (!existsSync(STATE_FILE)) return defaults;
  try {
    return { ...defaults, ...JSON.parse(await fs.readFile(STATE_FILE, "utf8")) };
  } catch {
    return defaults;
  }
}

async function saveState(s) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(s, null, 2));
}

async function queueCard(env, text, urgency) {
  await fs.mkdir(OUTBOX, { recursive: true });
  await fs.writeFile(
    path.join(OUTBOX, `${Date.now()}-system-pulse.json`),
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

async function countOpps() {
  if (!existsSync(OPPS_DIR)) return 0;
  return (await fs.readdir(OPPS_DIR)).filter((f) => f.endsWith(".json")).length;
}

async function countSkillDrafts() {
  if (!existsSync(SKILLS_DRAFTS)) return 0;
  return (await fs.readdir(SKILLS_DRAFTS, { withFileTypes: true })).filter((e) => e.isDirectory() && !e.name.startsWith("_")).length;
}

async function checkDaemons() {
  if (!existsSync(POLLER_DIR)) return { total: 0, healthy: 0, stale: 0 };
  let total = 0, healthy = 0, stale = 0;
  for (const f of await fs.readdir(POLLER_DIR)) {
    if (!f.endsWith("-heartbeat.log")) continue;
    total++;
    try {
      const text = await fs.readFile(path.join(POLLER_DIR, f), "utf8");
      const lines = text.trim().split("\n").filter(Boolean);
      const last = lines[lines.length - 1];
      const ts = last?.match(/^(\S+)/)?.[1];
      const ageMin = ts ? (Date.now() - new Date(ts).getTime()) / 60_000 : Infinity;
      if (ageMin < 10) healthy++;
      else stale++;
    } catch { stale++; }
  }
  return { total, healthy, stale };
}

async function pendingTaps() {
  let cs = 0, postsQueued = 0;
  if (existsSync(TENANTS_FILE)) {
    const tenants = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];
    for (const t of tenants) {
      const csDir = path.join(BIZ, t.slug, "cs-drafts");
      if (existsSync(csDir)) cs += (await fs.readdir(csDir)).filter((f) => f.endsWith(".md")).length;
      const sqRoot = path.join(BIZ, t.slug, "social-queue");
      if (existsSync(sqRoot)) {
        for (const p of await fs.readdir(sqRoot)) {
          const platform = path.join(sqRoot, p);
          const files = (await fs.readdir(platform).catch(() => [])).filter((f) => f.endsWith(".json"));
          for (const f of files) {
            try {
              const data = JSON.parse(await fs.readFile(path.join(platform, f), "utf8"));
              if (data.status === "queued") postsQueued++;
            } catch {}
          }
        }
      }
    }
  }
  return { cs, postsQueued };
}

/** New audit events per tenant since the state cursor (narrator's old job). */
async function collectNewAuditEvents(state) {
  if (!existsSync(TENANTS_FILE)) return [];
  const tenants = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];
  const out = [];
  for (const t of tenants) {
    const auditPath = path.join(BIZ, t.slug, "audit-log.jsonl");
    if (!existsSync(auditPath)) continue;
    const since = state.last_event_ts[t.slug];
    let newestTs = since;
    try {
      const text = await fs.readFile(auditPath, "utf8");
      for (const line of text.trim().split("\n").filter(Boolean)) {
        try {
          const ev = JSON.parse(line);
          if (since && ev.ts && ev.ts <= since) continue;
          out.push({ ...ev, tenant: t.slug });
          if (!newestTs || (ev.ts && ev.ts > newestTs)) newestTs = ev.ts;
        } catch {}
      }
    } catch {}
    if (newestTs) state.last_event_ts[t.slug] = newestTs;
  }
  return out;
}

function narrate(ev) {
  const fn = NARRATORS[ev.action];
  return fn ? fn(ev) : null;
}

async function cycle() {
  const env = await loadEnv();
  if (!env.TELEGRAM_CHAT_ID) return;

  const state = await loadState();
  const now = Date.now();

  // ---- 1. Audit events → immediate vs pending ----
  const events = await collectNewAuditEvents(state);
  const immediate = [];
  for (const ev of events) {
    const line = narrate(ev);
    if (!line) continue;
    if (IMMEDIATE_ACTIONS.has(ev.action)) immediate.push(line);
    else state.pending_narrations.push(line);
  }
  if (state.pending_narrations.length > MAX_PENDING_NARRATIONS) {
    const dropped = state.pending_narrations.length - MAX_PENDING_NARRATIONS;
    state.pending_narrations = state.pending_narrations.slice(-MAX_PENDING_NARRATIONS);
    state.pending_narrations.unshift(`… ${dropped} earlier events truncated`);
  }

  if (immediate.length > 0) {
    await queueCard(env, `⚡ *Now*\n${immediate.join("\n")}`, "P2");
    state.last_sent_at = now;
    await log(`immediate card: ${immediate.length} event(s)`);
  }

  // ---- 2. Daemon health, alert-on-change (increase only) ----
  const daemons = await checkDaemons();
  if (daemons.stale > state.last_stale_count) {
    await queueCard(
      env,
      `⚠️ *Daemons* — stale count ${state.last_stale_count} → ${daemons.stale} (${daemons.healthy}/${daemons.total} green)`,
      "P2"
    );
    state.last_sent_at = now;
    await log(`stale-increase alert: ${state.last_stale_count} → ${daemons.stale}`);
  }
  state.last_stale_count = daemons.stale;

  // ---- 3. Hourly digest (only when something happened) ----
  const oppCount = await countOpps();
  const skillDraftCount = await countSkillDrafts();
  const taps = await pendingTaps();
  const newOpps = oppCount - state.last_opp_count;
  const newSkillDrafts = skillDraftCount - state.last_skill_draft_count;

  const digestDue = now - state.last_digest_at >= DIGEST_MIN_GAP_MS;
  const bits = [];
  if (newOpps > 0) bits.push(`*${newOpps}* new ideas`);
  if (newSkillDrafts > 0) bits.push(`*${newSkillDrafts}* new skill drafts`);
  if (taps.cs > 0) bits.push(`*${taps.cs}* CS drafts waiting`);
  if (taps.postsQueued > 0) bits.push(`*${taps.postsQueued}* posts to approve`);
  if (daemons.stale > 0) bits.push(`⚠️ *${daemons.stale}* daemons stale`);

  if (digestDue && (state.pending_narrations.length > 0 || bits.length > 0)) {
    const sections = [];
    if (state.pending_narrations.length > 0) sections.push(state.pending_narrations.join("\n"));
    if (bits.length > 0) sections.push(bits.join(" · "));
    sections.push(`${daemons.healthy}/${daemons.total} daemons green`);
    await queueCard(env, `🫀 *Hourly* \n${sections.join("\n\n")}`, "P3");
    state.pending_narrations = [];
    state.last_digest_at = now;
    state.last_sent_at = now;
    state.last_opp_count = oppCount;
    state.last_skill_draft_count = skillDraftCount;
    await log(`hourly digest sent`);
  } else if (now - state.last_sent_at >= QUIET_REASSURE_MS) {
    // ---- 4. Quiet reassurance ----
    await queueCard(env, `🫀 *Pulse* · ${daemons.healthy}/${daemons.total} daemons green · quiet, all running`, "P3");
    state.last_sent_at = now;
    state.last_digest_at = now;
    state.last_opp_count = oppCount;
    state.last_skill_draft_count = skillDraftCount;
    await log(`quiet reassurance sent`);
  }

  state.last_check = new Date().toISOString();
  await saveState(state);
}

async function main() {
  await log("system-pulse (consolidated w/ narrator, 2026-07-10) starting");
  setInterval(cycle, POLL_INTERVAL_MS);
  setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  await cycle();
  await heartbeat();
  await log("cycle 5min · immediate money events · hourly digest · 6h quiet line");
}

main().catch(async (err) => { await log(`FATAL: ${err.message}`); process.exit(1); });
