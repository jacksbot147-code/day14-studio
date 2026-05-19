#!/usr/bin/env node
/**
 * content-calendar-orchestrator.mjs <tenant-slug>
 *
 * Plans 30 days of content across all channels for one tenant.
 *
 * Output: ~/Documents/businesses/<tenant>/content-calendar.json
 *   {
 *     generated_at: "...",
 *     entries: [
 *       { date: "2026-05-19", day_of_week: "Mon", channel: "tiktok", angle: "...", status: "planned" },
 *       { date: "2026-05-19", channel: "pinterest", angle: "...", status: "planned" },
 *       ...
 *     ]
 *   }
 *
 * Channels: tiktok, pinterest, instagram_reels, blog, newsletter, twitter
 * Cadence rules (per archetype): defined inline below.
 *
 * Run weekly. The calendar feeds into other engines that check what's planned for today
 * and adjust their output accordingly.
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  tenantSlug, loadEnv, loadTenant, audit, callGemini, parseJson, queueTelegram, BIZ,
} from "./_lib.mjs";

const DAYS = 30;

// Default cadences per channel — POD-store optimized. Other archetypes may differ.
const CADENCES = {
  "pod-store": {
    tiktok: { freq: "daily", best_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
    pinterest: { freq: "daily", best_days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
    instagram_reels: { freq: "5x/week", best_days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    blog: { freq: "2x/week", best_days: ["Tue", "Thu"] },
    newsletter: { freq: "1x/week", best_days: ["Wed"] },
    twitter: { freq: "3x/week", best_days: ["Mon", "Wed", "Fri"] },
  },
  newsletter: {
    newsletter: { freq: "1x/week", best_days: ["Tue"] },
    blog: { freq: "1x/week", best_days: ["Thu"] },
    twitter: { freq: "5x/week", best_days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    linkedin: { freq: "3x/week", best_days: ["Mon", "Wed", "Fri"] },
    pinterest: { freq: "3x/week", best_days: ["Mon", "Wed", "Fri"] },
  },
  course: {
    youtube_short: { freq: "5x/week", best_days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    blog: { freq: "1x/week", best_days: ["Tue"] },
    newsletter: { freq: "1x/week", best_days: ["Wed"] },
    linkedin: { freq: "3x/week", best_days: ["Tue", "Thu", "Fri"] },
    twitter: { freq: "3x/week", best_days: ["Mon", "Wed", "Fri"] },
  },
  agency: {
    linkedin: { freq: "5x/week", best_days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    newsletter: { freq: "1x/week", best_days: ["Wed"] },
    blog: { freq: "1x/week", best_days: ["Thu"] },
    twitter: { freq: "3x/week", best_days: ["Mon", "Wed", "Fri"] },
  },
};

function dayName(d) { return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]; }

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

  const ctx = await loadTenant(slug);
  if (!ctx.constitution) throw new Error(`No CONSTITUTION.md for ${slug}`);

  const archetype = ctx.tenant?.type || "pod-store";
  const cadence = CADENCES[archetype] || CADENCES["pod-store"];
  console.log(`→ Building 30-day calendar for ${ctx.display_name} (${archetype})`);

  // Build the date+channel scaffolding
  const today = new Date();
  const scaffold = [];
  for (let i = 0; i < DAYS; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayStr = date.toISOString().slice(0, 10);
    const dn = dayName(date);
    for (const [channel, rule] of Object.entries(cadence)) {
      if (rule.best_days.includes(dn)) {
        scaffold.push({ date: dayStr, day_of_week: dn, channel, angle: null, status: "planned" });
      }
    }
  }

  // Get Gemini to fill in the angles
  const prompt = `Plan 30 days of content for "${ctx.display_name}" (${ctx.niche}).

CONSTITUTION:
${ctx.constitution.slice(0, 3000)}

I've scaffolded the dates + channels below based on optimal cadence. For each entry, fill in a SPECIFIC angle (not generic). Vary the angles — don't repeat the same theme.

SCAFFOLD (${scaffold.length} entries):
${JSON.stringify(scaffold, null, 2).slice(0, 6000)}

Return STRICT JSON array. Same length and order as scaffold. Each entry adds an "angle" string (15-30 words describing the specific content piece):

[
  { "date": "...", "day_of_week": "...", "channel": "...", "angle": "specific angle for this date+channel", "status": "planned" },
  ...
]`;

  const entries = parseJson(await callGemini(prompt, env, { temp: 0.8, maxTokens: 12000 }));

  const out = {
    generated_at: new Date().toISOString(),
    tenant: slug,
    archetype,
    days_planned: DAYS,
    entries_total: entries.length,
    cadence_rules: cadence,
    entries,
  };
  const outPath = path.join(BIZ, slug, "content-calendar.json");
  await fs.writeFile(outPath, JSON.stringify(out, null, 2));

  // Pretty summary
  const channelCounts = {};
  for (const e of entries) channelCounts[e.channel] = (channelCounts[e.channel] || 0) + 1;

  const summary = Object.entries(channelCounts).map(([c, n]) => `  • ${c}: ${n}`).join("\n");

  await queueTelegram(
    env,
    slug,
    `🗓 *30-day calendar planned — ${ctx.display_name}*\n\n${entries.length} entries:\n${summary}\n\nFile: \`${outPath}\`\n\nDaily engines will pull today's planned angles automatically.`
  );

  await audit(slug, { actor: "content-calendar-orchestrator", action: "calendar_planned", entries: entries.length, path: outPath });
  console.log(`\n✓ ${entries.length} entries across ${Object.keys(channelCounts).length} channels`);
  console.log(`  ${outPath}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
