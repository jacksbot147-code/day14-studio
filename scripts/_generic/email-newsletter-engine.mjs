#!/usr/bin/env node
/**
 * email-newsletter-engine.mjs <tenant-slug>
 *
 * Generates one weekly newsletter issue per run.
 *
 *   Structure: hook → main story → product nudge → quick links → sign-off
 *   Length: 250-450 words (mobile-friendly)
 *   Output: ~/Documents/businesses/<tenant>/newsletter-drafts/<date>-issue-NNN.md
 *
 * Telegram-pings Jack with subject + first 2 lines + draft path.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import {
  tenantSlug, loadEnv, loadTenant, audit, callGemini, parseJson, queueTelegram, BIZ,
} from "./_lib.mjs";

async function nextIssueNumber(slug) {
  const dir = path.join(BIZ, slug, "newsletter-drafts");
  if (!existsSync(dir)) return 1;
  const files = await fs.readdir(dir);
  const nums = files.map((f) => parseInt(f.match(/issue-(\d+)/)?.[1] || "0", 10));
  return Math.max(0, ...nums) + 1;
}

async function recentSubjects(slug, n = 10) {
  const dir = path.join(BIZ, slug, "newsletter-drafts");
  if (!existsSync(dir)) return [];
  const files = await fs.readdir(dir);
  const out = [];
  for (const f of files.slice(-n)) {
    try {
      const text = await fs.readFile(path.join(dir, f), "utf8");
      const m = text.match(/^subject:\s*"?([^"\n]+)"?/m);
      if (m) out.push(m[1]);
    } catch {}
  }
  return out;
}

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

  const ctx = await loadTenant(slug);
  if (!ctx.constitution) throw new Error(`No CONSTITUTION.md for ${slug}`);

  const issueNum = await nextIssueNumber(slug);
  const recent = await recentSubjects(slug, 10);
  console.log(`→ Drafting newsletter issue #${issueNum} for ${ctx.display_name}`);

  const prompt = `You are drafting newsletter issue #${issueNum} for "${ctx.display_name}" (${ctx.niche}).

CONSTITUTION:
${ctx.constitution.slice(0, 3000)}

RECENT SUBJECTS (don't repeat angle):
${recent.join("\n") || "(none yet — this is issue 1)"}

STRUCTURE (must follow):
1. Hook: surprising observation or contrarian take (1-2 sentences)
2. Story / main idea: 2-4 short paragraphs developing the hook
3. Product nudge: ONE natural plug for a Hot Flash Co (or relevant) product, woven in (not "buy now!")
4. Quick hits: 3 bullet points — links to interesting things (real, find via knowledge)
5. Sign-off: "— Jack" (no PS, no "happy reading")

Total length: 250-450 words. Mobile-readable. Voice strictly per constitution.

Return STRICT JSON:
{
  "subject_line": "max 50 chars, curiosity-driving",
  "preview_text": "max 90 chars, complements subject",
  "body_markdown": "full body in markdown — H1 not needed, just paragraphs and bullets"
}`;

  const issue = parseJson(await callGemini(prompt, env, { temp: 0.75, maxTokens: 3000 }));

  const date = new Date().toISOString().slice(0, 10);
  const filename = `${date}-issue-${String(issueNum).padStart(3, "0")}.md`;
  const dir = path.join(BIZ, slug, "newsletter-drafts");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);

  const frontmatter = `---
subject: "${issue.subject_line.replace(/"/g, '\\"')}"
preview: "${issue.preview_text.replace(/"/g, '\\"')}"
issue: ${issueNum}
date: ${date}
status: draft
tenant: ${slug}
generated_by: email-newsletter-engine
---

`;
  await fs.writeFile(filePath, frontmatter + issue.body_markdown.trim() + "\n");

  await queueTelegram(
    env,
    slug,
    `📧 *Newsletter #${issueNum} drafted — ${ctx.display_name}*\n\n*Subject:* ${issue.subject_line}\n*Preview:* ${issue.preview_text}\n\nDraft: \`${filePath}\`\n\nReply *send newsletter ${issueNum}* to push via Resend (when wired).`
  );

  await audit(slug, { actor: "email-newsletter-engine", action: "issue_drafted", issue: issueNum, subject: issue.subject_line, path: filePath });
  console.log(`\n✓ Issue #${issueNum}: "${issue.subject_line}"\n  → ${filePath}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
