#!/usr/bin/env node
/**
 * video-pipeline-watcher.mjs
 *
 * Watches ~/Documents/businesses/<tenant>/raw-footage/ across all tenants.
 * When a new video lands, runs the pipeline:
 *
 *   1. Transcribe via Whisper (OpenAI API → local whisper.cpp fallback)
 *   2. Generate SRT subtitles
 *   3. Burn captions via ffmpeg
 *   4. Cut to 9:16 (TikTok/Reels), 1:1 (IG feed), 4:5 (IG feed alt)
 *   5. Generate platform descriptions + hashtags via Gemini (reads CONSTITUTION)
 *   6. Save to ~/Documents/businesses/<tenant>/edited-content/<timestamp>/
 *   7. Telegram-ping with paths + draft descriptions
 *
 * Runs continuously as LaunchAgent. Polls raw-footage dirs every 60s.
 *
 * Required: ffmpeg (verifies on startup)
 * Optional: OPENAI_API_KEY (Whisper API) — falls back to whisper.cpp if installed
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync, createReadStream } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { homedir } from "node:os";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const SHARED_OUTBOX = path.join(SHARED, "telegram/outbox");
const STATE_FILE = path.join(SHARED, "founder-ops/video-pipeline-state.json");
const LOG_FILE = path.join(SHARED, "poller/video-pipeline.log");
const HEARTBEAT_FILE = path.join(SHARED, "poller/video-pipeline-heartbeat.log");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");

const POLL_INTERVAL_MS = 60_000;
const HEARTBEAT_INTERVAL_MS = 60_000;
const VIDEO_EXT = [".mov", ".mp4", ".m4v", ".webm", ".avi"];
const GEMINI_MODEL = "gemini-2.5-flash";

async function loadEnv() {
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
  await fs.appendFile(LOG_FILE, line);
}

async function heartbeat() {
  await fs.mkdir(path.dirname(HEARTBEAT_FILE), { recursive: true });
  await fs.appendFile(HEARTBEAT_FILE, `${new Date().toISOString()} alive\n`);
}

async function loadState() {
  if (!existsSync(STATE_FILE)) return { processed_files: [], total_processed: 0 };
  return JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
}

async function saveState(s) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(s, null, 2));
}

function checkFfmpeg() {
  try {
    execSync("which ffmpeg", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function checkLocalWhisper() {
  try {
    execSync("which whisper", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function whisperViaOpenAI(audioPath, apiKey) {
  // Whisper API: $0.006/min
  const buf = await fs.readFile(audioPath);
  const boundary = "----formdata-" + Date.now();
  const filename = path.basename(audioPath);

  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: audio/mpeg\r\n\r\n`
  );
  const middle = Buffer.from(
    `\r\n--${boundary}\r\n` +
      `Content-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="response_format"\r\n\r\nverbose_json\r\n` +
      `--${boundary}--\r\n`
  );
  const body = Buffer.concat([head, buf, middle]);

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`whisper ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return await res.json();
}

async function whisperLocal(audioPath, outDir) {
  // whisper.cpp or openai-whisper CLI
  return new Promise((resolve, reject) => {
    const proc = spawn("whisper", [audioPath, "--model", "base", "--output_format", "json", "--output_dir", outDir], {
      stdio: "pipe",
    });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", async (code) => {
      if (code !== 0) return reject(new Error(`whisper exit ${code}: ${stderr.slice(0, 200)}`));
      const base = path.basename(audioPath, path.extname(audioPath));
      const jsonPath = path.join(outDir, `${base}.json`);
      if (!existsSync(jsonPath)) return reject(new Error("whisper output not found"));
      try {
        resolve(JSON.parse(await fs.readFile(jsonPath, "utf8")));
      } catch (e) { reject(e); }
    });
  });
}

function ffmpegRun(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-y", ...args], { stdio: "pipe" });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-400)}`));
    });
  });
}

function srtFromSegments(segments) {
  function fmt(t) {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    const ms = Math.floor((t * 1000) % 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
  }
  return segments
    .map((seg, i) => `${i + 1}\n${fmt(seg.start)} --> ${fmt(seg.end)}\n${seg.text.trim()}\n`)
    .join("\n");
}

async function cutVariant(inputPath, outputPath, aspectRatio, srtPath) {
  // aspectRatio: "9:16" | "1:1" | "4:5"
  const dims = {
    "9:16": { w: 1080, h: 1920, crop: "ih*9/16:ih" },
    "1:1": { w: 1080, h: 1080, crop: "ih:ih" },
    "4:5": { w: 1080, h: 1350, crop: "ih*4/5:ih" },
  }[aspectRatio];
  if (!dims) throw new Error(`unknown aspect: ${aspectRatio}`);

  const subsFilter = `subtitles='${srtPath}':force_style='Fontname=Helvetica,Fontsize=14,PrimaryColour=&Hffffff&,OutlineColour=&H000000&,BorderStyle=3,Outline=2,Shadow=0,Alignment=2,MarginV=80'`;

  await ffmpegRun([
    "-i", inputPath,
    "-vf", `crop=${dims.crop},scale=${dims.w}:${dims.h},${subsFilter}`,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    outputPath,
  ]);
}

async function generatePlatformCopy(tenant, transcript, env) {
  // Load tenant constitution for voice
  const constPath = path.join(BIZ, tenant, "CONSTITUTION.md");
  let constitution = "";
  if (existsSync(constPath)) constitution = (await fs.readFile(constPath, "utf8")).slice(0, 3000);

  const prompt = `You are drafting social copy for a short video clip. Match the brand voice in the constitution exactly.

CONSTITUTION:
${constitution}

VIDEO TRANSCRIPT:
${transcript.slice(0, 1500)}

Return STRICT JSON only:
{
  "tiktok": {
    "caption": "max 150 chars, includes 1 hook line + 2-3 niche hashtags",
    "hashtags": ["#hash1", "#hash2", ... 5-8 niche tags, lowercase"]
  },
  "instagram_reels": {
    "caption": "150-300 chars, story-led, no link-in-bio reminder",
    "hashtags": ["#hash1", ... 8-12 tags"]
  },
  "youtube_shorts": {
    "title": "max 60 chars, SEO-friendly",
    "description": "100-300 chars",
    "tags": ["tag1", "tag2", ... 5-10"]
  },
  "pinterest": {
    "title": "max 80 chars, searchable",
    "description": "200-400 chars, keyword-rich"
  }
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 2000 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  return JSON.parse(cleaned.slice(s, e + 1));
}

async function queueTelegram(env, tenant, outDir, copy, variants) {
  if (!env.TELEGRAM_CHAT_ID) return;
  await fs.mkdir(SHARED_OUTBOX, { recursive: true });
  const text =
    `🎬 *Video edits ready — ${tenant}*\n\n` +
    `Output: \`${outDir}\`\n\n` +
    `Variants:\n${variants.map((v) => `  • ${v.aspect} → ${path.basename(v.path)}`).join("\n")}\n\n` +
    `*TikTok caption:*\n${copy.tiktok.caption}\n\n` +
    `*Pinterest:*\n${copy.pinterest.title}\n\n` +
    `Open output: \`open ${outDir}\``;
  await fs.writeFile(
    path.join(SHARED_OUTBOX, `${Date.now()}-video-ready-${tenant}.json`),
    JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: "Markdown",
      urgency: "P3",
      queued_at: new Date().toISOString(),
      sent_at: null,
      tenant,
    }, null, 2)
  );
}

async function processVideo(tenant, videoPath, env, state) {
  await log(`processing ${tenant}/${path.basename(videoPath)}`);
  const tenantDir = path.join(BIZ, tenant);
  const outRoot = path.join(tenantDir, "edited-content");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(outRoot, stamp);
  await fs.mkdir(outDir, { recursive: true });

  // 1. Extract audio for transcription (faster than transcribing full video)
  const audioPath = path.join(outDir, "audio.mp3");
  await ffmpegRun(["-i", videoPath, "-vn", "-acodec", "libmp3lame", "-ar", "16000", "-ab", "64k", audioPath]);

  // 2. Transcribe
  let transcription;
  if (env.OPENAI_API_KEY) {
    transcription = await whisperViaOpenAI(audioPath, env.OPENAI_API_KEY);
  } else if (checkLocalWhisper()) {
    transcription = await whisperLocal(audioPath, outDir);
  } else {
    throw new Error("no transcription available — set OPENAI_API_KEY or install whisper locally");
  }
  const transcript = transcription.text || "";
  const segments = transcription.segments || [];
  await fs.writeFile(path.join(outDir, "transcript.txt"), transcript);

  // 3. SRT
  const srtPath = path.join(outDir, "subtitles.srt");
  await fs.writeFile(srtPath, srtFromSegments(segments));

  // 4. Variants
  const variants = [];
  for (const aspect of ["9:16", "1:1", "4:5"]) {
    const outPath = path.join(outDir, `${aspect.replace(":", "x")}.mp4`);
    try {
      await cutVariant(videoPath, outPath, aspect, srtPath);
      variants.push({ aspect, path: outPath });
    } catch (e) {
      await log(`variant ${aspect} failed: ${e.message}`);
    }
  }

  // 5. Platform copy
  const copy = await generatePlatformCopy(tenant, transcript, env);
  await fs.writeFile(path.join(outDir, "platform-copy.json"), JSON.stringify(copy, null, 2));

  // 6. Telegram
  await queueTelegram(env, tenant, outDir, copy, variants);

  state.total_processed += 1;
  await log(`✓ ${tenant}/${path.basename(videoPath)} → ${outDir} (${variants.length} variants)`);
}

async function scanCycle() {
  try {
    const env = await loadEnv();
    const state = await loadState();
    if (!existsSync(BIZ)) return;
    const tenants = (await fs.readdir(BIZ, { withFileTypes: true }))
      .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("."))
      .map((d) => d.name);

    for (const tenant of tenants) {
      const rawDir = path.join(BIZ, tenant, "raw-footage");
      if (!existsSync(rawDir)) continue;
      const files = await fs.readdir(rawDir);
      for (const f of files) {
        if (f.startsWith(".")) continue;
        if (!VIDEO_EXT.some((e) => f.toLowerCase().endsWith(e))) continue;
        const filePath = path.join(rawDir, f);
        const key = `${tenant}/${f}`;
        if (state.processed_files.includes(key)) continue;
        try {
          // Wait until file is stable (not being copied)
          const stat1 = await fs.stat(filePath);
          await new Promise((r) => setTimeout(r, 3000));
          const stat2 = await fs.stat(filePath);
          if (stat1.size !== stat2.size) {
            await log(`${key} still copying, skip this cycle`);
            continue;
          }
          await processVideo(tenant, filePath, env, state);
          state.processed_files.push(key);
        } catch (err) {
          await log(`error processing ${key}: ${err.message}`);
        }
      }
    }
    await saveState(state);
  } catch (err) {
    await log(`scanCycle error: ${err.message}`);
  }
}

async function main() {
  await fs.mkdir(SHARED, { recursive: true });
  await log("video-pipeline-watcher starting");
  if (!checkFfmpeg()) {
    await log("WARNING: ffmpeg not found — install via brew install ffmpeg");
  }
  setInterval(scanCycle, POLL_INTERVAL_MS);
  setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  await scanCycle();
  await heartbeat();
  await log("watching all tenants' raw-footage/ folders");
}

main().catch(async (err) => {
  await log(`FATAL: ${err.message}`);
  process.exit(1);
});
