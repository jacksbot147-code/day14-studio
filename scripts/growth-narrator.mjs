#!/usr/bin/env node
/**
 * growth-narrator.mjs
 *
 * Watches audit logs across all tenants. When a new agent event happens,
 * narrates it as a friendly chatty Telegram update.
 *
 * Runs continuously. Polls every 90 seconds. Tracks last-seen-event per
 * tenant to avoid duplicates.
 *
 * Throttle: max 1 narration per 5 minutes per tenant (to avoid spam).
 *           empire-wide max 1 narration per 2 min.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const BIZ = path.join(HOME, "Documents/businesses");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const STATE_FILE = path.join(SHARED, "founder-ops/growth-narrator-state.json");
const LOG_FILE = path.join(SHARED, "poller/growth-narrator.log");
const HEARTBEAT_FILE = path.join(SHARED, "poller/growth-narrator-heartbeat.log");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");

const POLL_INTERVAL_MS = 90_000;
const HEARTBEAT_INTERVAL_MS = 60_000;
const PER_TENANT_THROTTLE_MS = 5 * 60_000;
const EMPIRE_THROTTLE_MS = 2 * 60_000;

// How to narrate each action
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
  if (!existsSync(STATE_FILE)) return { last_event_ts: {}, last_narration_at: {}, last_empire_narration_at: 0 };
  return JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
}

async function saveState(s) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(s, null, 2));
}

async function readAuditTail(tenant, sinceTs) {
  const auditPath = path.join(BIZ, tenant, "audit-log.jsonl");
  if (!existsSync(auditPath)) return [];
  const text = await fs.readFile(auditPath, "utf8");
  const events = [];
  for (const line of text.trim().split("\n").filter(Boolean)) {
    try {
      const ev = JSON.parse(line);
      if (sinceTs && ev.ts && ev.ts <= sinceTs) continue;
      events.push(ev);
    } catch {}
  }
  return events;
}

async function cycle() {
  const env = await loadEnv();
  if (!env.TELEGRAM_CHAT_ID) return;
  if (!existsSync(TENANTS_FILE)) return;

  const tenants = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];
  const state = await loadState();
  const now = Date.now();

  for (const t of tenants) {
    const slug = t.slug;
    const since = state.last_event_ts[slug];
    const events = await readAuditTail(slug, since);
    if (events.length === 0) continue;

    // Update last_event_ts to the newest event seen
    const newest = events[events.length - 1];
    state.last_event_ts[slug] = newest.ts || new Date().toISOString();

    // Per-tenant throttle
    const lastNarration = state.last_narration_at[slug] || 0;
    if (now - lastNarration < PER_TENANT_THROTTLE_MS) continue;
    // Empire-wide throttle
    if (now - state.last_empire_narration_at < EMPIRE_THROTTLE_MS) continue;

    // Pick the most interesting recent event to narrate
    const interesting = events.find((ev) => NARRATORS[ev.action]) || events[events.length - 1];
    const narrator = NARRATORS[interesting.action];
    const message = narrator ? narrator(interesting) : `📊 ${slug}: ${interesting.action}`;

    await fs.mkdir(OUTBOX, { recursive: true });
    await fs.writeFile(
      path.join(OUTBOX, `${Date.now()}-narrator-${slug}.json`),
      JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
        urgency: "P3",
        queued_at: new Date().toISOString(),
        sent_at: null,
        tenant: slug,
      }, null, 2)
    );
    state.last_narration_at[slug] = now;
    state.last_empire_narration_at = now;
    await log(`narrated for ${slug}: ${message.slice(0, 80)}`);
    break; // one per cycle to be respectful
  }
  await saveState(state);
}

async function main() {
  await log("growth-narrator starting");
  setInterval(cycle, POLL_INTERVAL_MS);
  setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  await cycle();
  await heartbeat();
  await log("watching all tenant audit logs");
}

main().catch(async (err) => { await log(`FATAL: ${err.message}`); process.exit(1); });
