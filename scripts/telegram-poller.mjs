#!/usr/bin/env node
/**
 * telegram-poller.mjs
 *
 * Day14 OS — Telegram bridge poller.
 *
 * Long-running Node script that:
 *   1. Polls Telegram for new messages → writes to telegram/inbox/
 *   2. Watches telegram/outbox/ for queued outbound → posts to Telegram
 *   3. Self-restarts on crash (with launchd / pm2)
 *
 * Run: node ~/Documents/studio/scripts/telegram-poller.mjs
 * Or via launchctl (see install-telegram-poller.sh)
 *
 * Requires env vars:
 *   TELEGRAM_BOT_TOKEN — from @BotFather
 *   TELEGRAM_CHAT_ID — Jack's chat ID (only this chat is allowed to interact)
 *
 * Reads from `~/Documents/studio/.env.local` if present.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';

// ---- config ----
const TELEGRAM_DIR = path.join(homedir(), 'Documents/businesses/_shared/telegram');
const INBOX_DIR = path.join(TELEGRAM_DIR, 'inbox');
const OUTBOX_DIR = path.join(TELEGRAM_DIR, 'outbox');
const PROCESSED_DIR = path.join(TELEGRAM_DIR, 'processed');
const LOG_FILE = path.join(TELEGRAM_DIR, 'poller.log');
const POLLER_DIR = path.join(homedir(), 'Documents/businesses/_shared/poller');
const HEARTBEAT_FILE = path.join(POLLER_DIR, 'telegram-poller-heartbeat.log');
const ENV_FILE = path.join(homedir(), 'Documents/studio/.env.local');

const POLL_INTERVAL_MS = 5_000;
const OUTBOX_SCAN_INTERVAL_MS = 2_000;
const HEARTBEAT_INTERVAL_MS = 60_000;

// ---- env loader (minimal, no deps) ----
async function loadEnv() {
  if (!existsSync(ENV_FILE)) {
    throw new Error(`No .env.local at ${ENV_FILE}`);
  }
  const text = await fs.readFile(ENV_FILE, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) {
      env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return env;
}

// ---- ensure dirs ----
async function ensureDirs() {
  for (const d of [TELEGRAM_DIR, INBOX_DIR, OUTBOX_DIR, PROCESSED_DIR, POLLER_DIR]) {
    await fs.mkdir(d, { recursive: true });
  }
}

// ---- heartbeat for dashboard health checks ----
async function heartbeat() {
  await fs.appendFile(HEARTBEAT_FILE, `${new Date().toISOString()} alive\n`);
}

// ---- inbox dispatcher: turn /commands and freeform text into actions ----
const COMMAND_REPLIES = {
  '/help': (
    'Day14 OS commands:\n' +
    '/brief — morning briefing now\n' +
    '/risk — churn risk report\n' +
    '/ltv — LTV report\n' +
    '/uptime — site uptime check\n' +
    '/energy [N] — log energy 1-10\n' +
    '/focus [min] — start a focus block\n' +
    '/decisions — today\'s decision count\n' +
    '/flush — weekly priorities flush\n' +
    '/empire — empire growth metrics\n' +
    '/status — system health\n' +
    '/tenants — list all your businesses\n' +
    '/switch SLUG — focus on one business\n' +
    '/new-tenant TEMPLATE SLUG NAME — create new business\n' +
    '/help — this list'
  ),
};

async function transcribeVoiceMessage(fileId) {
  // Spawn the transcribe script and capture stdout
  const { spawn } = await import('node:child_process');
  return new Promise((resolve) => {
    const child = spawn('node', [
      path.join(homedir(), 'Documents/studio/scripts/transcribe-voice.mjs'),
      '--file-id', fileId,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      if (code === 0 && out.trim()) {
        resolve({ ok: true, transcript: out.trim() });
      } else {
        resolve({ ok: false, error: err.trim() || `exit ${code}` });
      }
    });
    // Hard timeout: 30s
    setTimeout(() => {
      try { child.kill(); } catch {}
      resolve({ ok: false, error: 'timeout' });
    }, 30_000);
  });
}

async function processInbox() {
  let files;
  try {
    files = await fs.readdir(INBOX_DIR);
  } catch {
    return;
  }
  files = files.filter(f => f.endsWith('.json')).sort();

  for (const filename of files) {
    const filepath = path.join(INBOX_DIR, filename);
    let msg;
    try {
      msg = JSON.parse(await fs.readFile(filepath, 'utf8'));
    } catch {
      continue;
    }

    if (msg.processed) continue;

    let text = (msg.text || msg.callback_data || '').trim();

    // ---- Voice message handling: transcribe and treat as text ----
    if (!text && msg.voice?.file_id) {
      await log(`voice message detected (${msg.voice.duration || '?'}s) — transcribing`);
      const result = await transcribeVoiceMessage(msg.voice.file_id);
      if (result.ok && result.transcript) {
        text = result.transcript;
        msg.transcript = text;
        msg.voice_transcribed_at = new Date().toISOString();
        await log(`transcribed: "${text.slice(0, 80)}"`);
        // Ack the user that we got + transcribed their voice
        const ackFile = `${Date.now()}-voice-ack.json`;
        await fs.writeFile(
          path.join(OUTBOX_DIR, ackFile),
          JSON.stringify({
            chat_id: msg.chat?.id,
            text: `🎤 _"${text.length > 60 ? text.slice(0, 60) + '...' : text}"_\n\nWorking on it...`,
            parse_mode: 'Markdown',
            urgency: 'P3',
            queued_at: new Date().toISOString(),
            sent_at: null,
          }, null, 2)
        );
      } else {
        await log(`voice transcription failed: ${result.error}`);
        const errFile = `${Date.now()}-voice-err.json`;
        await fs.writeFile(
          path.join(OUTBOX_DIR, errFile),
          JSON.stringify({
            chat_id: msg.chat?.id,
            text: `🎤 Couldn't transcribe your voice note: ${result.error}. Try typing it instead?`,
            parse_mode: 'Markdown',
            urgency: 'P3',
            queued_at: new Date().toISOString(),
            sent_at: null,
          }, null, 2)
        );
        msg.processed = true;
        msg.processed_reason = 'voice_transcription_failed';
        await fs.writeFile(filepath, JSON.stringify(msg, null, 2));
        await fs.rename(filepath, path.join(PROCESSED_DIR, filename));
        continue;
      }
    }

    if (!text) {
      msg.processed = true;
      msg.processed_reason = 'no_text';
      await fs.writeFile(filepath, JSON.stringify(msg, null, 2));
      await fs.rename(filepath, path.join(PROCESSED_DIR, filename));
      continue;
    }

    let reply = null;

    if (text.startsWith('/')) {
      // Command path
      const parts = text.split(/\s+/);
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      if (COMMAND_REPLIES[command]) {
        reply = COMMAND_REPLIES[command];
      } else if (command === '/energy' && args[0]) {
        // Quick local handling: log energy from chat
        await logEnergyFromChat(args[0], args[1]);
        reply = `✓ Logged energy ${args[0]}/10${args[1] ? `, mood ${args[1]}/5` : ''}`;
      } else if (command === '/status') {
        reply = 'Open the dashboard: http://localhost:3000/dashboard/system';
      } else if (command === '/empire' || command === '/dashboard' || command === '/quest') {
        try {
          const { spawnSync } = await import('node:child_process');
          const scriptPath = path.join(homedir(), 'Documents/studio/scripts/gamified-dashboard.mjs');
          const r = spawnSync('node', [scriptPath], { encoding: 'utf8' });
          if (r.status === 0) {
            const { spawn } = await import('node:child_process');
            spawn('open', [path.join(homedir(), 'Documents/businesses/_shared/empire.html')], { detached: true, stdio: 'ignore' }).unref();
            reply = `⚔️ *Empire dashboard launched*\n\nIf it didn't auto-open: \`open ~/Documents/businesses/_shared/empire.html\``;
          } else {
            reply = `dashboard error: ${(r.stderr || r.stdout).slice(0, 200)}`;
          }
        } catch (e) {
          reply = `dashboard error: ${e.message}`;
        }
      } else if (command === '/priority' || command === '/today') {
        // Top priorities across all tenants
        try {
          const { spawnSync } = await import('node:child_process');
          const scriptPath = path.join(homedir(), 'Documents/studio/scripts/priority-allocator.mjs');
          const r = spawnSync('node', [scriptPath], { encoding: 'utf8' });
          reply = '*Top priorities*\n\n```\n' + (r.stdout || 'all clear').slice(0, 2500) + '\n```';
        } catch (e) {
          reply = `priority error: ${e.message}`;
        }
      } else if (command === '/tenants') {
        // List active tenants from registry
        try {
          const registryPath = path.join(homedir(), 'Documents/businesses/_shared/tenants.json');
          const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));
          const active = registry.tenants.filter(t => t.status === 'active');
          if (active.length === 0) {
            reply = 'No active tenants yet. Use /new-tenant to create one.';
          } else {
            const totalMrr = active.reduce((s, t) => s + (t.billing?.monthly_amount || 0), 0);
            const lines = active.map(t => `• \`${t.slug}\` — ${t.name} ($${t.billing?.monthly_amount || 0}/mo)`);
            reply = `*Tenants (${active.length} active, $${totalMrr.toLocaleString()}/mo total)*\n\n${lines.join('\n')}\n\nDashboard: http://localhost:3000/dashboard/tenants`;
          }
        } catch (e) {
          reply = `Couldn't read tenant registry: ${e.message}`;
        }
      } else if (command === '/new-tenant') {
        // /new-tenant TEMPLATE SLUG NAME-WITH-DASHES
        const [tmpl, slug, ...nameParts] = args;
        if (!tmpl || !slug || nameParts.length === 0) {
          reply = 'Usage: /new-tenant TEMPLATE SLUG NAME\nExample: /new-tenant marine-services naples-boats Naples Boat Detailing\nTry /tenants to see templates first.';
        } else {
          // Spawn new-tenant.mjs detached
          const { spawn } = await import('node:child_process');
          const scriptPath = path.join(homedir(), 'Documents/studio/scripts/new-tenant.mjs');
          const child = spawn('node', [
            scriptPath,
            '--template', tmpl,
            '--slug', slug,
            '--name', nameParts.join(' '),
          ], { detached: true, stdio: 'ignore' });
          child.unref();
          reply = `🌱 Scaffolding new tenant \`${slug}\` from template \`${tmpl}\`... You'll get a confirmation message.`;
        }
      } else if (command === '/switch') {
        const targetSlug = args[0];
        if (!targetSlug) {
          reply = 'Usage: /switch SLUG (or /switch off to clear)\nTry /tenants to see options.';
        } else {
          const stateFile = path.join(homedir(), 'Documents/businesses/_shared/founder-ops/active-tenant.json');
          await fs.mkdir(path.dirname(stateFile), { recursive: true });
          let state = {};
          try {
            state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
          } catch { /* empty */ }
          const chatKey = String(msg.chat?.id);
          if (targetSlug === 'off') {
            delete state[chatKey];
            reply = '✓ Cleared active tenant. Now in multi-business mode.';
          } else {
            state[chatKey] = {
              tenant_slug: targetSlug,
              set_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 3600000).toISOString(),
            };
            reply = `✓ Now in: \`${targetSlug}\` (expires in 1 hour)`;
          }
          await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
        }
      } else {
        // Anything else: queue a work-register entry so the next dispatch
        // catches it. The TypeScript dispatch.ts has the full route table;
        // we just log the intent here.
        await fs.appendFile(
          path.join(homedir(), 'Documents/businesses/_shared/growth/work-register.jsonl'),
          JSON.stringify({
            timestamp: new Date().toISOString(),
            action_phrase: `telegram command ${command} ${args.join(' ')}`,
            context: 'telegram-bridge',
            is_ad_hoc: false,
            notes: 'inbox dispatch queued',
          }) + '\n'
        );
        reply = `Got "${command}". Routing to the empire — check the dashboard.`;
      }
    } else {
      // First: check for approval-pattern replies (approve X / skip Y / publish Z / bootstrap now)
      try {
        const { handle: handleApproval } = await import(
          path.join(homedir(), 'Documents/studio/scripts/approval-handler.mjs')
        );
        const approvalResult = await handleApproval(text);
        if (approvalResult) {
          reply = approvalResult.ok ? `✓ ${approvalResult.reason}` : `✗ ${approvalResult.reason}`;
          // Queue the reply and continue to next message
          const replyFile = `${Date.now()}-reply-${msg.message_id || 'cb'}.json`;
          await fs.writeFile(
            path.join(OUTBOX_DIR, replyFile),
            JSON.stringify({
              chat_id: msg.chat?.id,
              text: reply,
              parse_mode: 'Markdown',
              urgency: 'P3',
              queued_at: new Date().toISOString(),
              sent_at: null,
              in_reply_to: msg.message_id,
            }, null, 2)
          );
          msg.processed_at = new Date().toISOString();
          msg.processed_reason = 'approval-handler';
          await fs.writeFile(filepath, JSON.stringify(msg, null, 2));
          await fs.rename(filepath, path.join(PROCESSED_DIR, filename));
          continue;
        }
      } catch (apErr) {
        await log(`approval-handler error: ${apErr.message}`);
      }

      // Otherwise route through bot-brain (intent classifier + Q&A + chat).
      // The brain answers questions inline; for commands/multi-step it spawns idea-worker.
      try {
        const { processIncomingMessage } = await import(
          path.join(homedir(), 'Documents/studio/scripts/bot-brain.mjs')
        );
        const result = await processIncomingMessage(text, { chatId: msg.chat?.id });
        reply = result.reply;
        await log(`bot-brain → intent=${result.intent?.intent} action=${result.action}`);

        // For complex multi-step commands, also spawn idea-worker to actually execute
        if (result.intent?.intent === 'command' && result.intent?.confidence >= 0.7) {
          const { spawn } = await import('node:child_process');
          const workerPath = path.join(homedir(), 'Documents/studio/scripts/idea-worker.mjs');
          const child = spawn('node', [workerPath, '--idea', text, '--chat-id', String(msg.chat?.id ?? '')], {
            detached: true,
            stdio: 'ignore',
          });
          child.unref();
          await log(`spawned idea-worker (pid ${child.pid}) for command execution`);
        }

        await fs.appendFile(
          path.join(homedir(), 'Documents/businesses/_shared/growth/work-register.jsonl'),
          JSON.stringify({
            timestamp: new Date().toISOString(),
            action_phrase: `telegram freeform: ${text.slice(0, 100)}`,
            context: 'telegram-bridge',
            is_ad_hoc: false,
            notes: `bot-brain handled — intent=${result.intent?.intent}`,
          }) + '\n'
        );
      } catch (brainErr) {
        await log(`bot-brain failed, falling back to idea-worker: ${brainErr.message}`);
        const { spawn } = await import('node:child_process');
        const workerPath = path.join(homedir(), 'Documents/studio/scripts/idea-worker.mjs');
        const child = spawn('node', [workerPath, '--idea', text, '--chat-id', String(msg.chat?.id ?? '')], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
        reply = null; // worker will queue its own
      }
    }

    // Queue the reply
    if (reply) {
      const replyFile = `${Date.now()}-reply-${msg.message_id || 'cb'}.json`;
      await fs.writeFile(
        path.join(OUTBOX_DIR, replyFile),
        JSON.stringify(
          {
            chat_id: msg.chat?.id,
            text: reply,
            parse_mode: 'Markdown',
            urgency: 'P3',
            queued_at: new Date().toISOString(),
            sent_at: null,
            in_reply_to: msg.message_id,
          },
          null,
          2
        )
      );
    }

    // Mark processed + sweep
    msg.processed = true;
    msg.processed_at = new Date().toISOString();
    msg.processed_reply = reply ? reply.slice(0, 80) : null;
    await fs.writeFile(filepath, JSON.stringify(msg, null, 2));
    await fs.rename(filepath, path.join(PROCESSED_DIR, filename));
    await log(`processed inbox: "${text.slice(0, 50)}" → "${(reply || '').slice(0, 40)}"`);
  }
}

async function logEnergyFromChat(energyStr, moodStr) {
  const energy = parseInt(energyStr, 10);
  const mood = moodStr ? parseInt(moodStr, 10) : 4;
  if (Number.isNaN(energy) || energy < 1 || energy > 10) return;
  const founderDir = path.join(homedir(), 'Documents/businesses/_shared/founder-ops');
  await fs.mkdir(founderDir, { recursive: true });
  await fs.appendFile(
    path.join(founderDir, 'energy-log.jsonl'),
    JSON.stringify({
      date: new Date().toISOString().slice(0, 10),
      energy,
      mood,
      note: '',
      timestamp: new Date().toISOString(),
      source: 'telegram',
    }) + '\n'
  );
}

// ---- logging ----
async function log(msg) {
  const stamp = new Date().toISOString();
  const line = `[${stamp}] ${msg}\n`;
  process.stdout.write(line);
  await fs.appendFile(LOG_FILE, line);
}

// ---- telegram API ----
let TOKEN, CHAT_ID, lastUpdateId = 0;

async function tgApi(method, params = {}) {
  const url = `https://api.telegram.org/bot${TOKEN}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`Telegram API ${method} failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  if (!json.ok) {
    throw new Error(`Telegram API ${method} error: ${json.description}`);
  }
  return json.result;
}

// ---- inbound polling ----
async function pollInbox() {
  try {
    const updates = await tgApi('getUpdates', {
      offset: lastUpdateId + 1,
      timeout: 0,
      allowed_updates: ['message', 'callback_query'],
    });

    for (const update of updates) {
      lastUpdateId = update.update_id;

      // Only accept from configured chat (silent reject anyone else)
      const fromChat = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;
      if (String(fromChat) !== String(CHAT_ID)) {
        await log(`IGNORED message from unauthorized chat ${fromChat}`);
        continue;
      }

      // Write to inbox
      const ts = Date.now();
      const id = update.message?.message_id ?? update.callback_query?.id ?? 'unknown';
      const filename = `${ts}-${id}.json`;
      const filepath = path.join(INBOX_DIR, filename);

      const payload = {
        message_id: update.message?.message_id,
        callback_query_id: update.callback_query?.id,
        callback_data: update.callback_query?.data,
        from: update.message?.from ?? update.callback_query?.from,
        chat: update.message?.chat ?? update.callback_query?.message?.chat,
        date: update.message?.date,
        text: update.message?.text,
        voice: update.message?.voice,
        photo: update.message?.photo,
        document: update.message?.document,
        received_at: new Date().toISOString(),
        processed: false,
      };

      await fs.writeFile(filepath, JSON.stringify(payload, null, 2));
      await log(`INBOX: ${filename} (text: ${(payload.text ?? payload.callback_data ?? '<binary>').slice(0, 60)})`);

      // Acknowledge callbacks quickly so Telegram doesn't show "loading"
      if (update.callback_query) {
        try {
          await tgApi('answerCallbackQuery', {
            callback_query_id: update.callback_query.id,
            text: 'Got it.',
          });
        } catch (e) {
          await log(`ERROR ack callback: ${e.message}`);
        }
      }
    }
  } catch (err) {
    await log(`ERROR poll: ${err.message}`);
  }
}

// ---- outbound sending ----
async function processOutbox() {
  let files;
  try {
    files = await fs.readdir(OUTBOX_DIR);
  } catch {
    return;
  }
  files = files.filter(f => f.endsWith('.json')).sort();

  for (const filename of files) {
    const filepath = path.join(OUTBOX_DIR, filename);
    let payload;
    try {
      payload = JSON.parse(await fs.readFile(filepath, 'utf8'));
    } catch (e) {
      await log(`ERROR parse outbox ${filename}: ${e.message}`);
      continue;
    }

    if (payload.sent_at) continue; // already sent

    try {
      const result = await tgApi('sendMessage', {
        chat_id: payload.chat_id ?? CHAT_ID,
        text: payload.text,
        parse_mode: payload.parse_mode ?? 'MarkdownV2',
        reply_markup: payload.reply_markup,
        disable_notification: payload.urgency === 'P3',
      });

      payload.sent_at = new Date().toISOString();
      payload.sent_status = 'sent';
      payload.telegram_message_id = result.message_id;

      await fs.writeFile(filepath, JSON.stringify(payload, null, 2));
      await log(`OUTBOX SENT: ${filename}`);
    } catch (err) {
      await log(`ERROR send ${filename}: ${err.message}`);
      payload.sent_status = 'error';
      payload.error_message = err.message;
      await fs.writeFile(filepath, JSON.stringify(payload, null, 2));
    }
  }
}

// ---- main loop ----
async function main() {
  await ensureDirs();
  const env = await loadEnv();
  TOKEN = env.TELEGRAM_BOT_TOKEN;
  CHAT_ID = env.TELEGRAM_CHAT_ID;

  if (!TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN missing from .env.local');
  }
  if (!CHAT_ID) {
    throw new Error('TELEGRAM_CHAT_ID missing from .env.local — send /start to your bot first, find chat ID via /getUpdates');
  }

  await log(`Telegram poller starting (poll ${POLL_INTERVAL_MS}ms, outbox ${OUTBOX_SCAN_INTERVAL_MS}ms)`);
  await log(`Inbox: ${INBOX_DIR}`);
  await log(`Outbox: ${OUTBOX_DIR}`);

  // initial scans to clear backlog
  await processOutbox();
  await processInbox();
  await heartbeat();

  setInterval(pollInbox, POLL_INTERVAL_MS);
  setInterval(processOutbox, OUTBOX_SCAN_INTERVAL_MS);
  setInterval(processInbox, OUTBOX_SCAN_INTERVAL_MS);
  setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

  await log('Telegram poller running (inbox dispatch + outbox sender active).');
}

main().catch(async (err) => {
  await log(`FATAL: ${err.message}`);
  process.exit(1);
});
