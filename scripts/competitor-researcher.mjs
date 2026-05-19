#!/usr/bin/env node
/**
 * competitor-researcher.mjs
 *
 * Gemini-grounded competitor research. Given a niche, returns:
 *   - 5-10 specific competitors with name, URL, positioning, pricing, gaps
 *   - Niche opportunities (underserved segments)
 *   - Average market price
 *   - Search demand signals
 *
 * Output: ~/Documents/businesses/<slug>/competitor-research.json
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
    else if (a[i] === "--niche") out.niche = a[++i];
    else if (a[i] === "--archetype") out.archetype = a[++i];
  }
  if (!out.slug || !out.niche) {
    console.error("Usage: competitor-researcher.mjs --slug X --niche X [--archetype pod-store]");
    process.exit(1);
  }
  out.archetype = out.archetype || "pod-store";
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

async function callGroundedGemini(prompt, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 4000 },
      tools: [{ google_search: {} }],
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
  const { slug, niche, archetype } = args();
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

  const prompt = `Research the competitive landscape for a new ${archetype} business targeting: "${niche}"

Use Google Search to find REAL competitors that are LIVE today. No hallucinations.

Return STRICT JSON only, no preamble:
{
  "niche": "${niche}",
  "market_size_signal": "rough indicator (high/medium/low) + 1-sentence reasoning based on search volume / number of competitors found",
  "average_price_cents": <integer cents — typical price point in this niche>,
  "competitors": [
    {
      "name": "real brand/site name",
      "url": "real URL you actually found",
      "positioning": "their elevator pitch",
      "pricing": "typical price range",
      "audience": "who they serve",
      "what_works": "what they do well",
      "gap": "what they miss / where we can win"
    },
    ... 5-10 entries
  ],
  "underserved_segments": [
    "specific micro-niche not well-served by existing players",
    "another underserved segment",
    "another underserved segment"
  ],
  "winning_angles": [
    "specific angle/positioning we should take to differentiate",
    "another winning angle",
    "another winning angle"
  ],
  "search_terms_to_target": [
    "specific 2-4 word phrase customers search",
    "another phrase",
    "another phrase",
    "another phrase",
    "another phrase"
  ]
}

Be SPECIFIC. Real URLs only. No placeholder competitors.`;

  console.log(`→ Researching competitors for "${niche}" (${archetype})...`);
  const raw = await callGroundedGemini(prompt, env.GEMINI_API_KEY);
  const research = parseJson(raw);

  const outDir = path.join(BIZ, slug);
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "competitor-research.json");
  await fs.writeFile(outPath, JSON.stringify({ researched_at: new Date().toISOString(), slug, ...research }, null, 2));

  console.log(`✓ ${outPath}`);
  console.log(`\n${research.competitors.length} competitors found`);
  console.log(`Market: ${research.market_size_signal}`);
  console.log(`Avg price: $${(research.average_price_cents / 100).toFixed(2)}`);
  console.log(`\nTop winning angles:`);
  for (const a of research.winning_angles.slice(0, 3)) {
    console.log(`  • ${a}`);
  }
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
