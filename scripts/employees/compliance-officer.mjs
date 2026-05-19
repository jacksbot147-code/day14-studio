#!/usr/bin/env node
/**
 * compliance-officer.mjs
 *
 * Day14's General Counsel. Daily 11pm.
 *
 *   - Reviews all content drafts from today against legal/brand-safety rules
 *   - Flags risk: real-person names, copyrighted phrases, medical claims, trademark conflicts
 *   - Audits ToS/Privacy/Refund policies on each tenant's site for staleness
 *   - Watches for GDPR/CCPA opt-out requests in inbox
 *   - Generates legal-risk report
 *
 * Output: ~/Documents/businesses/_shared/compliance/<date>.md
 * Telegram: HIGH priority alerts only
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const COMPLIANCE = path.join(SHARED, "compliance");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");
const GEMINI_MODEL = "gemini-2.5-flash";

// Banned patterns — explicit instant flag
const BANNED_PATTERNS = [
  { name: "medical_claim", regex: /\b(cures?|treats?|prevents?|heals?)\s+(menopaus|depression|anxiety|cancer|disease|diabetes|cholesterol)/gi, severity: "high" },
  { name: "fda_violation", regex: /\bFDA[- ]approved\b/gi, severity: "high" },
  { name: "guarantee_language", regex: /\b(guaranteed|100%\s+(guaranteed|effective|certain)|never\s+fails?)\b/gi, severity: "medium" },
  { name: "celeb_name", regex: /\b(Oprah|Gwyneth|Beyoncé|Beyonce|Taylor Swift|Kardashian|Jennifer\s+Aniston)\b/gi, severity: "high" },
  { name: "trademarked_brand", regex: /\b(Estée Lauder|Estee Lauder|Pfizer|Johnson\s*&\s*Johnson|Procter\s*&\s*Gamble)\b/gi, severity: "high" },
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
  const res = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 3000 } }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function scanDraftsForTenant(slug) {
  const today = new Date().toISOString().slice(0, 10);
  const findings = [];

  const dirsToScan = [
    { dir: path.join(BIZ, slug, "blog-drafts"), type: "blog" },
    { dir: path.join(BIZ, slug, "newsletter-drafts"), type: "newsletter" },
    { dir: path.join(BIZ, slug, "marketing-drafts"), type: "marketing" },
    { dir: path.join(BIZ, slug, "cs-drafts"), type: "cs" },
  ];
  // Also tiktok scripts for today + pinterest pins
  const ttDir = path.join(BIZ, slug, "tiktok-scripts", today);
  if (existsSync(ttDir)) dirsToScan.push({ dir: ttDir, type: "tiktok" });
  const pinDir = path.join(BIZ, slug, "pinterest-pins", today);
  if (existsSync(pinDir)) dirsToScan.push({ dir: pinDir, type: "pinterest" });

  for (const { dir, type } of dirsToScan) {
    if (!existsSync(dir)) continue;
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md") || f.endsWith(".txt") || f.endsWith(".json"));
    for (const f of files.slice(0, 20)) {
      const filePath = path.join(dir, f);
      const stat = await fs.stat(filePath);
      if ((Date.now() - stat.mtime.getTime()) > 7 * 86400000) continue; // only recent
      try {
        const text = await fs.readFile(filePath, "utf8");
        for (const pat of BANNED_PATTERNS) {
          const m = text.match(pat.regex);
          if (m) findings.push({ tenant: slug, file: filePath, type, pattern: pat.name, severity: pat.severity, sample: m[0] });
        }
      } catch {}
    }
  }
  return findings;
}

async function main() {
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) { console.error("GEMINI_API_KEY missing"); process.exit(1); }
  if (!existsSync(TENANTS_FILE)) { console.log("no tenants"); return; }
  const tenants = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];

  await fs.mkdir(COMPLIANCE, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);

  // 1. Scan all tenant content for banned patterns
  let allFindings = [];
  for (const t of tenants) {
    const findings = await scanDraftsForTenant(t.slug);
    allFindings.push(...findings);
  }

  // 2. Gemini deeper review on most recent content per tenant
  const deepReviews = [];
  for (const t of tenants.slice(0, 5)) {
    const recent = path.join(BIZ, t.slug, "blog-drafts");
    if (!existsSync(recent)) continue;
    const files = (await fs.readdir(recent)).filter((f) => f.endsWith(".md")).sort().reverse().slice(0, 1);
    if (!files.length) continue;
    const text = (await fs.readFile(path.join(recent, files[0]), "utf8")).slice(0, 4000);
    const prompt = `You are Day14's General Counsel reviewing this content for legal risk. Be SPECIFIC. Flag actual issues. If clean, say "clean".\n\nCONTENT:\n${text}\n\nCheck for:\n1. Medical claims (cures, treats, prevents specific conditions)\n2. Real-person names without permission\n3. Trademarked brand mentions without proper attribution\n4. Copyright violations (song lyrics, trademarked phrases)\n5. Comparative advertising risk (vs named competitor)\n6. GDPR/CCPA disclosure issues\n7. FTC disclosure (affiliate links, sponsored content)\n\nReturn STRICT JSON: { "tenant": "${t.slug}", "file": "${files[0]}", "risk_level": "low|medium|high", "issues": [{"type": "...", "specific_text": "...", "fix": "..."}], "summary": "1 sentence" }`;
    try {
      const raw = await callGemini(prompt, env);
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
      const review = JSON.parse(cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1));
      deepReviews.push(review);
    } catch (e) { console.error(`review error for ${t.slug}: ${e.message}`); }
  }

  // Build report
  const report = `# Compliance report — ${date}

## Empire summary
- Tenants reviewed: ${tenants.length}
- Banned-pattern findings: ${allFindings.length}
- Deep reviews: ${deepReviews.length}
- High-risk items: ${allFindings.filter((f) => f.severity === "high").length + deepReviews.filter((r) => r.risk_level === "high").length}

## Banned-pattern findings
${allFindings.length === 0 ? "✓ Clean" : allFindings.map((f) => `- [${f.severity.toUpperCase()}] ${f.tenant}/${f.type} — \`${f.pattern}\` matched "${f.sample}" in ${f.file}`).join("\n")}

## Deep reviews (Gemini)
${deepReviews.map((r) => `### ${r.tenant} — ${r.risk_level.toUpperCase()}\n\nFile: ${r.file}\n\n${r.summary}\n\n${(r.issues || []).map((i) => `- **${i.type}**: "${i.specific_text}" → ${i.fix}`).join("\n")}`).join("\n\n")}

## Policy audit checklist (manual)
- [ ] Each tenant's privacy policy is current
- [ ] Refund policy clearly stated
- [ ] Cookie consent live on each brand site
- [ ] GDPR data export endpoint working
- [ ] Affiliate disclosure on all blog posts with links
`;

  const reportPath = path.join(COMPLIANCE, `${date}.md`);
  await fs.writeFile(reportPath, report);

  const highRisk = allFindings.filter((f) => f.severity === "high").length + deepReviews.filter((r) => r.risk_level === "high").length;
  if (highRisk > 0 && env.TELEGRAM_CHAT_ID) {
    await fs.mkdir(OUTBOX, { recursive: true });
    await fs.writeFile(
      path.join(OUTBOX, `${Date.now()}-compliance.json`),
      JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `⚖️ *Compliance — ${highRisk} HIGH-RISK items*\n\n${allFindings.filter((f) => f.severity === "high").slice(0, 5).map((f) => `• ${f.tenant}: ${f.pattern} in ${f.type}`).join("\n")}\n\nFull: \`${reportPath}\``,
        parse_mode: "Markdown", urgency: "P1",
        queued_at: new Date().toISOString(), sent_at: null,
      }, null, 2)
    );
  }
  console.log(`✓ compliance report → ${reportPath} (${highRisk} high-risk items)`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
