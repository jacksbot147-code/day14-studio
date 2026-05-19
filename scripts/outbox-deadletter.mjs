#!/usr/bin/env node
/**
 * outbox-deadletter.mjs
 *
 * Cleans up Telegram outbox:
 *   - Messages with `sent_at` set + older than 24hr → move to _sent/<YYYY-MM>/
 *   - Messages without `sent_at` + older than 6hr + retry_count >= 3 → move to _dead/ + alert
 *   - Tracks retry_count on each unsent message (bumps on each pass)
 *
 * Runs every 30 min. Prevents the outbox from accumulating zombies.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { tryRun, alertTelegram, heartbeat } from "./_generic/agent-runtime.mjs";

const HOME = homedir();
const OUTBOX = path.join(HOME, "Documents/businesses/_shared/telegram/outbox");
const SENT_ROOT = path.join(OUTBOX, "_sent");
const DEAD = path.join(OUTBOX, "_dead");

const SENT_RETENTION_HOURS = 24;
const UNSENT_DEAD_HOURS = 6;
const MAX_RETRIES = 3;
const POLL_INTERVAL_MS = 30 * 60_000;
const HEARTBEAT_INTERVAL_MS = 60_000;

async function cycle() {
  if (!existsSync(OUTBOX)) return;
  await fs.mkdir(DEAD, { recursive: true });
  const yyyymm = new Date().toISOString().slice(0, 7);
  const sentDir = path.join(SENT_ROOT, yyyymm);
  await fs.mkdir(sentDir, { recursive: true });

  const files = await fs.readdir(OUTBOX);
  const now = Date.now();
  let archived = 0, deadlettered = 0, retried = 0;

  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const fpath = path.join(OUTBOX, f);
    try {
      const stat = await fs.stat(fpath);
      const data = JSON.parse(await fs.readFile(fpath, "utf8"));

      if (data.sent_at) {
        // Archive sent messages older than retention
        const sentAge = (now - new Date(data.sent_at).getTime()) / 3_600_000;
        if (sentAge > SENT_RETENTION_HOURS) {
          await fs.rename(fpath, path.join(sentDir, f));
          archived += 1;
        }
      } else {
        // Unsent — check retry count + age
        const queuedAge = (now - (data.queued_at ? new Date(data.queued_at).getTime() : stat.mtime.getTime())) / 3_600_000;
        const retryCount = data.retry_count || 0;

        if (queuedAge > UNSENT_DEAD_HOURS && retryCount >= MAX_RETRIES) {
          await fs.rename(fpath, path.join(DEAD, f));
          deadlettered += 1;
        } else if (queuedAge > 0.5) {
          // After 30 min unsent — bump retry counter
          data.retry_count = retryCount + 1;
          data.last_retry_at = new Date().toISOString();
          await fs.writeFile(fpath, JSON.stringify(data, null, 2));
          retried += 1;
        }
      }
    } catch {}
  }

  if (deadlettered > 0) {
    await alertTelegram(`☠️ *${deadlettered} message(s) dead-lettered* — see ${DEAD}`, "P2");
  }
  console.log(`[${new Date().toISOString()}] deadletter: ${archived} archived, ${deadlettered} dead, ${retried} retry++`);
}

async function main() {
  await heartbeat("outbox-deadletter");
  setInterval(() => tryRun("outbox-deadletter-cycle", cycle, { alertOnError: false }), POLL_INTERVAL_MS);
  setInterval(() => heartbeat("outbox-deadletter"), HEARTBEAT_INTERVAL_MS);
  await cycle();
}

tryRun("outbox-deadletter", main, { alertOnError: false });
