#!/usr/bin/env node
/**
 * recursive-expansion-engine.mjs
 *
 * The Day14 system's self-growth loop. Runs hourly via LaunchAgent.
 *
 * Each cycle:
 *   1. Reads pending expansion-requests/*.json (from bot or growth-watcher)
 *   2. Reads the growth register for ad-hoc patterns (3+ similar = skill candidate)
 *   3. For each candidate, generates a SKILL.md + implementation stub via Gemini
 *   4. Writes drafts to docs/seeds/skills/_drafts/<name>/
 *   5. Telegram-pings Jack with tap-to-approve card
 *   6. On approval (via Telegram reply): moves draft to docs/seeds/skills/<name>/
 *      and regenerates skill-registry.generated.ts
 *
 * The recursive loop:
 *   - Bot detects user said "build me X" → queues expansion request
 *   - This engine processes the queue + finds growth patterns
 *   - Generates new skills via Gemini
 *   - New skills become callable
 *   - Bot can now use them
 *
 * Each generated skill is ALSO eligible to become input for the next cycle —
 * the system can refactor / consolidate / expand its own skills.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const STUDIO = path.join(HOME, "Documents/studio");
const SCRIPTS = path.join(STUDIO, "scripts");
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const EXPANSION_INBOX = path.join(SHARED, "expansion-requests");
const EXPANSION_PROCESSED = path.join(SHARED, "expansion-requests/_processed");
const SHARED_OUTBOX = path.join(SHARED, "telegram/outbox");
const STATE_FILE = path.join(SHARED, "founder-ops/recursive-expansion-state.json");
const LOG_FILE = path.join(SHARED, "poller/recursive-expansion.log");
const HEARTBEAT_FILE = path.join(SHARED, "poller/recursive-expansion-heartbeat.log");
const ENV_FILE = path.join(STUDIO, ".env.local");

const SKILLS_DRAFTS = path.join(STUDIO, "docs/seeds/skills/_drafts");
const SKILLS_DIR = path.join(STUDIO, "docs/seeds/skills");
const GROWTH_REGISTER = path.join(SHARED, "growth-register.jsonl");

const POLL_INTERVAL_MS = 60 * 60_000; // hourly
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
  if (!existsSync(STATE_FILE)) return { processed_ids: [], skills_generated: 0, last_cycle: null };
  return JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
}

async function saveState(s) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(s, null, 2));
}

async function callGemini(prompt, key, temp = 0.5, maxTokens = 3000) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: temp, maxOutputTokens: maxTokens },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function listExistingSkills() {
  if (!existsSync(SKILLS_DIR)) return [];
  const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory() && !e.name.startsWith("_")).map((e) => e.name);
}

async function generateSkill(description, extracted, env) {
  const existing = await listExistingSkills();
  const prompt = `You are the Day14 OS skill architect. A new capability is needed.

DESCRIPTION: ${description}
EXTRACTED CONTEXT: ${JSON.stringify(extracted || {})}

EXISTING SKILLS (${existing.length}, do not duplicate):
${existing.slice(0, 80).join(", ")}

Design ONE new skill that delivers this capability. The skill should be:
- Specific (not vague "do business better")
- Composable (small, single-purpose)
- Hand-codable as a TS function or .mjs script

Return STRICT JSON only:
{
  "name": "kebab-case-skill-name (3-5 words, descriptive)",
  "purpose": "one sentence",
  "inputs": ["input1", "input2"],
  "outputs": ["output1", "output2"],
  "triggers": ["when this skill should fire — events, user phrases, or other skill calls"],
  "jack_tap_required": true|false,
  "implementation_plan": "1-3 sentence sketch of how the implementation works (which APIs, what logic)",
  "implementation_stub_ts": "// 30-60 line TypeScript implementation stub. Use Node fs, fetch, etc. Export a run(ctx) function. Don't worry about full correctness — Jack will iterate.",
  "estimated_effort": "minutes (rough)"
}`;

  const raw = await callGemini(prompt, env.GEMINI_API_KEY, 0.5, 4000);
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  return JSON.parse(cleaned.slice(s, e + 1));
}

async function writeSkillDraft(skill) {
  const dir = path.join(SKILLS_DRAFTS, skill.name);
  await fs.mkdir(dir, { recursive: true });

  const skillMd = `---
name: ${skill.name}
purpose: ${skill.purpose}
inputs:
${skill.inputs.map((i) => `  - ${i}`).join("\n")}
outputs:
${skill.outputs.map((o) => `  - ${o}`).join("\n")}
triggers:
${skill.triggers.map((t) => `  - ${t}`).join("\n")}
hand_coded: true
implementation: scripts/${skill.name}.mjs (draft, needs review)
jack_tap_required: ${skill.jack_tap_required}
status: draft
generated_by: recursive-expansion-engine
generated_at: ${new Date().toISOString()}
---

# ${skill.name}

${skill.purpose}

## Implementation plan

${skill.implementation_plan}

## Estimated effort

${skill.estimated_effort}

## Implementation stub

\`\`\`typescript
${skill.implementation_stub_ts}
\`\`\`

---

*This skill was auto-generated by recursive-expansion-engine. Review + move to docs/seeds/skills/${skill.name}/ when ready to ship.*
`;
  await fs.writeFile(path.join(dir, "SKILL.md"), skillMd);
  return path.join(dir, "SKILL.md");
}

async function queueApprovalCard(skill, skillPath, env) {
  if (!env.TELEGRAM_CHAT_ID) return;
  await fs.mkdir(SHARED_OUTBOX, { recursive: true });
  const text =
    `🧬 *New skill drafted*\n\n` +
    `Name: \`${skill.name}\`\n` +
    `Purpose: ${skill.purpose}\n` +
    `Effort: ${skill.estimated_effort}\n` +
    `Jack-tap: ${skill.jack_tap_required ? "yes" : "no"}\n\n` +
    `Plan: _${skill.implementation_plan.slice(0, 200)}_\n\n` +
    `Draft: \`${skillPath}\`\n\n` +
    `Reply *approve ${skill.name}* to ship + wire into registry, or *skip ${skill.name}* to delete.`;
  await fs.writeFile(
    path.join(SHARED_OUTBOX, `${Date.now()}-skill-draft-${skill.name}.json`),
    JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: "Markdown",
      urgency: "P3",
      queued_at: new Date().toISOString(),
      sent_at: null,
      tap_required: true,
    }, null, 2)
  );
}

async function processExpansionInbox(env, state) {
  if (!existsSync(EXPANSION_INBOX)) return 0;
  const files = await fs.readdir(EXPANSION_INBOX);
  let processed = 0;
  await fs.mkdir(EXPANSION_PROCESSED, { recursive: true });
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    if (state.processed_ids.includes(f)) continue;

    const filePath = path.join(EXPANSION_INBOX, f);
    let req;
    try { req = JSON.parse(await fs.readFile(filePath, "utf8")); } catch { continue; }
    if (req.status !== "pending") continue;

    // Only process skill requests here; business requests handled elsewhere
    if (req.type === "new-business") continue;
    const desc = req.description || req.extracted?.description;
    if (!desc) continue;

    try {
      await log(`generating skill for: ${desc.slice(0, 80)}`);
      const skill = await generateSkill(desc, req.extracted, env);
      const skillPath = await writeSkillDraft(skill);
      await queueApprovalCard(skill, skillPath, env);
      // Move to processed
      req.status = "draft-generated";
      req.skill_name = skill.name;
      req.draft_path = skillPath;
      await fs.writeFile(path.join(EXPANSION_PROCESSED, f), JSON.stringify(req, null, 2));
      await fs.unlink(filePath);
      state.processed_ids.push(f);
      state.skills_generated += 1;
      processed += 1;
    } catch (err) {
      await log(`error generating skill: ${err.message}`);
    }
  }
  return processed;
}

async function findGrowthPatterns(env) {
  if (!existsSync(GROWTH_REGISTER)) return [];
  const text = await fs.readFile(GROWTH_REGISTER, "utf8");
  const events = text.trim().split("\n").filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);

  // Find ad-hoc requests that repeat
  const buckets = {};
  for (const e of events) {
    if (e.type !== "ad-hoc") continue;
    const key = (e.description || "").slice(0, 60);
    if (!key) continue;
    buckets[key] = (buckets[key] || 0) + 1;
  }
  return Object.entries(buckets)
    .filter(([, n]) => n >= 3)
    .map(([desc, count]) => ({ description: desc, count }));
}

async function processGrowthPatterns(env, state) {
  const patterns = await findGrowthPatterns(env);
  let generated = 0;
  for (const p of patterns) {
    const patternKey = `pattern-${p.description.slice(0, 30)}`;
    if (state.processed_ids.includes(patternKey)) continue;
    try {
      await log(`pattern detected (${p.count}×): ${p.description}`);
      const skill = await generateSkill(p.description, { pattern_count: p.count, source: "growth-register" }, env);
      const skillPath = await writeSkillDraft(skill);
      await queueApprovalCard(skill, skillPath, env);
      state.processed_ids.push(patternKey);
      state.skills_generated += 1;
      generated += 1;
    } catch (err) {
      await log(`pattern skill error: ${err.message}`);
    }
  }
  return generated;
}

async function cycle() {
  try {
    const env = await loadEnv();
    if (!env.GEMINI_API_KEY) { await log("no GEMINI_API_KEY, skipping cycle"); return; }
    const state = await loadState();

    const fromInbox = await processExpansionInbox(env, state);
    const fromPatterns = await processGrowthPatterns(env, state);

    state.last_cycle = new Date().toISOString();
    await saveState(state);

    if (fromInbox + fromPatterns > 0) {
      await log(`cycle complete: ${fromInbox} from inbox, ${fromPatterns} from patterns, ${state.skills_generated} total lifetime`);
    }
  } catch (err) {
    await log(`cycle error: ${err.message}`);
  }
}

async function main() {
  await fs.mkdir(SKILLS_DRAFTS, { recursive: true });
  await log("recursive-expansion-engine starting");

  setInterval(cycle, POLL_INTERVAL_MS);
  setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

  await cycle();
  await heartbeat();
  await log("running. cycles every hour, heartbeat every 60s");
}

main().catch(async (err) => {
  await log(`FATAL: ${err.message}`);
  process.exit(1);
});
