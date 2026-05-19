#!/usr/bin/env node
/**
 * tiktok-script-engine.mjs <tenant-slug>
 *
 * Generates 3 fully-storyboarded TikTok scripts per run.
 *
 * Each script includes:
 *   - 2-sec opening hook (stops scroll)
 *   - Beat-by-beat shot list (action + voiceover for each)
 *   - On-screen text overlays
 *   - 5-8 niche hashtags
 *   - Optimal posting window suggestion
 *
 * Saves: ~/Documents/businesses/<tenant>/tiktok-scripts/<date>/
 * Jack records based on these. Raw footage drops in raw-footage/ → video-pipeline-watcher
 * processes it.
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  tenantSlug, loadEnv, loadTenant, audit, callGemini, parseJson, queueTelegram, BIZ,
} from "./_lib.mjs";

const SCRIPTS_PER_RUN = 3;

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

  const ctx = await loadTenant(slug);
  if (!ctx.constitution) throw new Error(`No CONSTITUTION.md for ${slug}`);

  console.log(`→ Generating ${SCRIPTS_PER_RUN} TikTok scripts for ${ctx.display_name}`);

  const prompt = `You are a TikTok creator for "${ctx.display_name}" (${ctx.niche}). Generate ${SCRIPTS_PER_RUN} scripts.

CONSTITUTION:
${ctx.constitution.slice(0, 3000)}

${ctx.identity ? `BRAND IDENTITY:\n${JSON.stringify(ctx.identity).slice(0, 1500)}` : ""}

REQUIREMENTS PER SCRIPT:
- 15-30 seconds total
- Stops scroll in first 2 seconds (specific, weird, or contrarian opener)
- 3-5 beats / shot changes
- Each beat: action description + voiceover line + on-screen text
- Lands with a payoff that prompts comment/share
- NO "follow for more" / "this is your sign" / "POV:" openers
- Match brand voice exactly

VARIETY: 3 scripts must use DIFFERENT formats. Pick from:
- Talking-to-camera confession
- "Things X people say" listicle
- Show + tell with a product
- Hot take / contrarian
- Story (something that happened)
- Educational explainer
- React-to-stat

Return STRICT JSON array:
[
  {
    "slug": "kebab-case-3-words",
    "format": "one of the formats above",
    "hook_text": "first 2 seconds (max 8 words, on-screen + spoken)",
    "duration_seconds": 15-30,
    "beats": [
      { "time": "0-2s", "action": "what's happening visually", "voiceover": "what's spoken", "on_screen_text": "text overlay if any" },
      ... 3-5 beats
    ],
    "payoff": "the ending line/visual that lands the joke",
    "caption": "TikTok caption (max 150 chars)",
    "hashtags": ["#5to8", "#niche-specific", "#tags"],
    "best_post_time": "morning|midday|evening + reasoning"
  },
  ... ${SCRIPTS_PER_RUN} entries
]`;

  const scripts = parseJson(await callGemini(prompt, env, { temp: 0.85, maxTokens: 5000 }));

  const date = new Date().toISOString().slice(0, 10);
  const dir = path.join(BIZ, slug, "tiktok-scripts", date);
  await fs.mkdir(dir, { recursive: true });

  for (const s of scripts) {
    const fileName = `${s.slug}.md`;
    const lines = [
      `# TikTok script: ${s.slug}`,
      ``,
      `**Format:** ${s.format}`,
      `**Duration:** ${s.duration_seconds}s`,
      `**Best post time:** ${s.best_post_time}`,
      ``,
      `## Hook (first 2s)`,
      ``,
      `> ${s.hook_text}`,
      ``,
      `## Beat-by-beat`,
      ``,
      ...s.beats.flatMap((b, i) => [
        `### Beat ${i + 1} (${b.time})`,
        ``,
        `**Action:** ${b.action}`,
        `**Voiceover:** "${b.voiceover}"`,
        b.on_screen_text ? `**On-screen text:** ${b.on_screen_text}` : "",
        ``,
      ]).filter(Boolean),
      `## Payoff`,
      ``,
      `${s.payoff}`,
      ``,
      `## Caption`,
      ``,
      `${s.caption}`,
      ``,
      `## Hashtags`,
      ``,
      `${s.hashtags.join(" ")}`,
    ];
    await fs.writeFile(path.join(dir, fileName), lines.join("\n"));
  }

  // Index
  await fs.writeFile(
    path.join(dir, "_index.json"),
    JSON.stringify({ generated_at: new Date().toISOString(), tenant: slug, count: scripts.length, scripts }, null, 2)
  );

  await queueTelegram(
    env,
    slug,
    `🎥 *${scripts.length} TikTok scripts ready — ${ctx.display_name}*\n\n` +
      scripts.map((s) => `• _${s.format}_: "${s.hook_text}"`).join("\n") +
      `\n\nFolder: \`open ${dir}\`\n\nRecord, drop in \`~/Documents/businesses/${slug}/raw-footage/\` — video-pipeline-watcher will caption + cut.`
  );

  await audit(slug, { actor: "tiktok-script-engine", action: "scripts_generated", count: scripts.length, folder: dir });
  console.log(`\n✓ ${scripts.length} scripts → ${dir}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
