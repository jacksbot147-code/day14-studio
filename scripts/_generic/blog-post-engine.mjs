#!/usr/bin/env node
/**
 * blog-post-engine.mjs <tenant-slug>
 *
 * Generates 1 SEO-optimized long-form blog post per run.
 *   - 1500-2200 words
 *   - H1, H2, H3 structure
 *   - Internal product mention (CTA back to Printify store)
 *   - 5-8 outbound links to authoritative sources (Gemini grounded)
 *   - Meta description + slug + tags
 *
 * Saves: ~/Documents/businesses/<tenant>/blog-drafts/<date>-<slug>.md
 * Telegram-pings with title + slug + word count.
 *
 * Run daily via LaunchAgent OR on demand.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import {
  tenantSlug, loadEnv, loadTenant, audit, callGemini, parseJson, queueTelegram, BIZ, GEMINI_GROUNDED,
} from "./_lib.mjs";

async function recentTopics(slug, n = 10) {
  const dir = path.join(BIZ, slug, "blog-drafts");
  if (!existsSync(dir)) return [];
  const files = await fs.readdir(dir);
  return files.slice(-n).map((f) => f.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, ""));
}

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

  const ctx = await loadTenant(slug);
  if (!ctx.constitution) throw new Error(`No CONSTITUTION.md for ${slug}`);

  const recent = await recentTopics(slug, 10);
  console.log(`→ Generating blog post for ${ctx.display_name} (recent: ${recent.length})`);

  // Step 1: pick a topic that's both SEO-valuable and brand-aligned
  const topicPrompt = `You are the head of content for "${ctx.display_name}" (${ctx.niche}).

CONSTITUTION:
${ctx.constitution.slice(0, 2500)}

${ctx.research?.search_terms_to_target ? `\nSEARCH TERMS TO TARGET (from competitor research):\n${ctx.research.search_terms_to_target.join("\n")}` : ""}

RECENT POSTS (do NOT repeat):
${recent.join("\n") || "(none yet)"}

Pick ONE blog post topic that:
- Targets a specific long-tail search query our audience types into Google
- Solves a concrete problem in the niche
- Naturally allows linking to our Printify products
- Hasn't been covered recently

Return STRICT JSON:
{
  "slug": "kebab-case-url-slug (5-8 words)",
  "title": "H1 title that's SEO + clickable (50-65 chars)",
  "search_intent": "what the reader is trying to do",
  "primary_keyword": "main long-tail keyword",
  "secondary_keywords": ["3-5 related keywords"],
  "outline": [
    "H2 section 1",
    "H2 section 2",
    "H2 section 3",
    "H2 section 4 (CTA / product mention)",
    "H2 section 5 (wrap)"
  ],
  "meta_description": "150-160 char meta description"
}`;

  const topic = parseJson(await callGemini(topicPrompt, env, { temp: 0.6, useGrounding: true, model: GEMINI_GROUNDED }));

  // Step 2: draft the actual post
  const draftPrompt = `Write the full blog post body for "${ctx.display_name}".

TOPIC:
${JSON.stringify(topic, null, 2)}

CONSTITUTION (voice rules):
${ctx.constitution.slice(0, 3000)}

REQUIREMENTS:
- 1500-2200 words total
- Use the outline H2s exactly as planned
- Open with a story or surprising stat (hook, not "In this article...")
- Include the primary keyword in the first 100 words
- 5-8 outbound links to authoritative sources (use Google Search to find REAL URLs — no hallucinated ones)
- ONE natural mention of our Printify products with a CTA link to https://printify.com/app/store (we'll replace with real URL later)
- Match the brand voice EXACTLY — no "in conclusion", no "buckle up", no "you got this"
- Markdown formatting (## for H2, ### for H3, [text](url) for links)

Return ONLY the markdown body, no frontmatter, no JSON wrapper. Start with the first paragraph (not the H1 — we'll add that separately).`;

  const body = await callGemini(draftPrompt, env, { temp: 0.65, maxTokens: 8000, useGrounding: true, model: GEMINI_GROUNDED });

  // Step 3: assemble + save
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${date}-${topic.slug}.md`;
  const dir = path.join(BIZ, slug, "blog-drafts");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);

  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const frontmatter = `---
title: "${topic.title.replace(/"/g, '\\"')}"
slug: ${topic.slug}
date: ${date}
status: draft
meta_description: "${topic.meta_description.replace(/"/g, '\\"')}"
primary_keyword: ${topic.primary_keyword}
secondary_keywords: ${JSON.stringify(topic.secondary_keywords)}
tenant: ${slug}
word_count: ${wordCount}
generated_by: blog-post-engine
---

# ${topic.title}

`;
  await fs.writeFile(filePath, frontmatter + body.trim() + "\n");

  await queueTelegram(
    env,
    slug,
    `📝 *Blog post drafted — ${ctx.display_name}*\n\n*${topic.title}*\n\n${wordCount} words · keyword: \`${topic.primary_keyword}\`\n\nDraft: \`${filePath}\`\n\nReply *publish blog ${topic.slug}* when ready to ship.`
  );

  await audit(slug, { actor: "blog-post-engine", action: "post_drafted", slug: topic.slug, word_count: wordCount, path: filePath });
  console.log(`\n✓ ${topic.title}\n  ${wordCount} words → ${filePath}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
