#!/usr/bin/env node
/**
 * opportunity-scanner.mjs
 *
 * Continuously scans the world for business opportunities Day14 could capture.
 *
 * Runs hourly. Each cycle:
 *   1. Gemini grounded search for trending niches, declining incumbents,
 *      demographic shifts, regulatory openings, weird new behaviors.
 *   2. Scores each opportunity (0-100) on: market size signal, our archetype
 *      fit, capital required, time-to-revenue, defensibility.
 *   3. Dedupes against existing opportunities + active tenants.
 *   4. Writes to ~/Documents/businesses/_shared/opportunities/<id>.json
 *   5. Triggers idea-pitcher.mjs for any opportunity scoring >75 (or >85 = urgent).
 *
 * State: _shared/founder-ops/opportunity-scanner-state.json
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { homedir } from "node:os";

const HOME = homedir();
const STUDIO = path.join(HOME, "Documents/studio");
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const OPPS_DIR = path.join(SHARED, "opportunities");
const STATE_FILE = path.join(SHARED, "founder-ops/opportunity-scanner-state.json");
const LOG_FILE = path.join(SHARED, "poller/opportunity-scanner.log");
const HEARTBEAT_FILE = path.join(SHARED, "poller/opportunity-scanner-heartbeat.log");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const ARCHETYPES_FILE = path.join(SHARED, "business-archetypes.json");
const ENV_FILE = path.join(STUDIO, ".env.local");

const POLL_INTERVAL_MS = 60 * 60_000; // hourly
const HEARTBEAT_INTERVAL_MS = 60_000;
const GEMINI_MODEL = "gemini-2.5-flash";

// Rotating scan angles — pick one per cycle so we don't repeat the same query
const SCAN_ANGLES = [
  "underserved demographics that are buying online but few brands cater to them",
  "subcultures with passionate communities but no merch / no products serving them",
  "rising search terms in the last 30 days indicating new consumer needs",
  "products/brands that recently got bad press, leaving customer demand unmet",
  "new regulatory or legal changes creating compliance/help demand",
  "AI tools or workflows people are paying for but nobody has commoditized",
  "boring B2B niches with no modern competitor (1990s websites, dated software)",
  "lifestyle phenomena that started on TikTok in the last 60 days",
  "demographic groups crossing milestones (retiring, divorcing, becoming caregivers)",
  "creator-economy verticals where templates/tools/services lag behind demand",
];

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
  if (!existsSync(STATE_FILE)) return { cycles_run: 0, total_found: 0, scored_75_plus: 0, last_angle_index: -1 };
  return JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
}

async function saveState(s) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(s, null, 2));
}

async function listExistingNiches() {
  const seen = new Set();
  // From tenants
  if (existsSync(TENANTS_FILE)) {
    const data = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8"));
    for (const t of (data.tenants || [])) {
      if (t.tagline) seen.add(t.tagline.toLowerCase().slice(0, 60));
    }
  }
  // From past opportunities
  if (existsSync(OPPS_DIR)) {
    for (const f of await fs.readdir(OPPS_DIR)) {
      if (!f.endsWith(".json")) continue;
      try {
        const data = JSON.parse(await fs.readFile(path.join(OPPS_DIR, f), "utf8"));
        if (data.niche) seen.add(data.niche.toLowerCase().slice(0, 60));
      } catch {}
    }
  }
  return seen;
}

async function callGroundedGemini(prompt, env) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 6000 },
      tools: [{ google_search: {} }],
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function parseJson(raw) {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
  const aS = cleaned.indexOf("["), aE = cleaned.lastIndexOf("]");
  const oS = cleaned.indexOf("{"), oE = cleaned.lastIndexOf("}");
  if (aS !== -1 && (oS === -1 || aS < oS)) return JSON.parse(cleaned.slice(aS, aE + 1));
  return JSON.parse(cleaned.slice(oS, oE + 1));
}

async function loadArchetypes() {
  if (!existsSync(ARCHETYPES_FILE)) return [];
  const data = JSON.parse(await fs.readFile(ARCHETYPES_FILE, "utf8"));
  return Object.entries(data.archetypes || {}).map(([k, v]) => ({ slug: k, ...v }));
}

async function cycle() {
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) { await log("no GEMINI_API_KEY"); return; }
  const state = await loadState();
  const existing = await listExistingNiches();
  const archetypes = await loadArchetypes();

  state.last_angle_index = (state.last_angle_index + 1) % SCAN_ANGLES.length;
  const angle = SCAN_ANGLES[state.last_angle_index];
  await log(`cycle ${state.cycles_run + 1}: scanning "${angle}"`);

  const archetypeList = archetypes.map((a) => `${a.slug}: ${a.elevator}`).join("\n");
  const existingList = [...existing].slice(0, 50).join(", ");

  const prompt = `You are Day14's chief opportunity scout. Use Google Search to find REAL, CURRENT opportunities.

SCAN ANGLE: ${angle}

DAY14 CAN OPERATE THESE ARCHETYPES:
${archetypeList}

EXISTING TENANTS / SEEN OPPORTUNITIES (do NOT repeat):
${existingList}

Find 3-5 SPECIFIC opportunities. Each must be:
- Backed by real search results, real trend data, real news (cite it)
- Not already covered by us
- Operable by one solo founder with Day14's automation stack
- Plausibly $1k-$10k/mo within 90 days

For each, score it 0-100 on:
- market_size (50% weight): demand evidence
- archetype_fit (20%): how well one of our archetypes maps
- speed_to_revenue (15%): how fast we could ship + earn
- defensibility (10%): can we hold the position
- weirdness (5%): is it genuinely new

Return STRICT JSON array:
[
  {
    "id": "slug-style-unique-id-3-to-5-words",
    "niche": "specific 3-12 word niche description",
    "evidence": "real search query / news article / trend signal you found (cite source)",
    "icp": "1-sentence ICP",
    "suggested_archetype": "one of the day14 archetype slugs",
    "rationale": "2-3 sentences on why we should pursue this",
    "first_product_concept": "concrete first SKU/product/offer",
    "competitors_found": ["real URL", "real URL"],
    "competitor_gap": "what they miss that we'd attack",
    "scores": {
      "market_size": 0-100,
      "archetype_fit": 0-100,
      "speed_to_revenue": 0-100,
      "defensibility": 0-100,
      "weirdness": 0-100
    },
    "total_score": 0-100,
    "kill_criteria": "the single fact that would mean we shouldn't pursue this"
  },
  ... 3-5 entries
]`;

  let opps;
  try {
    opps = parseJson(await callGroundedGemini(prompt, env));
  } catch (err) {
    await log(`parse error: ${err.message}`);
    return;
  }

  await fs.mkdir(OPPS_DIR, { recursive: true });
  let written = 0;
  let highScorers = [];
  for (const o of opps) {
    // Dedup
    if (existing.has((o.niche || "").toLowerCase().slice(0, 60))) continue;
    const id = `${o.id || o.niche.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
    const file = path.join(OPPS_DIR, `${id}.json`);
    if (existsSync(file)) continue;

    o.scanned_at = new Date().toISOString();
    o.scan_angle = angle;
    o.status = "open";
    o.pitched = false;
    await fs.writeFile(file, JSON.stringify(o, null, 2));
    written += 1;
    state.total_found += 1;

    if ((o.total_score || 0) >= 75) {
      state.scored_75_plus += 1;
      highScorers.push({ id, score: o.total_score, niche: o.niche, file });
    }
  }

  state.cycles_run += 1;
  state.last_cycle_at = new Date().toISOString();
  await saveState(state);
  await log(`cycle done: ${written} new opportunities (${highScorers.length} scored ≥75)`);

  // Trigger idea-pitcher for high-scorers
  for (const hs of highScorers) {
    const child = spawn("node", [
      path.join(STUDIO, "scripts/idea-pitcher.mjs"),
      "--id", hs.id,
      "--urgent", hs.score >= 85 ? "true" : "false",
    ], { detached: true, stdio: "ignore" });
    child.unref();
    await log(`spawned idea-pitcher for ${hs.id} (score ${hs.score})`);
  }
}

async function main() {
  await log("opportunity-scanner starting");
  setInterval(cycle, POLL_INTERVAL_MS);
  setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  await cycle();
  await heartbeat();
  await log("running. cycles hourly.");
}

main().catch(async (err) => { await log(`FATAL: ${err.message}`); process.exit(1); });
