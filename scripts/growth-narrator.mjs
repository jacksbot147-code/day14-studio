#!/usr/bin/env node
/**
 * growth-narrator.mjs — RETIRED 2026-07-10 (marathon W1 / audit finding F4).
 *
 * Its per-event play-by-play was absorbed into system-pulse.mjs, which now
 * sends money/launch events immediately and batches the rest into an
 * hourly digest — one notifier instead of two, ~48 cards/day → ≤10.
 *
 * This stub exists so any still-loaded com.day14.growth-narrator plist
 * exits cleanly instead of double-narrating:
 *   - deletes its own heartbeat file so the auto-restart-watchdog stops
 *     tracking it (no stale-heartbeat P1s, no kickstart loops),
 *   - exits 0 (plist KeepAlive = {SuccessfulExit:false} → a clean exit
 *     is NOT relaunched).
 *
 * install-platform-agents.sh now unloads + removes the plist entirely —
 * run it (or mini-fix-all.sh) to finish the retirement. The old state
 * file founder-ops/growth-narrator-state.json is left in place for
 * history; system-pulse keeps its own audit cursors.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const SHARED = path.join(homedir(), "Documents/businesses/_shared");
const HEARTBEAT_FILE = path.join(SHARED, "poller/growth-narrator-heartbeat.log");
const LOG_FILE = path.join(SHARED, "poller/growth-narrator.log");

async function main() {
  const line = `[${new Date().toISOString()}] growth-narrator is RETIRED — narration lives in system-pulse.mjs now. Exiting cleanly.\n`;
  process.stdout.write(line);
  try {
    await fs.appendFile(LOG_FILE, line);
  } catch {}
  // Remove the heartbeat so the watchdog stops tracking a retired agent.
  try {
    if (existsSync(HEARTBEAT_FILE)) await fs.unlink(HEARTBEAT_FILE);
  } catch {}
  process.exit(0);
}

main();
