#!/usr/bin/env node
/**
 * youtube-shorts-publisher.mjs <tenant-slug>
 *
 * Uploads approved AI videos as YouTube Shorts.
 *
 * Requires:
 *   - YOUTUBE_OAUTH_REFRESH_TOKEN  (one-time setup via OAuth playground)
 *   - YOUTUBE_OAUTH_CLIENT_ID
 *   - YOUTUBE_OAUTH_CLIENT_SECRET
 *
 * If creds missing: writes manual-upload instructions.
 *
 * YouTube Data API v3 — free 10k unit/day quota (each upload = 1600 units, so
 * ~6 uploads/day per project).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync, createReadStream } from "node:fs";
import {
  tenantSlug, loadEnv, loadTenant, audit, queueTelegram, BIZ,
} from "./_lib.mjs";

const YT_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YT_UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos";

async function refreshAccessToken(env) {
  const res = await fetch(YT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.YOUTUBE_OAUTH_CLIENT_ID,
      client_secret: env.YOUTUBE_OAUTH_CLIENT_SECRET,
      refresh_token: env.YOUTUBE_OAUTH_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`token refresh ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).access_token;
}

async function uploadVideo(accessToken, videoPath, metadata) {
  const stat = await fs.stat(videoPath);
  const initRes = await fetch(`${YT_UPLOAD_URL}?uploadType=resumable&part=snippet,status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(stat.size),
    },
    body: JSON.stringify(metadata),
  });
  if (!initRes.ok) throw new Error(`init ${initRes.status}: ${(await initRes.text()).slice(0, 200)}`);
  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new Error("no upload URL returned");

  // Resumable upload — for files under 100MB just PUT all at once
  const buf = await fs.readFile(videoPath);
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(buf.length) },
    body: buf,
  });
  if (!putRes.ok) throw new Error(`upload ${putRes.status}: ${(await putRes.text()).slice(0, 200)}`);
  return await putRes.json();
}

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  const ctx = await loadTenant(slug);
  const queueDir = path.join(BIZ, slug, "social-queue/youtube");
  if (!existsSync(queueDir)) {
    console.log("nothing in youtube queue");
    return;
  }

  const files = (await fs.readdir(queueDir)).filter((f) => f.endsWith(".json"));
  const approved = [];
  for (const f of files) {
    try {
      const data = JSON.parse(await fs.readFile(path.join(queueDir, f), "utf8"));
      if (data.status === "approved" && !data.posted_at) approved.push({ path: path.join(queueDir, f), data });
    } catch {}
  }

  if (approved.length === 0) {
    console.log("no approved YouTube uploads ready");
    return;
  }

  const hasCreds = env.YOUTUBE_OAUTH_REFRESH_TOKEN && env.YOUTUBE_OAUTH_CLIENT_ID && env.YOUTUBE_OAUTH_CLIENT_SECRET;
  if (!hasCreds) {
    const instr = path.join(queueDir, "_MANUAL_UPLOAD_INSTRUCTIONS.md");
    const lines = [
      `# YouTube Shorts — manual upload mode`,
      ``,
      `${approved.length} videos approved but YouTube OAuth not configured.`,
      ``,
      `Setup steps:`,
      `  1. Google Cloud Console → enable YouTube Data API v3`,
      `  2. Create OAuth 2.0 client (Desktop type)`,
      `  3. Use OAuth Playground (developers.google.com/oauthplayground)`,
      `     with scope: https://www.googleapis.com/auth/youtube.upload`,
      `  4. Exchange code → refresh token`,
      `  5. Add to .env.local:`,
      `     YOUTUBE_OAUTH_CLIENT_ID=...`,
      `     YOUTUBE_OAUTH_CLIENT_SECRET=...`,
      `     YOUTUBE_OAUTH_REFRESH_TOKEN=...`,
      ``,
      `Manual uploads until then:`,
      ...approved.map((a, i) => `  ${i + 1}. ${a.data.content.video_path}`),
    ];
    await fs.writeFile(instr, lines.join("\n"));
    await queueTelegram(env, slug, `🎥 *${approved.length} YouTube videos ready, OAuth not set up.*\nSee: \`${instr}\``);
    console.log(`wrote ${instr}`);
    return;
  }

  console.log(`→ Uploading ${approved.length} videos to YouTube Shorts`);
  const accessToken = await refreshAccessToken(env);

  const results = [];
  for (const a of approved) {
    process.stdout.write(`  ${a.data.content.slug.padEnd(40)} `);
    const meta = {
      snippet: {
        title: `${a.data.content.slug.replace(/-/g, " ")} #shorts`.slice(0, 95),
        description: `${ctx.display_name} · ${ctx.niche}\n\n#shorts ${(a.data.angle || "").slice(0, 200)}`,
        tags: [slug, "shorts", "menopause humor"].slice(0, 30),
        categoryId: "22", // People & Blogs
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    };
    try {
      const result = await uploadVideo(accessToken, a.data.content.video_path, meta);
      a.data.status = "posted";
      a.data.posted_at = new Date().toISOString();
      a.data.posted_url = `https://youtube.com/shorts/${result.id}`;
      await fs.writeFile(a.path, JSON.stringify(a.data, null, 2));
      results.push({ ok: true, slug: a.data.content.slug, url: a.data.posted_url });
      console.log(`✓ ${a.data.posted_url}`);
    } catch (err) {
      results.push({ ok: false, slug: a.data.content.slug, error: err.message });
      console.log(`✗ ${err.message.slice(0, 100)}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  const ok = results.filter((r) => r.ok);
  await queueTelegram(env, slug, `🎥 *YouTube uploaded — ${ctx.display_name}*\n\n${ok.length}/${results.length} live:\n${ok.map((r) => `• ${r.url}`).join("\n")}`);
  await audit(slug, { actor: "youtube-shorts-publisher", action: "videos_uploaded", count: ok.length, results });
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
