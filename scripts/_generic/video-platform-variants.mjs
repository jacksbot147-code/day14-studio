#!/usr/bin/env node
/**
 * video-platform-variants.mjs <tenant-slug> <source-video-path>
 *
 * Takes one source video, renders platform-specific variants:
 *   - tiktok.mp4         9:16, max 60s, H264
 *   - instagram-reels.mp4 9:16, max 90s
 *   - youtube-shorts.mp4 9:16, max 60s
 *   - linkedin.mp4       1:1, max 10min (we cap at 2min)
 *   - pinterest.mp4      9:16, max 60s
 *   - twitter.mp4        16:9, max 2:20
 *
 * Output: same dir as source / variants/<platform>.mp4
 *
 * Required: ffmpeg
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { tenantSlug } from "./_lib.mjs";

const PLATFORMS = {
  tiktok:           { name: "tiktok",           ratio: "9:16",  width: 1080, height: 1920, maxSeconds: 60 },
  instagram_reels:  { name: "instagram-reels",  ratio: "9:16",  width: 1080, height: 1920, maxSeconds: 90 },
  youtube_shorts:   { name: "youtube-shorts",   ratio: "9:16",  width: 1080, height: 1920, maxSeconds: 60 },
  linkedin:         { name: "linkedin",         ratio: "1:1",   width: 1080, height: 1080, maxSeconds: 120 },
  pinterest:        { name: "pinterest",        ratio: "9:16",  width: 1080, height: 1920, maxSeconds: 60 },
  twitter:          { name: "twitter",          ratio: "16:9",  width: 1280, height: 720,  maxSeconds: 140 },
};

function ffmpeg(args) {
  const r = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args]);
  if (r.status !== 0) throw new Error(`ffmpeg: ${(r.stderr || "").toString().slice(-300)}`);
}

function probeDuration(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return parseFloat(r.stdout?.toString() || "0");
}

function probeDims(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file]);
  const [w, h] = (r.stdout?.toString() || "").trim().split(",").map((n) => parseInt(n, 10));
  return { width: w, height: h };
}

function renderVariant(sourcePath, outPath, spec, durationCap) {
  const { width, height } = spec;
  // Crop center to target aspect, scale, optionally trim
  // Pick a crop filter that fits any source aspect into target
  // Target aspect ratio is width/height
  const targetAspect = width / height;
  const dims = probeDims(sourcePath);
  const sourceAspect = dims.width / dims.height;

  let vf;
  if (Math.abs(sourceAspect - targetAspect) < 0.05) {
    // Same aspect — just scale
    vf = `scale=${width}:${height}`;
  } else if (sourceAspect > targetAspect) {
    // Source is wider — crop sides
    vf = `crop=ih*${targetAspect.toFixed(4)}:ih,scale=${width}:${height}`;
  } else {
    // Source is taller — crop top/bottom
    vf = `crop=iw:iw/${targetAspect.toFixed(4)},scale=${width}:${height}`;
  }

  const args = [
    "-i", sourcePath,
    "-vf", vf,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
  ];
  if (durationCap && durationCap < probeDuration(sourcePath)) {
    args.push("-t", String(durationCap));
  }
  args.push(outPath);
  ffmpeg(args);
}

async function main() {
  try { execSync("which ffmpeg", { stdio: "pipe" }); }
  catch { throw new Error("ffmpeg not installed — brew install ffmpeg"); }

  const slug = tenantSlug();
  const source = process.argv[3];
  if (!source) { console.error("Usage: video-platform-variants.mjs <slug> <source-video>"); process.exit(1); }
  if (!existsSync(source)) throw new Error(`source not found: ${source}`);

  const sourceDuration = probeDuration(source);
  console.log(`→ Rendering variants for ${slug} from ${path.basename(source)} (${sourceDuration.toFixed(1)}s)`);

  const variantsDir = path.join(path.dirname(source), "variants");
  await fs.mkdir(variantsDir, { recursive: true });

  const results = [];
  for (const [key, spec] of Object.entries(PLATFORMS)) {
    const outPath = path.join(variantsDir, `${spec.name}.mp4`);
    process.stdout.write(`  ${spec.name.padEnd(20)} ${spec.ratio.padEnd(6)} `);
    try {
      renderVariant(source, outPath, spec, spec.maxSeconds);
      const dur = probeDuration(outPath);
      results.push({ platform: key, path: outPath, duration: dur, ok: true });
      console.log(`✓ ${dur.toFixed(1)}s`);
    } catch (e) {
      results.push({ platform: key, ok: false, error: e.message });
      console.log(`✗ ${e.message.slice(0, 60)}`);
    }
  }

  // Save manifest
  const manifestPath = path.join(variantsDir, "_variants.json");
  await fs.writeFile(manifestPath, JSON.stringify({
    source,
    rendered_at: new Date().toISOString(),
    variants: results,
  }, null, 2));

  console.log(`\n✓ ${results.filter((r) => r.ok).length}/${results.length} variants → ${variantsDir}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
