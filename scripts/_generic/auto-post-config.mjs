#!/usr/bin/env node
/**
 * auto-post-config.mjs <tenant-slug> [--set <platform>=<auto|review>] [--show]
 *
 * Per-tenant per-platform auto-publishing toggle.
 *
 * Stored at: ~/Documents/businesses/<tenant>/social-auto-config.json
 *
 * Modes:
 *   - "review" (default): Jack-tap required before publishing
 *   - "auto": skip Jack-tap, publishers go directly to posted
 *
 * CLI:
 *   node auto-post-config.mjs hot-flash-co --show
 *   node auto-post-config.mjs hot-flash-co --set pinterest=auto
 *   node auto-post-config.mjs hot-flash-co --set tiktok=review
 *
 * Or import and call setMode / getMode / isAuto from other scripts.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");

const PLATFORMS = ["pinterest", "instagram_reels", "instagram_feed", "tiktok", "youtube_shorts", "linkedin", "threads", "twitter", "blog", "newsletter"];

export async function loadConfig(slug) {
  const f = path.join(BIZ, slug, "social-auto-config.json");
  if (!existsSync(f)) {
    const def = {
      tenant: slug,
      created_at: new Date().toISOString(),
      modes: Object.fromEntries(PLATFORMS.map((p) => [p, "review"])),
    };
    await fs.mkdir(path.dirname(f), { recursive: true });
    await fs.writeFile(f, JSON.stringify(def, null, 2));
    return def;
  }
  return JSON.parse(await fs.readFile(f, "utf8"));
}

export async function setMode(slug, platform, mode) {
  if (!PLATFORMS.includes(platform)) throw new Error(`unknown platform: ${platform}. options: ${PLATFORMS.join(", ")}`);
  if (!["auto", "review"].includes(mode)) throw new Error(`unknown mode: ${mode}. must be auto|review`);
  const cfg = await loadConfig(slug);
  cfg.modes[platform] = mode;
  cfg.updated_at = new Date().toISOString();
  await fs.writeFile(path.join(BIZ, slug, "social-auto-config.json"), JSON.stringify(cfg, null, 2));
  return cfg;
}

export async function getMode(slug, platform) {
  const cfg = await loadConfig(slug);
  return cfg.modes[platform] || "review";
}

export async function isAuto(slug, platform) {
  return (await getMode(slug, platform)) === "auto";
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2];
  if (!slug) { console.error("Usage: auto-post-config.mjs <slug> [--show] [--set platform=mode]"); process.exit(1); }
  const setIdx = process.argv.indexOf("--set");
  if (setIdx !== -1) {
    const [platform, mode] = (process.argv[setIdx + 1] || "").split("=");
    const cfg = await setMode(slug, platform, mode);
    console.log(`✓ ${slug}/${platform} = ${mode}`);
  } else {
    const cfg = await loadConfig(slug);
    console.log(`${slug} social auto-config:`);
    for (const [p, m] of Object.entries(cfg.modes)) {
      console.log(`  ${p.padEnd(20)} ${m === "auto" ? "🤖 auto" : "🙋 review"}`);
    }
  }
}
