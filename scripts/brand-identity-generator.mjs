#!/usr/bin/env node
/**
 * brand-identity-generator.mjs
 *
 * Given a niche + display name, generates a full brand identity via Gemini:
 *   - Voice rules (8-12 yes/no items)
 *   - Color palette (3 hex codes with reasoning)
 *   - Typography pairing (Google Fonts: heading + body)
 *   - Positioning statement
 *   - ICP description
 *   - Banned phrases / tropes to avoid
 *
 * Outputs: ~/Documents/businesses/<slug>/brand-identity.json
 *
 * USAGE: node brand-identity-generator.mjs --slug X --display-name "X" --niche "X"
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");
const GEMINI_MODEL = "gemini-2.5-flash";

function args() {
  const a = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--slug") out.slug = a[++i];
    else if (a[i] === "--display-name") out.display_name = a[++i];
    else if (a[i] === "--niche") out.niche = a[++i];
  }
  if (!out.slug || !out.display_name || !out.niche) {
    console.error("Usage: brand-identity-generator.mjs --slug X --display-name X --niche X");
    process.exit(1);
  }
  return out;
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

async function callGemini(prompt, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 3000 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function parseJson(raw) {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  return JSON.parse(cleaned.slice(s, e + 1));
}

async function main() {
  const { slug, display_name, niche } = args();
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

  const prompt = `Generate a complete brand identity for a new business.

BUSINESS:
  Display name: ${display_name}
  Niche: ${niche}
  Slug: ${slug}

OUTPUT — strict JSON only, no preamble:
{
  "positioning_statement": "one-sentence statement: who it's for, what it does, what makes it different",
  "icp": {
    "description": "1-2 sentences on the ideal customer (age, situation, pain, vocabulary they use)",
    "where_they_hang_out": ["3-5 specific platforms/communities"],
    "what_they_buy_today": ["3-5 specific products/brands they already buy"]
  },
  "voice_rules": {
    "yes": ["8-12 short items — what the voice DOES (concrete, niche-specific, not generic)"],
    "no": ["8-12 short items — what the voice AVOIDS (concrete clichés, banned phrases, banned aesthetics)"]
  },
  "color_palette": [
    { "hex": "#XXXXXX", "name": "Color name", "role": "primary|secondary|accent", "reasoning": "why this color for this niche" },
    { "hex": "#XXXXXX", "name": "...", "role": "...", "reasoning": "..." },
    { "hex": "#XXXXXX", "name": "...", "role": "...", "reasoning": "..." }
  ],
  "typography": {
    "heading": { "google_font": "Font Name", "weight": 600, "reasoning": "why this fits" },
    "body": { "google_font": "Font Name", "weight": 400, "reasoning": "why this fits" }
  },
  "banned_phrases": ["6-10 specific phrases/clichés you must never use in this brand's voice"],
  "competitor_archetypes": [
    { "name": "competitor type", "their_angle": "...", "your_angle_vs_them": "..." },
    { "name": "...", "their_angle": "...", "your_angle_vs_them": "..." },
    { "name": "...", "their_angle": "...", "your_angle_vs_them": "..." }
  ],
  "merch_aesthetic": "1-2 sentences describing the merch design direction (style, palette, typography vibe)"
}

Be ruthlessly specific. No "modern and elegant" — instead "1970s varsity patch aesthetic" or "Brutalist Helvetica + grid". Pick a lane.`;

  console.log(`→ Generating brand identity for ${display_name}...`);
  const raw = await callGemini(prompt, env.GEMINI_API_KEY);
  const identity = parseJson(raw);

  const outDir = path.join(BIZ, slug);
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "brand-identity.json");
  await fs.writeFile(outPath, JSON.stringify({ generated_at: new Date().toISOString(), slug, display_name, niche, ...identity }, null, 2));

  console.log(`✓ ${outPath}`);
  console.log(`\nPositioning: ${identity.positioning_statement}`);
  console.log(`Palette: ${identity.color_palette.map((c) => c.hex).join(", ")}`);
  console.log(`Type: ${identity.typography.heading.google_font} / ${identity.typography.body.google_font}`);
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
