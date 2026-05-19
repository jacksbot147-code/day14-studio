#!/usr/bin/env node
/**
 * sales-director.mjs
 *
 * Day14's VP Sales. Daily 10am.
 *
 * Different mode per tenant archetype:
 *   - agency / consulting: drafts outbound sequences (LinkedIn DM + email) to ICP
 *   - saas: drafts win-back for trial users that didn't convert
 *   - pod-store / physical-product: drafts wholesale/B2B outreach to retailers
 *   - course / info-product: drafts affiliate-recruiter outreach
 *
 * Output: ~/Documents/businesses/<tenant>/sales-drafts/<date>/
 *   - cold-outreach.md (per persona)
 *   - followup-sequence.md
 *   - target-list.json
 *
 * Telegram: count of drafts ready + first target preview
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
    generationConfig: { temperature: 0.6, maxOutputTokens: 4000 },
  };
  if (useGrounding) body.tools = [{ google_search: {} }];
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function parseJson(raw) {
  const c = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
  const a = c.indexOf("["), ae = c.lastIndexOf("]");
  const o = c.indexOf("{"), oe = c.lastIndexOf("}");
  if (a !== -1 && (o === -1 || a < o)) return JSON.parse(c.slice(a, ae + 1));
  return JSON.parse(c.slice(o, oe + 1));
}

const MODES = {
  "agency":           { mode: "outbound-services", channels: ["email", "linkedin-dm"] },
  "consulting":       { mode: "outbound-services", channels: ["email", "linkedin-dm"] },
  "saas":             { mode: "trial-conversion", channels: ["email", "in-app"] },
  "pod-store":        { mode: "wholesale-b2b",    channels: ["email"] },
  "physical-product": { mode: "wholesale-b2b",    channels: ["email"] },
  "course":           { mode: "affiliate-recruit", channels: ["email", "linkedin-dm"] },
  "info-product":     { mode: "affiliate-recruit", channels: ["email"] },
};

async function processTenant(tenant, env) {
  const config = MODES[tenant.type];
  if (!config) return { skipped: true };
  const slug = tenant.slug;
  const constPath = path.join(BIZ, slug, "CONSTITUTION.md");
  const constitution = existsSync(constPath) ? (await fs.readFile(constPath, "utf8")).slice(0, 2500) : "";

  // 1. Find 5 specific real targets via grounded search
  const targetPrompt = `For "${tenant.display_name}" (${tenant.tagline}, archetype: ${tenant.type}, mode: ${config.mode}):

Use Google Search to find 5 REAL, NAMED, currently-operating targets we could pitch.

Each target must:
- Be a specific real company/person (not "small businesses in [city]")
- Have a current LinkedIn or website (cite URL)
- Be a plausible fit
- NOT be a competitor

Return STRICT JSON:
{
  "targets": [
    {
      "name": "real org or person name",
      "url": "real URL you verified",
      "fit_reasoning": "why this specific target fits",
      "hook_angle": "the specific angle that opens the conversation",
      "decision_maker": "title or named person if findable"
    },
    ... 5 entries
  ]
}`;
  const { targets } = parseJson(await callGemini(targetPrompt, env, true));

  // 2. Draft outreach for each
  const outreachPrompt = `Draft cold outreach for "${tenant.display_name}". Match voice strictly:

${constitution}

CHANNELS: ${config.channels.join(", ")}

TARGETS:
${targets.map((t, i) => `${i + 1}. ${t.name} (${t.url}) — ${t.fit_reasoning} · Angle: ${t.hook_angle}`).join("\n")}

For each target draft:
- ONE cold email (subject + body, max 80 words body)
- ONE LinkedIn DM (max 200 chars)
- Two-step followup (sent 4 days later if no reply)

Rules:
- No "I hope this finds you well"
- No "I noticed you..." opener (overused)
- Reference something SPECIFIC about them (from the URL we verified)
- One sentence asking question, not pitching
- Sign "Jack" (no surname unless agency/consulting)

Return STRICT JSON:
{
  "outreach": [
    { "target_name": "...", "email": { "subject": "...", "body": "..." }, "linkedin_dm": "...", "followup_day_4": "..." },
    ... entries
  ]
}`;
  const { outreach } = parseJson(await callGemini(outreachPrompt, env));

  // Save
  const date = new Date().toISOString().slice(0, 10);
  const dir = path.join(BIZ, slug, "sales-drafts", date);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "target-list.json"), JSON.stringify(targets, null, 2));

  const md = [
    `# Sales drafts — ${tenant.display_name} (${date})`,
    `Mode: ${config.mode}`,
    ``,
    ...outreach.map((o, i) => `## ${i + 1}. ${o.target_name}\n\n### Email\n**Subject:** ${o.email.subject}\n\n${o.email.body}\n\n### LinkedIn DM\n${o.linkedin_dm}\n\n### Follow-up (day 4)\n${o.followup_day_4}\n`).join("\n---\n"),
  ];
  await fs.writeFile(path.join(dir, "outreach.md"), md.join("\n"));

  return { ok: true, count: outreach.length, dir };
}

async function main() {
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
  if (!existsSync(TENANTS_FILE)) return;

  const tenants = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];
  let total = 0;
  const tenantSummaries = [];
  for (const t of tenants) {
    if (!MODES[t.type]) continue;
    try {
      const r = await processTenant(t, env);
      if (r.ok) {
        total += r.count;
        tenantSummaries.push(`${t.display_name}: ${r.count} drafts`);
      }
    } catch (e) {
      console.error(`${t.slug} error: ${e.message}`);
    }
  }

  if (total > 0 && env.TELEGRAM_CHAT_ID) {
    await fs.mkdir(OUTBOX, { recursive: true });
    await fs.writeFile(
      path.join(OUTBOX, `${Date.now()}-sales-director.json`),
      JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `🎯 *VP Sales daily*\n\n${total} outreach drafts ready:\n${tenantSummaries.map((s) => `• ${s}`).join("\n")}\n\nReview at: \`~/Documents/businesses/*/sales-drafts/\``,
        parse_mode: "Markdown", urgency: "P3",
        queued_at: new Date().toISOString(), sent_at: null,
      }, null, 2)
    );
  }
  console.log(`✓ ${total} drafts across ${tenantSummaries.length} tenants`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
