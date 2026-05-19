#!/usr/bin/env node
/**
 * transcribe-voice.mjs
 *
 * Given a Telegram voice file_id, downloads the audio from Telegram and
 * transcribes via Gemini's native audio input. Returns the transcript text.
 *
 * Used by telegram-poller when a voice message arrives.
 *
 * Usage:
 *   node transcribe-voice.mjs --file-id AwACAg...   (Telegram file_id)
 *   node transcribe-voice.mjs --file-path /tmp/x.ogg  (local audio file)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const STUDIO = path.join(HOME, "Documents/studio");

async function loadEnv() {
  const envPath = path.join(STUDIO, ".env.local");
  if (!existsSync(envPath)) return {};
  const text = await fs.readFile(envPath, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) {
      env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
  return env;
}

function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith("--") && process.argv[i + 1] !== undefined) {
      args[a.slice(2)] = process.argv[++i];
    }
  }
  return args;
}

// Download a Telegram file by file_id
async function downloadTelegramFile(fileId, botToken, destPath) {
  // 1. Get the file path
  const infoRes = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
  );
  if (!infoRes.ok) throw new Error(`Telegram getFile ${infoRes.status}`);
  const info = await infoRes.json();
  if (!info.ok || !info.result?.file_path) {
    throw new Error(`Telegram getFile error: ${JSON.stringify(info)}`);
  }

  // 2. Download the file
  const fileUrl = `https://api.telegram.org/file/bot${botToken}/${info.result.file_path}`;
  const dlRes = await fetch(fileUrl);
  if (!dlRes.ok) throw new Error(`File download ${dlRes.status}`);
  const buf = Buffer.from(await dlRes.arrayBuffer());
  await fs.writeFile(destPath, buf);

  return { path: destPath, size: buf.length };
}

// Send audio to Gemini for transcription
async function transcribeViaGemini(audioPath, apiKey, mimeType = "audio/ogg") {
  const audioBuf = await fs.readFile(audioPath);
  const audioB64 = audioBuf.toString("base64");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: "Transcribe this audio. Return ONLY the spoken words — no preamble, no commentary, no quotes. If unclear, do your best." },
          { inline_data: { mime_type: mimeType, data: audioB64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join(" ")
      ?.trim() || "";
  return text;
}

async function main() {
  const args = parseArgs();
  const env = await loadEnv();

  if (!env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not set");
    process.exit(1);
  }

  let audioPath;
  if (args["file-path"]) {
    audioPath = args["file-path"];
  } else if (args["file-id"]) {
    if (!env.TELEGRAM_BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN not set");
      process.exit(1);
    }
    const tmpDir = path.join(HOME, "Documents/businesses/_shared/telegram/voice-cache");
    await fs.mkdir(tmpDir, { recursive: true });
    audioPath = path.join(tmpDir, `${Date.now()}-${args["file-id"].slice(0, 16)}.ogg`);
    const dl = await downloadTelegramFile(args["file-id"], env.TELEGRAM_BOT_TOKEN, audioPath);
    console.error(`Downloaded ${dl.size} bytes to ${dl.path}`);
  } else {
    console.error("usage: --file-id ID  OR  --file-path /path/to/audio");
    process.exit(1);
  }

  const transcript = await transcribeViaGemini(audioPath, env.GEMINI_API_KEY);
  // Print ONLY the transcript to stdout (other output goes to stderr)
  process.stdout.write(transcript);
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
