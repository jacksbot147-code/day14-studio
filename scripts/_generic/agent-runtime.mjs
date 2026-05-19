/**
 * agent-runtime.mjs — universal wrapper for every agent/script.
 *
 * Wrap your main() with tryRun() and you get:
 *   - Auto audit entries on start/end/error (writes to tenant audit-log.jsonl)
 *   - Auto heartbeat writes (when name maps to a daemon)
 *   - Duration tracking
 *   - Error capture + Telegram alert on fatal
 *   - Stderr captured to per-script log
 *
 * Usage:
 *
 *   import { tryRun, audit } from "./agent-runtime.mjs";
 *
 *   async function main() {
 *     // your logic
 *   }
 *
 *   await tryRun("cfo-agent", main, { tenant: "global" });
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const POLLER_DIR = path.join(SHARED, "poller");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");
const BIZ = path.join(HOME, "Documents/businesses");

let cachedEnv = null;
export async function getEnv() {
  if (cachedEnv) return cachedEnv;
  if (!existsSync(ENV_FILE)) return {};
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  cachedEnv = env;
  return env;
}

export async function audit(record) {
  const tenant = record.tenant || "_shared";
  const dir = tenant === "_shared" ? path.join(SHARED, "founder-ops") : path.join(BIZ, tenant);
  await fs.mkdir(dir, { recursive: true });
  const f = path.join(dir, "audit-log.jsonl");
  const entry = JSON.stringify({ ts: new Date().toISOString(), tenant, ...record }) + "\n";
  await fs.appendFile(f, entry);
}

export async function heartbeat(name) {
  await fs.mkdir(POLLER_DIR, { recursive: true });
  await fs.appendFile(path.join(POLLER_DIR, `${name}-heartbeat.log`), `${new Date().toISOString()} alive\n`);
}

export async function alertTelegram(text, urgency = "P3") {
  const env = await getEnv();
  if (!env.TELEGRAM_CHAT_ID) return;
  await fs.mkdir(OUTBOX, { recursive: true });
  await fs.writeFile(
    path.join(OUTBOX, `${Date.now()}-agent-alert.json`),
    JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: "Markdown",
      urgency,
      queued_at: new Date().toISOString(),
      sent_at: null,
    }, null, 2)
  );
}

/**
 * Wrap a script's main entrypoint. Auto-audits start/end/error, heartbeats,
 * captures duration. On fatal error: alerts via Telegram + exits 1.
 */
export async function tryRun(name, fn, opts = {}) {
  const startTs = Date.now();
  const tenant = opts.tenant || "_shared";

  await heartbeat(name);
  await audit({ actor: name, action: "run_started", tenant });

  try {
    const result = await fn();
    const durationMs = Date.now() - startTs;
    await audit({ actor: name, action: "run_completed", tenant, duration_ms: durationMs });
    await heartbeat(name);
    return result;
  } catch (err) {
    const durationMs = Date.now() - startTs;
    const message = err instanceof Error ? err.message : String(err);
    await audit({ actor: name, action: "run_failed", tenant, error: message.slice(0, 500), duration_ms: durationMs });
    if (opts.alertOnError !== false) {
      await alertTelegram(`🚨 *${name} crashed*\n\nError: \`${message.slice(0, 400)}\`\n\nDuration: ${(durationMs / 1000).toFixed(1)}s`, "P1");
    }
    console.error(`FATAL [${name}]:`, message);
    process.exit(1);
  }
}
