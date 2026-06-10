#!/usr/bin/env node
/**
 * events-poller.mjs
 *
 * Day14 OS — Supabase events table → downstream actions.
 *
 * Long-running Node script that polls the `events` table for unprocessed
 * rows, dispatches each to the right downstream handler, marks
 * processed_at. Idempotent at the dispatch level.
 *
 * Companion to telegram-poller.mjs. Installs via
 * scripts/install-events-poller.sh as a macOS LaunchAgent.
 *
 * Environment:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * The actual downstream "actions" for the laptop-interim era are:
 *   - Write a notification to the telegram outbox (so the Telegram
 *     poller picks it up)
 *   - Append to MASTER_LOG.md for the next overnight task to see
 *   - (Future) trigger build-agent, etc.
 *
 * For now, this skill is the SKELETON. As more agents come online,
 * they get wired into the dispatch table below.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

// ---- config ----
const SHARED_DIR = path.join(homedir(), "Documents/businesses/_shared");
const POLLER_DIR = path.join(SHARED_DIR, "poller");
const TELEGRAM_OUTBOX = path.join(SHARED_DIR, "telegram/outbox");
const MASTER_LOG = path.join(
  homedir(),
  "Documents/studio/docs/overnight/MASTER_LOG.md"
);
const ENV_FILE = path.join(homedir(), "Documents/studio/.env.local");
const HEARTBEAT_FILE = path.join(POLLER_DIR, "events-poller-heartbeat.log");

const POLL_INTERVAL_MS = 10_000; // base interval
const POLL_INTERVAL_MAX_MS = 60_000; // backoff ceiling
const HEARTBEAT_INTERVAL_MS = 60_000;

// ---- env loader ----
async function loadEnv() {
  if (!existsSync(ENV_FILE)) {
    throw new Error(`No .env.local at ${ENV_FILE}`);
  }
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

async function ensureDirs() {
  await fs.mkdir(POLLER_DIR, { recursive: true });
  await fs.mkdir(TELEGRAM_OUTBOX, { recursive: true });
}

async function log(msg) {
  const stamp = new Date().toISOString();
  const line = `[${stamp}] ${msg}\n`;
  process.stdout.write(line);
  await fs.appendFile(path.join(POLLER_DIR, "events-poller.log"), line);
}

async function heartbeat() {
  await fs.appendFile(
    HEARTBEAT_FILE,
    `${new Date().toISOString()} alive\n`
  );
}

// ---- supabase REST helper ----
let SUPABASE_URL, SUPABASE_KEY;

async function sbGet(query) {
  const url = `${SUPABASE_URL}/rest/v1/${query}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase GET ${query}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function sbPatch(query, payload) {
  const url = `${SUPABASE_URL}/rest/v1/${query}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      `Supabase PATCH ${query}: ${res.status} ${await res.text()}`
    );
  }
}

// ---- write outbound message to telegram outbox ----
async function queueTelegramMessage({ chat_id, text, parse_mode = "MarkdownV2", reply_markup, urgency }) {
  const filename = `${Date.now()}-events.json`;
  const filepath = path.join(TELEGRAM_OUTBOX, filename);
  await fs.writeFile(
    filepath,
    JSON.stringify(
      {
        chat_id,
        text,
        parse_mode,
        reply_markup,
        urgency: urgency ?? "P2",
        queued_at: new Date().toISOString(),
        sent_at: null,
      },
      null,
      2
    )
  );
}

// ---- master log appender ----
async function appendMasterLog(text) {
  try {
    await fs.appendFile(MASTER_LOG, `${text}\n`);
  } catch (err) {
    await log(`MASTER_LOG append failed: ${err.message}`);
  }
}

// ---- escape MarkdownV2 ----
function escapeMd(text) {
  return String(text).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

// ---- per-event-kind handlers ----

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // loaded at startup

async function handleCustomerDepositPaid(event) {
  const slug = event.payload?.slug ?? "unknown";
  const sku = event.payload?.sku ?? "unknown";
  const amount = event.payload?.amount ?? 0;

  await appendMasterLog(
    `[${new Date().toISOString()}] customer-deposit-paid → slug: ${slug}, sku: ${sku}, amount: $${amount}`
  );

  if (TELEGRAM_CHAT_ID) {
    await queueTelegramMessage({
      chat_id: TELEGRAM_CHAT_ID,
      text: `💰 *New customer paid*\n\n${escapeMd(slug)} — ${escapeMd(sku)} \\($${escapeMd(amount)}\\)\n\nBuild starting\\. First preview ETA \\~2h\\.`,
      urgency: "P1",
    });
  }
}

async function handleIntakeReceived(event) {
  const slug = event.payload?.slug ?? "unknown";
  const confidence = event.payload?.confidence ?? 0;

  await appendMasterLog(
    `[${new Date().toISOString()}] intake-received → slug: ${slug}, confidence: ${confidence}`
  );

  if (TELEGRAM_CHAT_ID) {
    await queueTelegramMessage({
      chat_id: TELEGRAM_CHAT_ID,
      text: `📝 *Intake submitted*\n\n${escapeMd(slug)} \\(confidence ${escapeMd(confidence)}\\)\n\nKickoff call scheduling next\\.`,
      urgency: "P2",
    });
  }
}

async function handleCalBookingCreated(event) {
  const slug = event.payload?.slug ?? "unknown";
  const start = event.payload?.start_time ?? "unknown";

  await appendMasterLog(
    `[${new Date().toISOString()}] cal-booking-created → slug: ${slug}, start: ${start}`
  );

  if (TELEGRAM_CHAT_ID) {
    await queueTelegramMessage({
      chat_id: TELEGRAM_CHAT_ID,
      text: `📅 *Kickoff booked*\n\n${escapeMd(slug)} for ${escapeMd(start)}`,
      urgency: "P2",
    });
  }
}

async function handleCalMeetingEnded(event) {
  const slug = event.payload?.slug ?? "unknown";
  await appendMasterLog(
    `[${new Date().toISOString()}] cal-meeting-ended → slug: ${slug} (14-day clock starts)`
  );

  if (TELEGRAM_CHAT_ID) {
    await queueTelegramMessage({
      chat_id: TELEGRAM_CHAT_ID,
      text: `⏱️ *Kickoff complete — clock starts*\n\n${escapeMd(slug)}\n\n14\\-day build begins now\\.`,
      urgency: "P1",
    });
  }
}

async function handleCustomerRefunded(event) {
  await appendMasterLog(
    `[${new Date().toISOString()}] customer-refunded → ${JSON.stringify(event.payload)}`
  );

  if (TELEGRAM_CHAT_ID) {
    await queueTelegramMessage({
      chat_id: TELEGRAM_CHAT_ID,
      text: `↩️ *Refund processed*\n\nDetails in events table\\.`,
      urgency: "P0",
    });
  }
}

async function handleCustomerReplyReceived(event) {
  const slug = event.payload?.slug ?? "lead-inbox";
  const subject = event.payload?.subject ?? "(no subject)";
  const classification = event.payload?.classification ?? "general";
  const confidence = event.payload?.confidence ?? 0;
  const isComplaint = event.payload?.is_complaint === true;
  const isSpam = event.payload?.is_spam === true;
  const dossierPath = event.payload?.dossier_path ?? "(no path)";

  await appendMasterLog(
    `[${new Date().toISOString()}] customer-reply-received → slug: ${slug}, tag: ${classification}, confidence: ${confidence}`
  );

  // Spam is silent
  if (isSpam) return;

  if (TELEGRAM_CHAT_ID) {
    const urgency = isComplaint ? "P0" : classification === "needs-human-review" ? "P1" : "P2";
    const icon = isComplaint ? "🚨" : classification === "change-request" ? "🔄" : "✉️";

    await queueTelegramMessage({
      chat_id: TELEGRAM_CHAT_ID,
      text:
        `${icon} *Customer reply* \\(${escapeMd(classification)}\\)\n\n` +
        `${escapeMd(slug)}: ${escapeMd(subject.slice(0, 60))}\n\n` +
        `Draft is in 04\\-feedback\\.md ready for your review\\.`,
      urgency,
    });
  }
}

// ---- dispatch table ----
const HANDLERS = {
  "customer-deposit-paid": handleCustomerDepositPaid,
  "intake-received": handleIntakeReceived,
  "cal-booking_created": handleCalBookingCreated,
  "cal-meeting_ended": handleCalMeetingEnded,
  "customer-refunded": handleCustomerRefunded,
  "customer-reply-received": handleCustomerReplyReceived,
  // Add more handlers as needed; unknown kinds are silently acknowledged
};

// ---- dispatch loop ----
// Returns "active" | "empty" | "error" so the scheduler can adapt.
async function dispatchLoop() {
  try {
    // Fetch unprocessed events (limit 20 per cycle)
    const events = await sbGet(
      `events?processed_at=is.null&order=created_at.asc&limit=20`
    );

    if (events.length === 0) return "empty";

    for (const event of events) {
      const handler = HANDLERS[event.kind];
      if (handler) {
        try {
          await handler(event);
        } catch (err) {
          await log(`Handler ${event.kind} failed: ${err.message}`);
          // Mark with processed_by=ERROR so we can find + replay
          await sbPatch(`events?id=eq.${event.id}`, {
            processed_at: new Date().toISOString(),
            processed_by: "events-poller:ERROR",
          });
          continue;
        }
      }

      // Mark processed (even if no handler — acknowledge)
      await sbPatch(`events?id=eq.${event.id}`, {
        processed_at: new Date().toISOString(),
        processed_by: handler ? "events-poller" : "events-poller:no-handler",
      });
    }

    await log(`Processed ${events.length} event(s)`);
    return "active";
  } catch (err) {
    await log(`Dispatch loop error: ${err.message}`);
    return "error";
  }
}

// ---- adaptive poll scheduler ----
// 10s base; doubles after consecutive empty polls (10 → 20 → 40 → 60s cap).
// Resets to 10s on activity, and on recovery after an error (so a flaky
// Supabase connection doesn't leave us stuck at the slow end).
let currentIntervalMs = POLL_INTERVAL_MS;
let lastOutcomeWasError = false;

function nextInterval(outcome) {
  if (outcome === "active") {
    lastOutcomeWasError = false;
    return POLL_INTERVAL_MS;
  }
  if (outcome === "error") {
    lastOutcomeWasError = true;
    return POLL_INTERVAL_MS;
  }
  // empty poll
  if (lastOutcomeWasError) {
    // first clean poll after an error — error recovery, reset to base
    lastOutcomeWasError = false;
    return POLL_INTERVAL_MS;
  }
  return Math.min(currentIntervalMs * 2, POLL_INTERVAL_MAX_MS);
}

function schedulePoll() {
  setTimeout(async () => {
    const outcome = await dispatchLoop();
    const previous = currentIntervalMs;
    currentIntervalMs = nextInterval(outcome);
    if (currentIntervalMs !== previous) {
      await log(
        `Poll interval ${previous / 1000}s → ${currentIntervalMs / 1000}s (${outcome})`
      );
    }
    schedulePoll();
  }, currentIntervalMs);
}

// ---- main ----
async function main() {
  await ensureDirs();
  const env = await loadEnv();
  SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
  SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.TELEGRAM_CHAT_ID = env.TELEGRAM_CHAT_ID; // populate for handlers

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env.local"
    );
  }

  await log(`Events poller starting (poll ${POLL_INTERVAL_MS}ms)`);

  // Required: the events table needs the `processed_at` + `processed_by` columns
  // The bootstrap script + base schema doesn't include them yet; check + warn
  try {
    await sbGet(`events?select=processed_at&limit=1`);
  } catch (err) {
    await log(
      `WARNING: events.processed_at column missing. Run this SQL in Supabase:\n` +
        `  ALTER TABLE events ADD COLUMN IF NOT EXISTS processed_at timestamptz;\n` +
        `  ALTER TABLE events ADD COLUMN IF NOT EXISTS processed_by text;`
    );
  }

  setInterval(heartbeat, HEARTBEAT_INTERVAL_MS); // heartbeat stays flat 60s

  const firstOutcome = await dispatchLoop(); // immediate first pass
  currentIntervalMs = nextInterval(firstOutcome);
  schedulePoll(); // adaptive 10s→60s backoff loop
  await heartbeat();

  await log("Events poller running.");
}

main().catch(async (err) => {
  await log(`FATAL: ${err.message}`);
  process.exit(1);
});
