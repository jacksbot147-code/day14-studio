#!/usr/bin/env node
/**
 * expansion-prompter.mjs
 *
 * Every 2 hours: analyzes the empire's current state and sends Jack a list
 * of SUGGESTED MESSAGES he can send the bot to expand the system.
 *
 * Not vague suggestions — actual copy-paste-able prompts.
 *
 * Output format (Telegram):
 *   "💭 Suggested next moves:
 *    1. *bootstrap-pitch <id>* — launch the menopause-partner niche
 *    2. Try: 'build me a skill that auto-tags Etsy reviews with sentiment'
 *    3. Try: 'spin up a course business teaching Excel to perimenopausal women'
 *    ..."
 *
 * Each suggestion is something Jack can literally paste back.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const STUDIO = path.join(HOME, "Documents/studio");
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const OPPS_DIR = path.join(SHARED, "opportunities");
const SKILLS_DRAFTS = path.join(STUDIO, "docs/seeds/skills/_drafts");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const STATE_FILE = path.join(SHARED, "founder-ops/expansion-prompter-state.json");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const LOG_FILE = path.join(SHARED, "poller/expansion-prompter.log");
const HEARTBEAT_FILE = path.join(SHARED, "poller/expansion-prompter-heartbeat.log");
const ENV_FILE = path.join(STUDIO, ".env.local");
const GEMINI_MODEL = "gemini-2.5-flash";

const POLL_INTERVAL_MS = 2 * 60 * 60_000; // 2hr
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

async function callGemini(prompt, env) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.85, maxOutputTokens: 2000 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function loadContext() {
  const ctx = { tenants: [], opps: [], drafts: [] };
  if (existsSync(TENANTS_FILE)) {
    ctx.tenants = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];
  }
  if (existsSync(OPPS_DIR)) {
    for (const f of await fs.readdir(OPPS_DIR)) {
      if (!f.endsWith(".json")) continue;
      try { ctx.opps.push(JSON.parse(await fs.readFile(path.join(OPPS_DIR, f), "utf8"))); } catch {}
    }
  }
  if (existsSync(SKILLS_DRAFTS)) {
    const entries = await fs.readdir(SKILLS_DRAFTS, { withFileTypes: true });
    ctx.drafts = entries.filter((e) => e.isDirectory() && !e.name.startsWith("_")).map((e) => e.name);
  }
  return ctx;
}

async function cycle() {
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) { await log("no GEMINI_API_KEY"); return; }
  if (!env.TELEGRAM_CHAT_ID) { await log("no TELEGRAM_CHAT_ID"); return; }

  const ctx = await loadContext();
  const pendingOpps = ctx.opps.filter((o) => o.status === "open" && o.pitched).slice(0, 5);
  const skipped = ctx.opps.filter((o) => o.status === "skipped").length;
  const launched = ctx.opps.filter((o) => o.status === "launching").length;

  const prompt = `You are Day14's bot suggesting next moves to Jack. Generate 5 SPECIFIC, COPY-PASTABLE prompts he can send back. Make them concrete, niche, and pull on the current state.

CURRENT STATE:
- ${ctx.tenants.length} tenants: ${ctx.tenants.map((t) => `${t.slug}(${t.type})`).join(", ")}
- ${ctx.opps.length} opportunities total (${pendingOpps.length} pitched, ${launched} launching, ${skipped} skipped)
- ${ctx.drafts.length} skill drafts in queue

TOP PENDING PITCHES:
${pendingOpps.map((o) => `  - ${o.id || o.niche} (score ${o.total_score}): ${o.niche}`).join("\n")}

Generate 5 suggested next-action messages. Mix of:
- Pitched opps to launch (use \`bootstrap-pitch <id>\`)
- Skill ideas he could request (use plain English, e.g. "build me a skill that...")
- New business niches to explore (use plain English, e.g. "spin up a [archetype] in [niche]")
- Workflow improvements ("make the daily-engine also generate matching tee designs")
- Cross-tenant moves ("apply hot-flash-co's content engine to a new niche")

Each suggestion 1-2 lines max. Make them spicy + specific. Be opinionated.

Return STRICT JSON:
{
  "suggestions": [
    { "label": "short title (4-8 words)", "prompt": "exact text Jack should send to bot", "why": "1-sentence reasoning" },
    ... 5 entries
  ]
}`;

  let parsed;
  try {
    const raw = await callGemini(prompt, env);
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
    parsed = JSON.parse(cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1));
  } catch (err) {
    await log(`parse error: ${err.message}`);
    return;
  }

  const lines = [
    `💭 *Suggested next moves*`,
    ``,
    ...parsed.suggestions.map((s, i) =>
      `${i + 1}. *${s.label}*\n   _${s.why}_\n   \`${s.prompt}\``
    ),
    ``,
    `Tap to copy any prompt + send. The bot handles the rest.`,
  ];
  await fs.mkdir(OUTBOX, { recursive: true });
  await fs.writeFile(
    path.join(OUTBOX, `${Date.now()}-expansion-prompter.json`),
    JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: lines.join("\n"),
      parse_mode: "Markdown",
      urgency: "P3",
      queued_at: new Date().toISOString(),
      sent_at: null,
    }, null, 2)
  );
  await log(`pushed ${parsed.suggestions.length} suggestions`);
}

async function main() {
  await log("expansion-prompter starting");
  setInterval(cycle, POLL_INTERVAL_MS);
  setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  await cycle();
  await heartbeat();
  await log("running every 2hr");
}

main().catch(async (err) => { await log(`FATAL: ${err.message}`); process.exit(1); });
