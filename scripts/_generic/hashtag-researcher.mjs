#!/usr/bin/env node
/**
 * hashtag-researcher.mjs <tenant-slug>
 *
 * Daily Gemini-grounded research into best hashtags per platform per niche.
 *
 *   - Per platform: Pinterest, IG, TikTok, LinkedIn, Twitter/X, YouTube Shorts
 *   - Three tiers per platform: low-volume (10k-100k), mid (100k-1M), high (1M+)
 *   - Recency bias — what's working in the last 30 days
 *
 * Output: ~/Documents/businesses/<tenant>/hashtags.json (overwritten daily)
 *
 * Other content engines (pinterest-pin-generator, tiktok-script-engine, etc.)
 * should read this file when generating hashtag arrays. Future iteration.
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  tenantSlug, loadEnv, loadTenant, audit, callGemini, parseJson, queueTelegram, BIZ, GEMINI_GROUNDED,
} from "./_lib.mjs";

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  const ctx = await loadTenant(slug);

  console.log(`→ Researching hashtags for ${ctx.display_name} (${ctx.niche})`);

  const prompt = `Use Google Search to find the BEST hashtags for "${ctx.niche}" on each major platform RIGHT NOW.

For each platform, give 3 tiers:
- low_volume (10k-100k posts) — easier to rank, faster reach for small accounts
- mid_volume (100k-1M) — sweet spot for growing accounts
- high_volume (1M+) — competitive but big audience

Bias toward hashtags that are working in the last 30 days (not just historical popularity).

Return STRICT JSON:
{
  "researched_at": "${new Date().toISOString()}",
  "niche": "${ctx.niche}",
  "platforms": {
    "pinterest": {
      "low_volume": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
      "mid_volume": ["#tag1", ... 5 entries],
      "high_volume": ["#tag1", ... 3 entries],
      "platform_note": "1-sentence note on what's working on Pinterest for this niche right now"
    },
    "instagram": { same shape },
    "tiktok": { same shape },
    "linkedin": { same shape },
    "twitter": { same shape, but tags without hashtag work too — use what's natural },
    "youtube_shorts": { same shape }
  },
  "do_not_use": ["#shadowbanned1", "#oversaturated2", ... reasons listed],
  "trending_this_week": [
    { "tag": "#trending", "platform": "tiktok|instagram|etc", "reason": "why it's spiking" }
  ]
}`;

  const research = parseJson(await callGemini(prompt, env, { temp: 0.4, useGrounding: true, model: GEMINI_GROUNDED, maxTokens: 6000 }));

  const outPath = path.join(BIZ, slug, "hashtags.json");
  await fs.writeFile(outPath, JSON.stringify(research, null, 2));

  const trending = research.trending_this_week?.slice(0, 5) || [];
  const lines = [
    `🏷 *Hashtag research — ${ctx.display_name}*`,
    ``,
    `Updated for all 6 platforms.`,
    trending.length ? `\n*Trending this week:*\n${trending.map((t) => `• ${t.tag} (${t.platform}) — ${t.reason?.slice(0, 60)}`).join("\n")}` : "",
    ``,
    `File: \`${outPath}\``,
  ];
  await queueTelegram(env, slug, lines.filter(Boolean).join("\n"));

  await audit(slug, { actor: "hashtag-researcher", action: "tags_researched", platforms: Object.keys(research.platforms || {}).length, path: outPath });
  console.log(`\n✓ ${outPath}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
