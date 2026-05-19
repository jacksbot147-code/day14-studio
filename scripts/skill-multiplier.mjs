#!/usr/bin/env node
/**
 * skill-multiplier.mjs
 *
 * Cross-tenant skill propagation. Runs daily.
 *
 *   1. Scans scripts/ for tenant-specific files (pattern: <slug>-<purpose>.mjs)
 *   2. Groups by purpose: e.g., {daily-engine: [hot-flash-co-*, quiet-revolt-*]}
 *   3. When 2+ tenants have the same purpose-script, generalize to scripts/_generic/<purpose>.mjs
 *      that reads TENANT from CLI arg / env var
 *   4. Generates wrapper "shim" scripts for existing tenants (back-compat)
 *   5. Telegram-pings: "Generalized N skills, now available for all tenants"
 *
 * Effect: skills earned in one business propagate to ALL businesses automatically.
 * Like genetic recombination for an organizational nervous system.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const STUDIO = path.join(HOME, "Documents/studio");
const SCRIPTS = path.join(STUDIO, "scripts");
const GENERIC = path.join(SCRIPTS, "_generic");
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const SHARED_OUTBOX = path.join(SHARED, "telegram/outbox");
const STATE_FILE = path.join(SHARED, "founder-ops/skill-multiplier-state.json");
const LOG_FILE = path.join(SHARED, "poller/skill-multiplier.log");
const HEARTBEAT_FILE = path.join(SHARED, "poller/skill-multiplier-heartbeat.log");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const ENV_FILE = path.join(STUDIO, ".env.local");

const POLL_INTERVAL_MS = 24 * 60 * 60_000; // daily
const HEARTBEAT_INTERVAL_MS = 60_000;
const GEMINI_MODEL = "gemini-2.5-flash";

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
  if (!existsSync(STATE_FILE)) return { generalized: [], last_cycle: null };
  return JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
}

async function saveState(s) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(s, null, 2));
}

async function listTenants() {
  if (!existsSync(TENANTS_FILE)) return [];
  return JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];
}

/**
 * Groups tenant-specific scripts by their "purpose" suffix.
 * E.g. hot-flash-co-daily-engine.mjs + quiet-revolt-daily-engine.mjs → {daily-engine: [...]}
 */
async function groupByPurpose() {
  const tenants = await listTenants();
  const slugs = tenants.map((t) => t.slug);
  const files = await fs.readdir(SCRIPTS);
  const groups = {};
  for (const f of files) {
    if (!f.endsWith(".mjs")) continue;
    for (const slug of slugs) {
      if (f.startsWith(`${slug}-`)) {
        const purpose = f.slice(slug.length + 1).replace(/\.mjs$/, "");
        if (!groups[purpose]) groups[purpose] = [];
        groups[purpose].push({ slug, file: f, fullPath: path.join(SCRIPTS, f) });
        break;
      }
    }
  }
  return groups;
}

async function callGemini(prompt, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8000 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function generalizeScript(purpose, sampleFiles, env) {
  // Read the first 2 samples
  const sample1 = await fs.readFile(sampleFiles[0].fullPath, "utf8");
  const sample2 = sampleFiles[1] ? await fs.readFile(sampleFiles[1].fullPath, "utf8") : sample1;

  const prompt = `Two tenant-specific Day14 scripts implement the same purpose: "${purpose}".

SAMPLE 1 (tenant "${sampleFiles[0].slug}"):
\`\`\`javascript
${sample1.slice(0, 8000)}
\`\`\`

${sampleFiles[1] ? `SAMPLE 2 (tenant "${sampleFiles[1].slug}"):
\`\`\`javascript
${sample2.slice(0, 4000)}
\`\`\`` : ""}

Generate a SINGLE generic version that works for ANY tenant. Requirements:
- Read TENANT slug from process.argv[2] (CLI: \`node script.mjs <tenant-slug>\`) OR from env var TENANT
- Replace ALL hardcoded tenant slugs / display names with derived-from-tenant values
- Display name should be read from ~/Documents/businesses/_shared/tenants.json
- Constitution path: ~/Documents/businesses/<tenant>/CONSTITUTION.md
- Output paths: ~/Documents/businesses/<tenant>/*
- Keep all logic identical, just parameterize tenant

Return ONLY the JavaScript code (no markdown fences, no preamble). Must be a complete .mjs file with shebang.`;

  return await callGemini(prompt, env.GEMINI_API_KEY);
}

async function processGroups() {
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) { await log("no GEMINI_API_KEY"); return 0; }
  const state = await loadState();
  await fs.mkdir(GENERIC, { recursive: true });

  const groups = await groupByPurpose();
  let generalized = 0;

  for (const [purpose, files] of Object.entries(groups)) {
    if (files.length < 2) continue; // need 2+ tenants to justify generalization
    const genericPath = path.join(GENERIC, `${purpose}.mjs`);
    const key = `${purpose}:${files.map((f) => f.slug).sort().join(",")}`;
    if (state.generalized.includes(key) && existsSync(genericPath)) continue;

    try {
      await log(`generalizing "${purpose}" (${files.length} tenants: ${files.map((f) => f.slug).join(", ")})`);
      const code = await generalizeScript(purpose, files, env);
      const cleaned = code.replace(/^```javascript\s*/g, "").replace(/^```js\s*/g, "").replace(/```\s*$/g, "").trim();
      await fs.writeFile(genericPath, cleaned);
      await fs.chmod(genericPath, 0o755);
      state.generalized.push(key);
      generalized += 1;
    } catch (err) {
      await log(`error generalizing ${purpose}: ${err.message}`);
    }
  }

  state.last_cycle = new Date().toISOString();
  await saveState(state);

  if (generalized > 0 && env.TELEGRAM_CHAT_ID) {
    await fs.mkdir(SHARED_OUTBOX, { recursive: true });
    await fs.writeFile(
      path.join(SHARED_OUTBOX, `${Date.now()}-skill-multiplier.json`),
      JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `🧬 *Skill multiplication cycle*\n\nGeneralized ${generalized} skills to scripts/_generic/. Now available for any tenant via:\n\n\`node scripts/_generic/<name>.mjs <tenant-slug>\``,
        parse_mode: "Markdown",
        urgency: "P3",
        queued_at: new Date().toISOString(),
        sent_at: null,
      }, null, 2)
    );
  }
  return generalized;
}

async function cycle() {
  try {
    const n = await processGroups();
    if (n > 0) await log(`cycle complete: ${n} skills generalized`);
  } catch (err) {
    await log(`cycle error: ${err.message}`);
  }
}

async function main() {
  await log("skill-multiplier starting");
  setInterval(cycle, POLL_INTERVAL_MS);
  setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  await cycle();
  await heartbeat();
  await log("running. cycles every 24h.");
}

main().catch(async (err) => {
  await log(`FATAL: ${err.message}`);
  process.exit(1);
});
