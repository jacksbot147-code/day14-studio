#!/usr/bin/env node
/**
 * cross-poster.mjs <tenant-slug> [--source <path>]
 *
 * Given one piece of source content (blog post, TikTok script, product launch),
 * generates platform-tailored variants for ALL channels:
 *   - Twitter/X thread (5-9 tweets)
 *   - LinkedIn post (1500-2000 char essay)
 *   - Instagram caption + carousel slides
 *   - Pinterest pin descriptions
 *   - Reddit post angle (for relevant subreddits)
 *   - Threads / Bluesky post
 *   - YouTube community post
 *   - Newsletter blurb
 *
 * Output: ~/Documents/businesses/<tenant>/cross-posts/<source-slug>/
 *
 * If --source not specified, picks the most recent blog post or TikTok script.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import {
  tenantSlug, loadEnv, loadTenant, audit, callGemini, parseJson, queueTelegram, BIZ,
} from "./_lib.mjs";

function getSourceArg() {
  const i = process.argv.indexOf("--source");
  return i !== -1 ? process.argv[i + 1] : null;
}

async function findLatestSource(slug) {
  const tDir = path.join(BIZ, slug);
  // Try blog drafts first
  const blogDir = path.join(tDir, "blog-drafts");
  if (existsSync(blogDir)) {
    const files = (await fs.readdir(blogDir)).filter((f) => f.endsWith(".md")).sort().reverse();
    if (files.length) {
      const filePath = path.join(blogDir, files[0]);
      return { type: "blog", path: filePath, content: await fs.readFile(filePath, "utf8") };
    }
  }
  // Fall back to TikTok script
  const ttDir = path.join(tDir, "tiktok-scripts");
  if (existsSync(ttDir)) {
    const dates = (await fs.readdir(ttDir)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse();
    for (const d of dates) {
      const idx = path.join(ttDir, d, "_index.json");
      if (existsSync(idx)) {
        const data = JSON.parse(await fs.readFile(idx, "utf8"));
        if (data.scripts?.length) return { type: "tiktok", path: idx, content: JSON.stringify(data.scripts[0]) };
      }
    }
  }
  return null;
}

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  const ctx = await loadTenant(slug);

  const sourcePath = getSourceArg();
  let source;
  if (sourcePath) {
    if (!existsSync(sourcePath)) throw new Error(`source not found: ${sourcePath}`);
    source = { type: "custom", path: sourcePath, content: await fs.readFile(sourcePath, "utf8") };
  } else {
    source = await findLatestSource(slug);
    if (!source) throw new Error("no source content found — generate a blog post or TikTok script first");
  }

  console.log(`→ Cross-posting from ${source.type}: ${path.basename(source.path)}`);

  const prompt = `Generate platform-tailored variants of the source content for "${ctx.display_name}" (${ctx.niche}).

CONSTITUTION (voice):
${ctx.constitution?.slice(0, 2500) || "(none)"}

SOURCE CONTENT (${source.type}):
${source.content.slice(0, 6000)}

Generate variants for each platform. Each must:
- Match the brand voice EXACTLY (read the constitution voice rules)
- Use the platform's native format (no copy-paste of same text)
- Lead with a specific hook, not "in this post..."

Return STRICT JSON:
{
  "twitter_thread": [
    "Tweet 1 (max 280 chars) — must hook",
    "Tweet 2",
    ... 5-9 tweets
  ],
  "linkedin": "1500-2000 char essay with line breaks, narrative arc",
  "instagram": {
    "caption": "150-400 chars, story-led, no link-in-bio reminder",
    "carousel_slides": ["Slide 1 max 8 words", "Slide 2 max 20", "Slide 3", "Slide 4", "Slide 5 max 20"],
    "hashtags": ["#10to15", "#niche-specific"]
  },
  "pinterest": {
    "title": "50-100 char SEO title",
    "description": "200-400 char description with keywords"
  },
  "reddit": {
    "suggested_subreddits": ["r/realsub1", "r/realsub2", "r/realsub3", "r/realsub4", "r/realsub5"],
    "post_title": "Reddit-native title (not clickbait)",
    "post_body": "Genuine post that adds value — not promotional. End mention of brand only at bottom if natural."
  },
  "threads": "Threads post (max 500 chars, conversational)",
  "bluesky": "Bluesky post (max 300 chars)",
  "youtube_community": "Community post (text, ends with question to drive engagement)",
  "newsletter_blurb": "100-200 word blurb for newsletter readers"
}`;

  const variants = parseJson(await callGemini(prompt, env, { temp: 0.8, maxTokens: 8000 }));

  // Save
  const sourceSlug = path.basename(source.path).replace(/\.[^.]+$/, "");
  const outDir = path.join(BIZ, slug, "cross-posts", sourceSlug);
  await fs.mkdir(outDir, { recursive: true });

  // Per-platform markdown files for easy copy-paste
  const platforms = {
    "twitter.md": `# Twitter/X thread\n\n${variants.twitter_thread.map((t, i) => `**Tweet ${i + 1}:**\n${t}\n`).join("\n")}`,
    "linkedin.md": `# LinkedIn\n\n${variants.linkedin}`,
    "instagram.md": `# Instagram\n\n## Caption\n\n${variants.instagram.caption}\n\n## Carousel slides\n\n${variants.instagram.carousel_slides.map((s, i) => `**${i + 1}.** ${s}`).join("\n")}\n\n## Hashtags\n\n${variants.instagram.hashtags.join(" ")}`,
    "pinterest.md": `# Pinterest\n\n**Title:** ${variants.pinterest.title}\n\n**Description:**\n${variants.pinterest.description}`,
    "reddit.md": `# Reddit\n\n**Suggested subreddits:** ${variants.reddit.suggested_subreddits.join(", ")}\n\n## Title\n${variants.reddit.post_title}\n\n## Body\n${variants.reddit.post_body}`,
    "threads.md": `# Threads\n\n${variants.threads}`,
    "bluesky.md": `# Bluesky\n\n${variants.bluesky}`,
    "youtube-community.md": `# YouTube Community\n\n${variants.youtube_community}`,
    "newsletter-blurb.md": `# Newsletter blurb\n\n${variants.newsletter_blurb}`,
  };
  for (const [fname, content] of Object.entries(platforms)) {
    await fs.writeFile(path.join(outDir, fname), content);
  }
  await fs.writeFile(path.join(outDir, "_all.json"), JSON.stringify(variants, null, 2));

  await queueTelegram(env, slug,
    `🔁 *Cross-posted across 8 platforms — ${ctx.display_name}*\n\nSource: \`${path.basename(source.path)}\`\n\nReady at: \`${outDir}\`\n\nTwitter thread, LinkedIn, IG, Pinterest, Reddit, Threads, Bluesky, YouTube community, newsletter — each in its own .md file.`
  );

  await audit(slug, { actor: "cross-poster", action: "variants_generated", source: source.path, platforms: Object.keys(platforms).length });
  console.log(`\n✓ 8 platform variants → ${outDir}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
