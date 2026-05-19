#!/usr/bin/env node
/**
 * pr-director.mjs
 *
 * Day14's Director of Communications. Tue + Thu 9am.
 *
 *   1. Monitors mentions of each tenant's brand across the web (Gemini grounded)
 *   2. For new wins (milestone hit, new product), drafts a press release
 *   3. Drafts 5 podcast/media pitch angles per tenant
 *   4. Curates 3 trending stories the tenant could comment on (newsjacking)
 *
 * Output: ~/Documents/businesses/<tenant>/pr-drafts/<date>/
 * Telegram: top finding per tenant
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");
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

async function callGemini(prompt, env, useGrounding = false) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.6, maxOutputTokens: 5000 },
  };
  if (useGrounding) body.tools = [{ google_search: {} }];
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function parseJson(raw) {
  const c = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
  const o = c.indexOf("{"), oe = c.lastIndexOf("}");
  return JSON.parse(c.slice(o, oe + 1));
}

async function processTenant(tenant, env) {
  const slug = tenant.slug;
  const constPath = path.join(BIZ, slug, "CONSTITUTION.md");
  const constitution = existsSync(constPath) ? (await fs.readFile(constPath, "utf8")).slice(0, 2500) : "";

  const prompt = `You are the Director of Communications for "${tenant.display_name}" (${tenant.tagline}).

CONSTITUTION:
${constitution}

Use Google Search. Return STRICT JSON:

{
  "brand_mentions": [
    { "where": "publication/forum/podcast", "url": "real URL", "date": "approx date", "sentiment": "positive|neutral|negative", "note": "what they said" }
  ] (search for the brand name + variations; 0-5 entries; if no mentions found, return []),

  "podcast_pitches": [
    {
      "show_name": "real podcast that fits the niche",
      "host_name": "real host",
      "fit_reasoning": "why this show",
      "pitch_angle": "the specific angle Jack should pitch",
      "subject_line": "email subject (40-60 chars)",
      "outreach_body": "120-180 word pitch email"
    }
    ... 5 entries
  ],

  "newsjack_opportunities": [
    {
      "story_headline": "real story from last 14 days that's trending",
      "url": "real URL",
      "angle_for_us": "specific take we could publish on this",
      "platform_fit": "twitter-thread|linkedin-essay|blog-post"
    }
    ... 3 entries
  ]
}`;

  const data = parseJson(await callGemini(prompt, env, true));
  const date = new Date().toISOString().slice(0, 10);
  const dir = path.join(BIZ, slug, "pr-drafts", date);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(path.join(dir, "report.json"), JSON.stringify({ generated_at: new Date().toISOString(), tenant: slug, ...data }, null, 2));

  const lines = [
    `# PR report — ${tenant.display_name} (${date})`,
    ``,
    `## Brand mentions (${data.brand_mentions.length})`,
    data.brand_mentions.length === 0 ? "(none found — too early or unique name)" : data.brand_mentions.map((m) => `- [${m.sentiment}] **${m.where}** (${m.date}): ${m.note} · ${m.url}`).join("\n"),
    ``,
    `## Podcast pitches (${data.podcast_pitches.length})`,
    ...data.podcast_pitches.map((p, i) => `### ${i + 1}. ${p.show_name} — ${p.host_name}\n\n**Fit:** ${p.fit_reasoning}\n\n**Angle:** ${p.pitch_angle}\n\n**Email subject:** ${p.subject_line}\n\n**Body:**\n\n${p.outreach_body}\n`),
    ``,
    `## Newsjack opportunities (${data.newsjack_opportunities.length})`,
    ...data.newsjack_opportunities.map((n, i) => `### ${i + 1}. ${n.story_headline}\n\n${n.url}\n\n**Our angle:** ${n.angle_for_us}\n\n**Fit:** ${n.platform_fit}\n`),
  ];
  await fs.writeFile(path.join(dir, "README.md"), lines.join("\n"));

  return { ok: true, mentions: data.brand_mentions.length, pitches: data.podcast_pitches.length, newsjack: data.newsjack_opportunities.length };
}

async function main() {
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
  if (!existsSync(TENANTS_FILE)) return;

  const tenants = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];
  const summaries = [];
  for (const t of tenants) {
    try {
      const r = await processTenant(t, env);
      if (r.ok) summaries.push({ tenant: t.display_name, ...r });
    } catch (e) { console.error(`${t.slug} error: ${e.message}`); }
  }

  if (summaries.length > 0 && env.TELEGRAM_CHAT_ID) {
    await fs.mkdir(OUTBOX, { recursive: true });
    const totalMentions = summaries.reduce((s, x) => s + x.mentions, 0);
    const totalPitches = summaries.reduce((s, x) => s + x.pitches, 0);
    await fs.writeFile(
      path.join(OUTBOX, `${Date.now()}-pr-director.json`),
      JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `📰 *PR Director report*\n\n${totalMentions} brand mentions found · ${totalPitches} podcast pitches drafted · ${summaries.reduce((s, x) => s + x.newsjack, 0)} newsjack ops\n\n${summaries.map((s) => `• ${s.tenant}: ${s.mentions}m / ${s.pitches}p`).join("\n")}\n\nReview at: \`~/Documents/businesses/*/pr-drafts/\``,
        parse_mode: "Markdown", urgency: "P3",
        queued_at: new Date().toISOString(), sent_at: null,
      }, null, 2)
    );
  }
  console.log(`✓ ${summaries.length} tenant PR reports`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
