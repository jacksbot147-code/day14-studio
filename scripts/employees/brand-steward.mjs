#!/usr/bin/env node
/**
 * brand-steward.mjs
 *
 * Day14's Brand Steward. Watches every piece of generated content against
 * each tenant's CONSTITUTION voice rules. Flags drift.
 *
 *   Daily 10pm. For each tenant:
 *     1. Loads CONSTITUTION (voice rules yes/no, banned phrases)
 *     2. Scans last 24h of content drafts (blog, newsletter, tiktok, pinterest, marketing, sales)
 *     3. Per draft: scores voice fit 0-100 + flags specific violations
 *     4. Generates a "Brand Health" score for the tenant
 *
 * Output: ~/Documents/businesses/<tenant>/brand-health.json
 *         ~/Documents/businesses/_shared/brand-health-empire.md
 *
 * Telegram: only if any tenant drops below 70 (drift alert)
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

const CONTENT_DIRS = [
  { dir: "blog-drafts", type: "blog" },
  { dir: "newsletter-drafts", type: "newsletter" },
  { dir: "marketing-drafts", type: "marketing" },
  { dir: "cs-drafts", type: "cs" },
  { dir: "sales-drafts", type: "sales" },
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

async function callGemini(prompt, env) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 2500 } }) });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function parseJson(raw) {
  const c = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
  const o = c.indexOf("{"), oe = c.lastIndexOf("}");
  return JSON.parse(c.slice(o, oe + 1));
}

async function collectRecentDrafts(slug) {
  const cutoff = Date.now() - 24 * 60 * 60_000;
  const samples = [];
  for (const { dir, type } of CONTENT_DIRS) {
    const fullDir = path.join(BIZ, slug, dir);
    if (!existsSync(fullDir)) continue;
    const entries = await fs.readdir(fullDir, { withFileTypes: true });
    for (const e of entries) {
      const fpath = path.join(fullDir, e.name);
      if (e.isDirectory()) {
        // For sales-drafts/<date>/outreach.md etc
        const subFiles = (await fs.readdir(fpath)).filter((f) => f.endsWith(".md") || f.endsWith(".json"));
        for (const sf of subFiles) {
          const stat = await fs.stat(path.join(fpath, sf));
          if (stat.mtime.getTime() < cutoff) continue;
          samples.push({ type, path: path.join(fpath, sf) });
        }
      } else if (e.name.endsWith(".md")) {
        const stat = await fs.stat(fpath);
        if (stat.mtime.getTime() < cutoff) continue;
        samples.push({ type, path: fpath });
      }
    }
  }
  return samples.slice(0, 12); // cap per tenant
}

async function processTenant(tenant, env) {
  const slug = tenant.slug;
  const constPath = path.join(BIZ, slug, "CONSTITUTION.md");
  if (!existsSync(constPath)) return null;
  const constitution = (await fs.readFile(constPath, "utf8")).slice(0, 4000);

  const samples = await collectRecentDrafts(slug);
  if (samples.length === 0) return { slug, score: null, sample_count: 0 };

  // Build samples text
  const samplesText = [];
  for (const s of samples) {
    try {
      const txt = (await fs.readFile(s.path, "utf8")).slice(0, 1500);
      samplesText.push(`## ${s.type} — ${path.basename(s.path)}\n\n${txt}`);
    } catch {}
  }

  const prompt = `You are Brand Steward for "${tenant.display_name}". Score how well today's content matches the constitution voice.

CONSTITUTION:
${constitution}

CONTENT SAMPLES FROM LAST 24h:
${samplesText.join("\n\n---\n\n").slice(0, 10000)}

Return STRICT JSON:
{
  "overall_score": 0-100,
  "voice_fit": 0-100,
  "banned_phrase_violations": [{ "file": "...", "phrase": "...", "fix": "..." }],
  "drift_detected": ["specific patterns drifting from voice"],
  "wins": ["specific moments the voice nailed it"],
  "top_3_fixes": ["concrete action items"]
}`;

  const score = parseJson(await callGemini(prompt, env));
  score.tenant = slug;
  score.scored_at = new Date().toISOString();
  score.sample_count = samples.length;

  await fs.writeFile(path.join(BIZ, slug, "brand-health.json"), JSON.stringify(score, null, 2));
  return score;
}

async function main() {
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
  if (!existsSync(TENANTS_FILE)) return;

  const tenants = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];
  const results = [];
  for (const t of tenants) {
    try {
      const r = await processTenant(t, env);
      if (r) results.push({ ...r, name: t.display_name });
    } catch (e) { console.error(`${t.slug}: ${e.message}`); }
  }

  // Empire report
  const date = new Date().toISOString().slice(0, 10);
  const empireMd = [
    `# Brand Health — Empire (${date})`,
    ``,
    `| Tenant | Score | Voice Fit | Samples | Drift |`,
    `|---|---|---|---|---|`,
    ...results.map((r) => `| ${r.name} | ${r.overall_score ?? "—"} | ${r.voice_fit ?? "—"} | ${r.sample_count} | ${(r.drift_detected || []).length} |`),
    ``,
    `## Detailed findings`,
    ...results.map((r) => r.overall_score == null ? "" : `### ${r.name} — ${r.overall_score}/100\n\n${(r.wins || []).map((w) => `✓ ${w}`).join("\n")}\n\n${(r.drift_detected || []).map((d) => `⚠ ${d}`).join("\n")}\n\n**Top fixes:** ${(r.top_3_fixes || []).join("; ")}`),
  ];
  await fs.writeFile(path.join(SHARED, "brand-health-empire.md"), empireMd.join("\n"));

  // Telegram alert only on drift
  const drifts = results.filter((r) => r.overall_score != null && r.overall_score < 70);
  if (drifts.length > 0 && env.TELEGRAM_CHAT_ID) {
    await fs.mkdir(OUTBOX, { recursive: true });
    await fs.writeFile(
      path.join(OUTBOX, `${Date.now()}-brand-steward.json`),
      JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `🎨 *Brand drift detected*\n\n${drifts.map((d) => `• ${d.name}: ${d.overall_score}/100\n  Top issue: ${(d.drift_detected || ["—"])[0]?.slice(0, 100)}`).join("\n")}\n\nFull report: \`~/Documents/businesses/_shared/brand-health-empire.md\``,
        parse_mode: "Markdown", urgency: "P2",
        queued_at: new Date().toISOString(), sent_at: null,
      }, null, 2)
    );
  }
  console.log(`✓ scored ${results.length} tenants (${drifts.length} drift alerts)`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
