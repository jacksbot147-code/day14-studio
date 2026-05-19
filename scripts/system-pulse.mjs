#!/usr/bin/env node
/**
 * system-pulse.mjs
 *
 * Every 30 minutes, sends Jack a brief pulse of empire activity.
 *
 * "🫀 30-min pulse: 2 new opps · 1 product drafted · 3 daemons green · 1 waiting on you"
 *
 * Quiet but constant. Lets Jack know the system's working.
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

const POLL_INTERVAL_MS = 30 * 60_000;
const HEARTBEAT_INTERVAL_MS = 60_000;

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
  if (!existsSync(STATE_FILE)) return { last_check: null, last_opp_count: 0, last_skill_draft_count: 0 };
  return JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
}

async function saveState(s) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(s, null, 2));
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

async function recentDraftsAcrossTenants(sinceMinutes = 30) {
  if (!existsSync(TENANTS_FILE)) return 0;
  const tenants = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];
  const cutoff = Date.now() - sinceMinutes * 60_000;
  let count = 0;
  for (const t of tenants) {
    const auditPath = path.join(BIZ, t.slug, "audit-log.jsonl");
    if (!existsSync(auditPath)) continue;
    const text = await fs.readFile(auditPath, "utf8");
    for (const line of text.trim().split("\n").filter(Boolean)) {
      try {
        const ev = JSON.parse(line);
        if (ev.action && ["draft_created", "post_drafted", "issue_drafted", "scripts_generated", "video_created"].includes(ev.action)) {
          if (new Date(ev.ts).getTime() > cutoff) count++;
        }
      } catch {}
    }
  }
  return count;
}

async function pendingTaps() {
  // Count CS drafts + skill drafts + queued posts
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

async function cycle() {
  const env = await loadEnv();
  if (!env.TELEGRAM_CHAT_ID) return;

  const state = await loadState();
  const oppCount = await countOpps();
  const skillDraftCount = await countSkillDrafts();
  const daemons = await checkDaemons();
  const recentDrafts = await recentDraftsAcrossTenants(30);
  const taps = await pendingTaps();

  const newOpps = oppCount - state.last_opp_count;
  const newSkillDrafts = skillDraftCount - state.last_skill_draft_count;

  state.last_check = new Date().toISOString();
  state.last_opp_count = oppCount;
  state.last_skill_draft_count = skillDraftCount;
  await saveState(state);

  // Build pulse message
  const bits = [];
  if (newOpps > 0) bits.push(`*${newOpps}* new ideas`);
  if (newSkillDrafts > 0) bits.push(`*${newSkillDrafts}* new skill drafts`);
  if (recentDrafts > 0) bits.push(`*${recentDrafts}* drafts in last 30m`);
  if (taps.cs > 0) bits.push(`*${taps.cs}* CS drafts waiting`);
  if (taps.postsQueued > 0) bits.push(`*${taps.postsQueued}* posts to approve`);
  if (daemons.stale > 0) bits.push(`⚠️ *${daemons.stale}* daemons stale`);

  // Always include daemon health
  const daemonStatus = `${daemons.healthy}/${daemons.total} daemons green`;

  let text;
  if (bits.length === 0) {
    text = `🫀 *Pulse* · ${daemonStatus} · quiet 30m, all running`;
  } else {
    text = `🫀 *Pulse* · ${daemonStatus}\n\n${bits.join("\n")}`;
  }

  await fs.mkdir(OUTBOX, { recursive: true });
  await fs.writeFile(
    path.join(OUTBOX, `${Date.now()}-system-pulse.json`),
    JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: "Markdown",
      urgency: "P3",
      queued_at: new Date().toISOString(),
      sent_at: null,
    }, null, 2)
  );
  await log(`pulse pushed: ${bits.length} signals`);
}

async function main() {
  await log("system-pulse starting");
  setInterval(cycle, POLL_INTERVAL_MS);
  setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  await cycle();
  await heartbeat();
  await log("running every 30min");
}

main().catch(async (err) => { await log(`FATAL: ${err.message}`); process.exit(1); });
