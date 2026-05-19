#!/usr/bin/env node
/**
 * idea-pitcher.mjs --id <opp-id> [--urgent true]
 *
 * Takes one opportunity and generates a full pitch:
 *   - Polished 1-page pitch markdown
 *   - 30-day MVP plan with daily steps
 *   - Projected economics (revenue, cost, margin)
 *   - 5 first-product concepts
 *   - Competitor breakdown
 *   - Risk + kill criteria
 *
 * Telegram-pings Jack with a tap-to-launch card:
 *   "Launch <slug>? Reply *bootstrap <slug>* to spin up the business."
 *
 * Stores the pitch at _shared/pitches/<slug>.md and updates the opportunity
 * record (pitched: true).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const OPPS_DIR = path.join(SHARED, "opportunities");
const PITCHES_DIR = path.join(SHARED, "pitches");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");
const GEMINI_MODEL = "gemini-2.5-flash";

function args() {
  const a = process.argv.slice(2);
  const o = { urgent: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--id") o.id = a[++i];
    else if (a[i] === "--urgent") o.urgent = a[++i] === "true";
  }
  if (!o.id) { console.error("Usage: idea-pitcher.mjs --id <opp-id> [--urgent true]"); process.exit(1); }
  return o;
}

async function loadEnv() {
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function callGemini(prompt, env) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 6000 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function main() {
  const { id, urgent } = args();
  const env = await loadEnv();

  const oppFile = path.join(OPPS_DIR, `${id}.json`);
  if (!existsSync(oppFile)) throw new Error(`opportunity not found: ${id}`);
  const opp = JSON.parse(await fs.readFile(oppFile, "utf8"));

  if (opp.pitched) {
    console.log(`already pitched: ${id}`);
    return;
  }

  console.log(`→ Pitching: ${opp.niche} (score ${opp.total_score})`);

  const prompt = `You are pitching a new business opportunity to Jack — solo founder, runs Day14 OS automation stack. Direct, no fluff.

OPPORTUNITY:
${JSON.stringify(opp, null, 2)}

Write a full pitch in markdown. Structure:

## TL;DR
2-sentence pitch. What we do, who we serve, why now.

## The opportunity
3-4 paragraphs explaining the market gap, why it exists, what's about to change. Use the evidence above.

## ICP (ideal customer)
1 paragraph. Be specific — age, situation, what they buy now, what they search for.

## Why us
Why Day14 / our automation stack wins here. 3-5 bullets.

## First 5 products
List 5 concrete first SKUs/offers with exact pricing + positioning.

## Projected economics (90-day)
Realistic — not optimistic.
- Month 1: revenue range, cost range, action focus
- Month 2: revenue range, cost range, action focus
- Month 3: revenue range, cost range, action focus

## Competitors
3-5 real competitors. Their angle. Our angle vs them.

## 30-day MVP plan
Day-by-day for the first 7 days, then weekly milestones for weeks 2-4. Concrete actions only.

## Risks + kill criteria
3 risks. For each, the single fact that would make us kill the project.

## Launch command
The exact command Jack runs to spin this up:
\`node scripts/business-bootstrap.mjs --slug "${(opp.id || opp.niche).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}" --display-name "..." --niche "${(opp.niche || "").replace(/"/g, "'")}" --archetype ${opp.suggested_archetype || "pod-store"}\`

Match Jack's voice: dry, specific, intelligent, no exclamation points, no "let's dive in", no "buckle up".`;

  const pitch = await callGemini(prompt, env);

  // Save pitch
  await fs.mkdir(PITCHES_DIR, { recursive: true });
  const pitchPath = path.join(PITCHES_DIR, `${id}.md`);
  const frontmatter = `---
opportunity_id: ${id}
total_score: ${opp.total_score}
niche: "${(opp.niche || "").replace(/"/g, '\\"')}"
suggested_archetype: ${opp.suggested_archetype}
pitched_at: ${new Date().toISOString()}
urgent: ${urgent}
---

`;
  await fs.writeFile(pitchPath, frontmatter + pitch);

  // Update opportunity
  opp.pitched = true;
  opp.pitched_at = new Date().toISOString();
  opp.pitch_path = pitchPath;
  await fs.writeFile(oppFile, JSON.stringify(opp, null, 2));

  // Telegram card
  if (env.TELEGRAM_CHAT_ID) {
    await fs.mkdir(OUTBOX, { recursive: true });
    const slug = id.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
    const displayName = (opp.niche || id).split(" ").slice(0, 4).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
    const tldr = pitch.match(/## TL;DR\s*\n+([^\n#]+(?:\n[^\n#]+)?)/)?.[1]?.trim()?.slice(0, 400) || opp.rationale;
    const text =
      `${urgent ? "🚨 *URGENT OPPORTUNITY*" : "💡 *New idea*"}\n\n` +
      `*${opp.niche}*\n` +
      `Score: ${opp.total_score}/100 · ${opp.suggested_archetype}\n\n` +
      `_${tldr}_\n\n` +
      `Full pitch: \`open ${pitchPath}\`\n\n` +
      `Launch: reply *bootstrap-pitch ${id}* (uses suggested defaults)\n` +
      `Or skip: reply *skip-pitch ${id}*`;
    await fs.writeFile(
      path.join(OUTBOX, `${Date.now()}-pitch-${id}.json`),
      JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown",
        urgency: urgent ? "P1" : "P3",
        queued_at: new Date().toISOString(),
        sent_at: null,
        tap_required: true,
      }, null, 2)
    );
  }

  console.log(`✓ pitched ${id} → ${pitchPath}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
