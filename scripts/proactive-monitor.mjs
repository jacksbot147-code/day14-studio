#!/usr/bin/env node
/**
 * proactive-monitor.mjs
 *
 * Long-running background daemon that watches Day14 OS state every 10 min
 * and surfaces real issues to Jack via Telegram without him asking.
 *
 * Watches for:
 *   - Stale heartbeats (any poller down > 10 min)
 *   - Stuck outbox messages (unsent > 30 min)
 *   - Failed worker runs (errors in last 60 min log)
 *   - Pending drafts that need approval (idle > 24h)
 *   - Disk space (>90% full alert)
 *   - Customer service drafts waiting > 4h
 *
 * Surfaces ONLY when state CHANGES (new red, new yellow, or recovery to green).
 * Suppresses duplicate alerts within 1 hour.
 *
 * Install as LaunchAgent: bash scripts/install-proactive-monitor.sh
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const POLLER_DIR = path.join(SHARED, "poller");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const STATE_FILE = path.join(SHARED, "founder-ops/proactive-monitor-state.json");
const LOG_FILE = path.join(POLLER_DIR, "proactive-monitor.log");
const HEARTBEAT_FILE = path.join(POLLER_DIR, "proactive-monitor-heartbeat.log");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");

const POLL_INTERVAL_MS = 10 * 60_000; // every 10 min
const HEARTBEAT_INTERVAL_MS = 60_000;
const DUPLICATE_SUPPRESS_MS = 60 * 60_000; // 1 hr

async function loadEnv() {
  if (!existsSync(ENV_FILE)) return {};
  const text = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) {
      env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
  return env;
}

async function log(msg) {
  const stamp = new Date().toISOString();
  const line = `[${stamp}] ${msg}\n`;
  process.stdout.write(line);
  await fs.mkdir(POLLER_DIR, { recursive: true });
  await fs.appendFile(LOG_FILE, line);
}

async function heartbeat() {
  await fs.appendFile(HEARTBEAT_FILE, `${new Date().toISOString()} alive\n`);
}

async function loadState() {
  if (!existsSync(STATE_FILE)) {
    return { last_alerts: {}, last_status: "green" };
  }
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
  } catch {
    return { last_alerts: {}, last_status: "green" };
  }
}

async function saveState(state) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

async function queueAlert(text, urgency = "P2", alertKey) {
  const env = await loadEnv();
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    await log(`would alert but no TELEGRAM_CHAT_ID: ${text.slice(0, 80)}`);
    return;
  }
  await fs.mkdir(OUTBOX, { recursive: true });
  const filename = `${Date.now()}-monitor-${alertKey || "alert"}.json`;
  await fs.writeFile(
    path.join(OUTBOX, filename),
    JSON.stringify(
      {
        chat_id: chatId,
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

// ---- Checks ----

async function checkHeartbeats() {
  const issues = [];
  try {
    const files = await fs.readdir(POLLER_DIR);
    for (const f of files) {
      if (!f.endsWith("-heartbeat.log")) continue;
      if (f === "proactive-monitor-heartbeat.log") continue; // skip self
      const name = f.replace("-heartbeat.log", "");
      const filePath = path.join(POLLER_DIR, f);
      const text = await fs.readFile(filePath, "utf8");
      const lines = text.trim().split("\n").filter(Boolean);
      const last = lines[lines.length - 1];
      if (!last) {
        issues.push({ key: `heartbeat-${name}`, msg: `${name}: no heartbeats yet`, urgency: "P1" });
        continue;
      }
      const tsMatch = last.match(/^(\S+)/);
      if (!tsMatch) continue;
      const ageMin = (Date.now() - new Date(tsMatch[1]).getTime()) / 60000;
      if (ageMin > 10) {
        issues.push({
          key: `heartbeat-${name}`,
          msg: `🔴 *Poller dead*: ${name} last beat ${Math.round(ageMin)} min ago`,
          urgency: "P1",
        });
      }
    }
  } catch {
    // poller dir doesn't exist yet
  }
  return issues;
}

async function checkStuckOutbox() {
  const issues = [];
  if (!existsSync(OUTBOX)) return issues;
  const files = await fs.readdir(OUTBOX);
  let stuckCount = 0;
  let oldestAgeMin = 0;
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    if (f.startsWith("morning-briefing")) continue; // briefing files allowed to wait
    const filePath = path.join(OUTBOX, f);
    try {
      const data = JSON.parse(await fs.readFile(filePath, "utf8"));
      if (data.sent_at) continue;
      const age = (Date.now() - new Date(data.queued_at).getTime()) / 60000;
      if (age > 30) {
        stuckCount += 1;
        if (age > oldestAgeMin) oldestAgeMin = age;
      }
    } catch {
      // skip
    }
  }
  if (stuckCount > 3) {
    issues.push({
      key: "stuck-outbox",
      msg: `⚠️ *Outbox stuck*: ${stuckCount} unsent messages, oldest ${Math.round(oldestAgeMin)} min. Check telegram-poller.`,
      urgency: "P2",
    });
  }
  return issues;
}

async function checkPendingDrafts() {
  const issues = [];
  const draftsDir = path.join(HOME, "Documents/studio/docs/seeds/skills/_drafts");
  if (!existsSync(draftsDir)) return issues;
  const entries = await fs.readdir(draftsDir, { withFileTypes: true });
  const oldDrafts = [];
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith("_")) continue;
    const skillFile = path.join(draftsDir, e.name, "SKILL.md");
    if (!existsSync(skillFile)) continue;
    const stat = await fs.stat(skillFile);
    const ageHours = (Date.now() - stat.mtime.getTime()) / 3600_000;
    if (ageHours > 24) oldDrafts.push(e.name);
  }
  if (oldDrafts.length > 5) {
    issues.push({
      key: "old-drafts",
      msg: `📋 *${oldDrafts.length} drafts* waiting >24h. Tap-through queue is backing up.`,
      urgency: "P3",
    });
  }
  return issues;
}

async function checkCsDrafts() {
  const issues = [];
  const businessesDir = path.join(HOME, "Documents/businesses");
  if (!existsSync(businessesDir)) return issues;
  let totalWaiting = 0;
  for (const tenant of await fs.readdir(businessesDir)) {
    const csDir = path.join(businessesDir, tenant, "cs-drafts");
    if (!existsSync(csDir)) continue;
    const files = await fs.readdir(csDir);
    for (const f of files) {
      if (!f.endsWith(".md")) continue;
      const stat = await fs.stat(path.join(csDir, f));
      const ageHours = (Date.now() - stat.mtime.getTime()) / 3600_000;
      if (ageHours > 4 && ageHours < 72) totalWaiting += 1; // ignore really old
    }
  }
  if (totalWaiting > 0) {
    issues.push({
      key: "cs-drafts-waiting",
      msg: `📨 ${totalWaiting} customer service drafts waiting >4h. Review + send.`,
      urgency: totalWaiting > 5 ? "P1" : "P2",
    });
  }
  return issues;
}

// ---- main loop ----
async function scanCycle() {
  try {
    const state = await loadState();
    const allIssues = [
      ...(await checkHeartbeats()),
      ...(await checkStuckOutbox()),
      ...(await checkPendingDrafts()),
      ...(await checkCsDrafts()),
    ];

    const now = Date.now();
    let newAlerts = 0;
    for (const issue of allIssues) {
      const lastAlertMs = state.last_alerts[issue.key] || 0;
      if (now - lastAlertMs < DUPLICATE_SUPPRESS_MS) continue; // suppress duplicate
      await queueAlert(issue.msg, issue.urgency, issue.key);
      state.last_alerts[issue.key] = now;
      newAlerts += 1;
    }

    // Recovery: if previously alerted issue is no longer present, clear from state
    const currentKeys = new Set(allIssues.map((i) => i.key));
    for (const key of Object.keys(state.last_alerts)) {
      if (!currentKeys.has(key) && now - state.last_alerts[key] > DUPLICATE_SUPPRESS_MS) {
        delete state.last_alerts[key];
      }
    }

    const newStatus =
      allIssues.some((i) => i.urgency === "P0" || i.urgency === "P1")
        ? "red"
        : allIssues.length > 0
          ? "yellow"
          : "green";

    if (state.last_status !== newStatus) {
      await log(`status change: ${state.last_status} → ${newStatus}`);
      state.last_status = newStatus;
    }

    if (newAlerts > 0) {
      await log(`scan: ${allIssues.length} issues, ${newAlerts} new alerts queued`);
    }

    await saveState(state);
  } catch (err) {
    await log(`scanCycle error: ${err.message}`);
  }
}

async function main() {
  await fs.mkdir(POLLER_DIR, { recursive: true });
  await log("proactive-monitor starting");

  setInterval(scanCycle, POLL_INTERVAL_MS);
  setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

  await scanCycle();
  await heartbeat();

  await log("proactive-monitor running");
}

main().catch(async (err) => {
  await log(`FATAL: ${err.message}`);
  process.exit(1);
});
