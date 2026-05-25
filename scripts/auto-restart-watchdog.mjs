#!/usr/bin/env node
/**
 * auto-restart-watchdog.mjs
 *
 * Watches heartbeat files. When a daemon's last beat is > stale threshold
 * AND the daemon has a corresponding LaunchAgent, kick it with launchctl.
 *
 * Runs every 5 minutes. Telegram-alerts on restart.
 *
 * State: ~/Documents/businesses/_shared/founder-ops/watchdog-state.json
 *        tracks recent restart attempts to avoid restart loops (max 3
 *        restarts in 30 min per daemon, then give up + alert).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { tryRun, audit, alertTelegram, heartbeat } from "./_generic/agent-runtime.mjs";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const POLLER_DIR = path.join(SHARED, "poller");
const STATE_FILE = path.join(SHARED, "founder-ops/watchdog-state.json");

const STALE_MIN = 12;          // default: mark daemon stale after 12 min
const POLL_INTERVAL_MS = 5 * 60_000;
const HEARTBEAT_INTERVAL_MS = 60_000;
const MAX_RESTARTS_30MIN = 3;

// Per-agent stale overrides (minutes).
//
// Not every "daemon" is a long-running process. Some agents are installed as
// interval-scheduled one-shot LaunchAgents (StartInterval): they wake, do
// work, write ONE heartbeat line, and exit cleanly. Between runs there is no
// process at all — that is healthy, not a crash. A flat 12-min threshold
// flags these as stale within minutes of every run and "restarts" them every
// cycle, producing constant churn + restart alerts.
//
// Threshold must exceed the agent's scheduling interval plus slack. Verified
// against the install-*.sh plists:
//   - lawn-care-gm-*  : StartInterval 1800s (30 min)  -> 45 min threshold
//   - realty-scout-*  : StartInterval 3600s (60 min)  -> 80 min threshold
// Match by name prefix so all tenants of a vertical inherit the override.
const STALE_MIN_OVERRIDES = [
  { prefix: "lawn-care-gm-", staleMin: 45 },
  { prefix: "realty-scout-", staleMin: 80 },
];

function staleThresholdFor(name) {
  for (const o of STALE_MIN_OVERRIDES) {
    if (name.startsWith(o.prefix)) return o.staleMin;
  }
  return STALE_MIN;
}

// Exponential backoff between restart attempts for the SAME agent.
// Without this, a genuinely-broken agent is kicked every 5-min cycle until it
// hits MAX_RESTARTS_30MIN. Backoff spaces attempts out: 5, 10, 20 min.
const BACKOFF_BASE_MS = 5 * 60_000;
const BACKOFF_MAX_MS = 30 * 60_000;

function backoffMs(attemptCount) {
  // attemptCount = how many restarts already attempted in the window
  const ms = BACKOFF_BASE_MS * Math.pow(2, Math.max(0, attemptCount - 1));
  return Math.min(ms, BACKOFF_MAX_MS);
}

// Map heartbeat name → launchctl label
function labelFor(name) {
  // Tenant-prefixed names (e.g., "hot-flash-co-daily-engine") map to "com.day14.hot-flash-co.daily-engine"
  // Try a few patterns
  return [
    `com.day14.${name}`,
    `com.day14.${name.replace(/-/, ".")}`,
  ];
}

function isLoaded(label) {
  try {
    const out = execSync(`launchctl list 2>/dev/null | grep -F "${label}"`, { encoding: "utf8" });
    return out.trim().length > 0;
  } catch { return false; }
}

function kickstart(label) {
  try {
    const uid = execSync("id -u", { encoding: "utf8" }).trim();
    execSync(`launchctl kickstart -k gui/${uid}/${label}`, { stdio: "pipe" });
    return true;
  } catch { return false; }
}

async function loadState() {
  if (!existsSync(STATE_FILE)) return { restarts: {} };
  return JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
}

async function saveState(s) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(s, null, 2));
}

async function cycle() {
  const state = await loadState();
  if (!existsSync(POLLER_DIR)) return;
  const files = await fs.readdir(POLLER_DIR);
  const now = Date.now();
  let restarted = 0;
  let abandoned = 0;

  for (const f of files) {
    if (!f.endsWith("-heartbeat.log")) continue;
    const name = f.replace("-heartbeat.log", "");
    if (name === "auto-restart-watchdog") continue;
    if (name === "proactive-monitor") continue; // existing safe-state
    // recursive-expansion-engine self-gates: with no Gemini API key it logs a
    // single line and exits 0 (clean no-op). Its LaunchAgent is configured
    // KeepAlive={SuccessfulExit:false}, so launchd intentionally does NOT
    // relaunch it after that clean exit — it is meant to stay down until a key
    // is configured. A stale heartbeat here is the designed healthy state, not
    // a crash. Restarting it would just spin it up to immediately exit again.
    if (name === "recursive-expansion") continue;

    try {
      const text = await fs.readFile(path.join(POLLER_DIR, f), "utf8");
      const last = text.trim().split("\n").filter(Boolean).slice(-1)[0];
      const ts = last?.match(/^(\S+)/)?.[1];
      if (!ts) continue;
      const ageMin = (now - new Date(ts).getTime()) / 60_000;

      // Per-agent staleness threshold. Interval-scheduled one-shot agents
      // legitimately have long heartbeat gaps between runs.
      const staleMin = staleThresholdFor(name);
      if (ageMin < staleMin) continue;

      // A "stale" heartbeat is only worth restarting if the agent actually
      // looks broken. For an interval-scheduled one-shot agent, the absence of
      // a recent beat is expected idle time, not a crash. The crash signal is
      // fresh stderr output. If the heartbeat is stale but the stderr log is
      // empty / not recently written, treat it as a clean exit between runs
      // and let launchd's own StartInterval handle the next run.
      const isOverridden = STALE_MIN_OVERRIDES.some((o) => name.startsWith(o.prefix));
      if (isOverridden) {
        let stderrFresh = false;
        try {
          const st = await fs.stat(path.join(POLLER_DIR, `${name}.stderr.log`));
          stderrFresh = st.size > 0 && (now - st.mtimeMs) < staleMin * 60_000;
        } catch { /* no stderr file -> not crashing */ }
        if (!stderrFresh) {
          // Healthy idle one-shot agent — clean exit, not a crash. Skip.
          continue;
        }
      }

      // Stale — try to restart
      // Check recent restart history
      const history = (state.restarts[name] || []).filter((t) => now - t < 30 * 60_000);

      // Exponential backoff: don't kick the same agent again until enough
      // time has passed since its last restart attempt.
      if (history.length > 0) {
        const lastAttempt = history[history.length - 1];
        const wait = backoffMs(history.length);
        if (now - lastAttempt < wait) {
          // Still in backoff window — leave it alone this cycle.
          continue;
        }
      }

      if (history.length >= MAX_RESTARTS_30MIN) {
        // Give up — alert once if not already alerted
        if (!state.restarts[name + "_abandoned"]) {
          await alertTelegram(`🛑 *Watchdog gave up on \`${name}\`*\n\nRestarted ${history.length}× in last 30 min, still stale (${Math.round(ageMin)}m). Manual fix needed.\n\n\`tail ~/Documents/businesses/_shared/poller/${name}.stderr.log\``, "P1");
          state.restarts[name + "_abandoned"] = now;
          abandoned += 1;
        }
        continue;
      }

      const labels = labelFor(name);
      let didRestart = false;
      for (const label of labels) {
        if (isLoaded(label) && kickstart(label)) {
          didRestart = true;
          break;
        }
      }
      if (didRestart) {
        history.push(now);
        state.restarts[name] = history;
        delete state.restarts[name + "_abandoned"];
        restarted += 1;
        await audit({ actor: "watchdog", action: "daemon_restarted", target: name, age_min: Math.round(ageMin) });
        await alertTelegram(`🔧 Watchdog restarted \`${name}\` (was stale ${Math.round(ageMin)}m)`, "P2");
      }
    } catch {}
  }

  await saveState(state);
  console.log(`[${new Date().toISOString()}] watchdog cycle: ${restarted} restarted, ${abandoned} abandoned`);
}

async function main() {
  await heartbeat("auto-restart-watchdog");
  setInterval(() => tryRun("auto-restart-watchdog-cycle", cycle, { alertOnError: false }), POLL_INTERVAL_MS);
  setInterval(() => heartbeat("auto-restart-watchdog"), HEARTBEAT_INTERVAL_MS);
  await cycle();
}

tryRun("auto-restart-watchdog", main, { alertOnError: false });
