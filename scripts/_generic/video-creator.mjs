#!/usr/bin/env node
/**
 * video-creator.mjs <tenant-slug> [--script <path>]
 *
 * Generates a fully AI-created 15-30s short video from a TikTok script.
 *
 *   1. Reads the most recent TikTok script for the tenant (or path arg)
 *   2. For each beat: generates a scene image via Pollinations
 *   3. Generates voiceover (macOS `say` free, or OPENAI_API_KEY for OpenAI TTS)
 *   4. Animates images with ken-burns zoom via ffmpeg
 *   5. Concatenates beats with crossfades
 *   6. Burns word-by-word captions over the result
 *   7. Outputs 9:16 (1080x1920) to ~/Documents/businesses/<tenant>/ai-videos/
 *
 * Required: ffmpeg
 * Optional: OPENAI_API_KEY (for TTS-1; otherwise uses macOS `say`)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import {
  tenantSlug, loadEnv, loadTenant, audit, callPollinations, queueTelegram, BIZ,
} from "./_lib.mjs";

function getScriptArg() {
  const i = process.argv.indexOf("--script");
  return i !== -1 ? process.argv[i + 1] : null;
}

async function loadLatestScript(slug, scriptOverride) {
  if (scriptOverride && existsSync(scriptOverride)) {
    return JSON.parse(await fs.readFile(scriptOverride, "utf8"));
  }
  const scriptsRoot = path.join(BIZ, slug, "tiktok-scripts");
  if (!existsSync(scriptsRoot)) throw new Error(`no scripts at ${scriptsRoot} — run tiktok-script-engine first`);
  const dates = (await fs.readdir(scriptsRoot)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  for (const date of dates.reverse()) {
    const indexPath = path.join(scriptsRoot, date, "_index.json");
    if (existsSync(indexPath)) {
      const data = JSON.parse(await fs.readFile(indexPath, "utf8"));
      if (data.scripts?.length) return { ...data.scripts[0], _date: date };
    }
  }
  throw new Error(`no _index.json found in ${scriptsRoot}`);
}

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const r = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "pipe" });
    if (r.status === 0) resolve();
    else reject(new Error(`ffmpeg: ${(r.stderr || "").toString().slice(-400)}`));
  });
}

function probeDuration(file) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return parseFloat(r.stdout?.toString() || "0");
}

async function ttsOpenAI(text, outFile, apiKey) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "tts-1", voice: "nova", input: text, response_format: "mp3" }),
  });
  if (!res.ok) throw new Error(`openai tts ${res.status}: ${(await res.text()).slice(0, 200)}`);
  await fs.writeFile(outFile, Buffer.from(await res.arrayBuffer()));
}

async function ttsMacOS(text, outFile) {
  // Use macOS `say` — saves to AIFF, then we convert to mp3
  const aiff = outFile.replace(/\.mp3$/, ".aiff");
  spawnSync("say", ["-v", "Samantha", "-r", "175", "-o", aiff, "--data-format=LEF32@22050", text], { stdio: "pipe" });
  if (!existsSync(aiff)) throw new Error("macOS `say` produced no audio");
  await ffmpeg(["-i", aiff, "-codec:a", "libmp3lame", "-qscale:a", "2", outFile]);
  await fs.unlink(aiff).catch(() => {});
}

async function main() {
  try { execSync("which ffmpeg", { stdio: "pipe" }); }
  catch { throw new Error("ffmpeg not installed — brew install ffmpeg"); }

  const slug = tenantSlug();
  const env = await loadEnv();
  const ctx = await loadTenant(slug);
  const script = await loadLatestScript(slug, getScriptArg());

  console.log(`→ Creating video for ${ctx.display_name}: "${script.slug}"`);
  console.log(`  Hook: "${script.hook_text}"`);
  console.log(`  Beats: ${script.beats.length}`);

  // Working dir
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const workDir = path.join(BIZ, slug, "ai-videos", `${stamp}-${script.slug}`);
  await fs.mkdir(workDir, { recursive: true });
  const scenesDir = path.join(workDir, "scenes");
  const audioDir = path.join(workDir, "audio");
  await fs.mkdir(scenesDir, { recursive: true });
  await fs.mkdir(audioDir, { recursive: true });

  // Generate scene images + voiceover per beat
  const useOpenAI = !!env.OPENAI_API_KEY;
  console.log(`  TTS: ${useOpenAI ? "OpenAI TTS-1" : "macOS say"}`);

  const beatAssets = [];
  for (let i = 0; i < script.beats.length; i++) {
    const beat = script.beats[i];
    process.stdout.write(`  [${i + 1}/${script.beats.length}] ${beat.time.padEnd(8)} `);

    // 1. Scene image — vertical 9:16
    const imgPath = path.join(scenesDir, `${i}.png`);
    try {
      const imgPrompt = `Vertical 9:16 video frame. Visual: ${beat.action}. ${ctx.identity?.merch_aesthetic ? "Aesthetic: " + ctx.identity.merch_aesthetic : ""} Cinematic, high-detail. No text overlay.`;
      const buf = await callPollinations(imgPrompt, { width: 1080, height: 1920, seed: 5000 + i });
      await fs.writeFile(imgPath, buf);
      process.stdout.write("🖼 ");
    } catch (e) {
      console.log(`image err: ${e.message}`);
      continue;
    }

    // 2. Voiceover
    const audioPath = path.join(audioDir, `${i}.mp3`);
    try {
      if (useOpenAI) await ttsOpenAI(beat.voiceover, audioPath, env.OPENAI_API_KEY);
      else await ttsMacOS(beat.voiceover, audioPath);
      process.stdout.write("🔊 ");
    } catch (e) {
      console.log(`tts err: ${e.message}`);
      continue;
    }

    const duration = probeDuration(audioPath);
    beatAssets.push({ index: i, image: imgPath, audio: audioPath, duration, text: beat.voiceover, onScreen: beat.on_screen_text });
    console.log(`(${duration.toFixed(1)}s)`);
  }

  if (beatAssets.length === 0) throw new Error("no beats successfully rendered");

  // Render each beat as a clip: image with ken-burns + audio overlay
  const clipPaths = [];
  for (const b of beatAssets) {
    const clipPath = path.join(workDir, `clip-${b.index}.mp4`);
    const zoomFilter = `zoompan=z='min(zoom+0.0008,1.15)':d=${Math.ceil(b.duration * 30)}:s=1080x1920:fps=30`;
    await ffmpeg([
      "-loop", "1", "-i", b.image,
      "-i", b.audio,
      "-filter_complex", `[0:v]${zoomFilter}[v]`,
      "-map", "[v]", "-map", "1:a",
      "-c:v", "libx264", "-preset", "fast", "-crf", "23",
      "-c:a", "aac", "-b:a", "128k",
      "-shortest", "-t", String(b.duration),
      clipPath,
    ]);
    clipPaths.push(clipPath);
  }

  // Concatenate clips
  const concatList = path.join(workDir, "concat.txt");
  await fs.writeFile(concatList, clipPaths.map((p) => `file '${p}'`).join("\n"));
  const concatPath = path.join(workDir, "concat.mp4");
  await ffmpeg(["-f", "concat", "-safe", "0", "-i", concatList, "-c", "copy", concatPath]);

  // Build SRT from beats with proper timestamps
  let srt = "";
  let t = 0;
  beatAssets.forEach((b, i) => {
    const start = t;
    const end = t + b.duration;
    function fmt(s) {
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60), ms = Math.floor((s * 1000) % 1000);
      return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")},${String(ms).padStart(3,"0")}`;
    }
    srt += `${i + 1}\n${fmt(start)} --> ${fmt(end)}\n${b.text}\n\n`;
    t = end;
  });
  const srtPath = path.join(workDir, "captions.srt");
  await fs.writeFile(srtPath, srt);

  // Burn captions on top — bold, large, centered
  const captionStyle = `subtitles='${srtPath}':force_style='Fontname=Helvetica,Fontsize=18,Bold=1,PrimaryColour=&Hffffff&,OutlineColour=&H000000&,BorderStyle=3,Outline=3,Shadow=0,Alignment=2,MarginV=200'`;
  const finalPath = path.join(workDir, `${script.slug}.mp4`);
  await ffmpeg(["-i", concatPath, "-vf", captionStyle, "-c:v", "libx264", "-preset", "fast", "-crf", "22", "-c:a", "copy", finalPath]);

  // Cleanup intermediate
  await fs.rm(scenesDir, { recursive: true }).catch(() => {});
  await fs.rm(audioDir, { recursive: true }).catch(() => {});
  for (const c of clipPaths) await fs.unlink(c).catch(() => {});
  await fs.unlink(concatList).catch(() => {});
  await fs.unlink(concatPath).catch(() => {});

  const totalDuration = beatAssets.reduce((s, b) => s + b.duration, 0);
  console.log(`\n✓ ${finalPath} (${totalDuration.toFixed(1)}s, ${beatAssets.length} beats)`);

  await queueTelegram(env, slug,
    `🎬 *AI video created — ${ctx.display_name}*\n\n*${script.slug}*\nDuration: ${totalDuration.toFixed(1)}s\nBeats: ${beatAssets.length}\n\nHook: _"${script.hook_text}"_\n\nFile: \`${finalPath}\`\n\nOpen: \`open ${workDir}\`\n\nReady to post via /publish ${script.slug}`
  );

  await audit(slug, { actor: "video-creator", action: "video_created", slug: script.slug, duration_sec: totalDuration, path: finalPath });
}

main().catch((err) => { console.error("\nFATAL:", err.message); process.exit(1); });
