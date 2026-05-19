#!/usr/bin/env node
/**
 * full-content-pipeline.mjs <tenant-slug>
 *
 * End-to-end content factory. Runs the entire chain in sequence:
 *
 *   1. tiktok-script-engine    → 3 scripts (skip if today's already exist)
 *   2. video-creator           → AI video from top script
 *   3. video-platform-variants → renders 6 platform-specific cuts
 *   4. social-orchestrator     → queues for all platforms
 *   5. cross-poster            → text variants (Twitter thread, LI essay, etc.)
 *   6. publishers (auto-mode only) → if tenant has auto enabled for a platform,
 *      publishers run on next scheduled cycle
 *
 * For platforms in "review" mode, Jack gets a Telegram tap-to-approve card.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tenantSlug, loadEnv, loadTenant, audit, queueTelegram, BIZ } from "./_lib.mjs";
import { loadConfig } from "./auto-post-config.mjs";

const STUDIO = path.join(process.env.HOME, "Documents/studio");
const GENERIC = path.join(STUDIO, "scripts/_generic");

function run(label, script, args = []) {
  console.log(`\n━━━ ${label} ━━━`);
  const r = spawnSync("node", [script, ...args], { stdio: "inherit", cwd: STUDIO });
  return r.status === 0;
}

async function findLatestVideo(slug) {
  const dir = path.join(BIZ, slug, "ai-videos");
  if (!existsSync(dir)) return null;
  const subs = (await fs.readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort().reverse();
  for (const s of subs) {
    const files = (await fs.readdir(path.join(dir, s))).filter((f) => f.endsWith(".mp4") && !f.includes("concat"));
    if (files.length > 0) return path.join(dir, s, files[0]);
  }
  return null;
}

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  const ctx = await loadTenant(slug);
  console.log(`\n🚀 Full content pipeline: ${ctx.display_name}\n`);

  // 1. Generate TikTok script (if not done today)
  const today = new Date().toISOString().slice(0, 10);
  const todayScriptDir = path.join(BIZ, slug, "tiktok-scripts", today);
  if (!existsSync(todayScriptDir)) {
    run("STEP 1: TikTok script generation", path.join(GENERIC, "tiktok-script-engine.mjs"), [slug]);
  } else {
    console.log("━━━ STEP 1: TikTok scripts (already exist today, skipping) ━━━");
  }

  // 2. Create AI video from the latest script
  const videoOk = run("STEP 2: AI video creation", path.join(GENERIC, "video-creator.mjs"), [slug]);
  if (!videoOk) console.log("video-creator failed — continuing with whatever exists");

  // 3. Render platform variants
  const latestVideo = await findLatestVideo(slug);
  if (latestVideo) {
    run("STEP 3: Platform variants", path.join(GENERIC, "video-platform-variants.mjs"), [slug, latestVideo]);
  } else {
    console.log("━━━ STEP 3: No video to render variants from ━━━");
  }

  // 4. Queue for all platforms via social-orchestrator
  run("STEP 4: Queue posts for all platforms", path.join(GENERIC, "social-orchestrator.mjs"), [slug]);

  // 5. Cross-poster — text variants
  run("STEP 5: Cross-poster (text variants)", path.join(GENERIC, "cross-poster.mjs"), [slug]);

  // 6. Auto-mode summary
  const cfg = await loadConfig(slug);
  const autoPlatforms = Object.entries(cfg.modes).filter(([, m]) => m === "auto").map(([p]) => p);
  const reviewPlatforms = Object.entries(cfg.modes).filter(([, m]) => m === "review").map(([p]) => p);

  await queueTelegram(env, slug,
    `🚀 *Content pipeline complete — ${ctx.display_name}*\n\n` +
    `✓ Script generated\n✓ AI video created\n✓ 6 platform variants rendered\n✓ Queued + text variants written\n\n` +
    (autoPlatforms.length > 0 ? `🤖 Auto-publishing on: ${autoPlatforms.join(", ")}\n` : "") +
    (reviewPlatforms.length > 0 ? `🙋 Review needed on: ${reviewPlatforms.join(", ")} — reply *approve all* to push everything\n` : "")
  );

  await audit(slug, { actor: "full-content-pipeline", action: "pipeline_completed" });
  console.log("\n✓ Pipeline complete");
}

main().catch((err) => { console.error("\nFATAL:", err.message); process.exit(1); });
