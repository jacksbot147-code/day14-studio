#!/usr/bin/env node
/**
 * trend-watcher.mjs <tenant-slug>
 *
 * Daily Gemini grounded-search for trends in the tenant's niche.
 *
 * Output: ~/Documents/businesses/<tenant>/trends.json (overwritten each day)
 *   - 10 trending topics with descriptions + suggested content angles
 *   - 5 trending product types
 *   - 3 emerging keywords
 *   - 3 declining trends to avoid
 *
 * Feeds into daily-engine, blog-post-engine, tiktok-script-engine — they read
 * trends.json on each run to stay fresh.
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  tenantSlug, loadEnv, loadTenant, audit, callGemini, parseJson, queueTelegram, BIZ, GEMINI_GROUNDED,
} from "./_lib.mjs";

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

  const ctx = await loadTenant(slug);
  if (!ctx.tenant) throw new Error(`tenant ${slug} not registered`);
  console.log(`→ Scanning trends for ${ctx.display_name} (${ctx.niche})`);

  const prompt = `Use Google Search to find what's TRENDING NOW for the niche: "${ctx.niche}"

Focus on the last 60 days. Real data only — no guessing.

Return STRICT JSON:
{
  "scanned_at": "${new Date().toISOString()}",
  "niche": "${ctx.niche}",
  "trending_topics": [
    {
      "topic": "specific trending angle",
      "evidence": "why it's trending — search volume / social mentions / news / specific data point you found",
      "content_angle": "how WE could ride this trend with content in our voice",
      "urgency": "high|medium|low — how quickly to capitalize"
    },
    ... 10 entries
  ],
  "trending_product_types": [
    { "product_type": "...", "evidence": "...", "fit_for_us": "high|medium|low" },
    ... 5 entries
  ],
  "emerging_keywords": [
    { "keyword": "...", "context": "why people are searching this now" },
    ... 3 entries
  ],
  "declining_trends": [
    { "trend": "stale angle to avoid", "reason": "why it's tired" },
    ... 3 entries
  ]
}`;

  const trends = parseJson(await callGemini(prompt, env, { temp: 0.4, useGrounding: true, model: GEMINI_GROUNDED, maxTokens: 5000 }));

  const outPath = path.join(BIZ, slug, "trends.json");
  await fs.writeFile(outPath, JSON.stringify(trends, null, 2));

  const top3 = (trends.trending_topics || []).slice(0, 3);
  await queueTelegram(
    env,
    slug,
    `📈 *Trends scanned — ${ctx.display_name}*\n\n` +
      top3.map((t, i) => `${i + 1}. *${t.topic}*\n   ${t.content_angle?.slice(0, 100)}`).join("\n\n") +
      `\n\nFull: \`${outPath}\``
  );

  await audit(slug, { actor: "trend-watcher", action: "trends_scanned", count: trends.trending_topics?.length || 0, path: outPath });
  console.log(`\n✓ ${trends.trending_topics?.length || 0} trends scanned → ${outPath}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
