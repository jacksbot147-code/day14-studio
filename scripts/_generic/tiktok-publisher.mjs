#!/usr/bin/env node
/**
 * tiktok-publisher.mjs <tenant-slug>
 *
 * Posts to TikTok via the Content Posting API.
 *
 * IMPORTANT: TikTok API requires:
 *   1. TikTok for Business / Developer account approval (1-2 week review)
 *   2. OAuth via TikTok Login Kit
 *   3. The "video.publish" scope, which requires app review
 *
 * If creds missing, writes setup instructions + queues video for MANUAL upload
 * (user pulls from social-queue/tiktok/ to TikTok app).
 *
 * Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
 *
 * Required env (when approved):
 *   TIKTOK_ACCESS_TOKEN
 *   TIKTOK_OPEN_ID
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import {
  tenantSlug, loadEnv, loadTenant, audit, queueTelegram, BIZ,
} from "./_lib.mjs";
import { isAuto } from "./auto-post-config.mjs";

const TT_API = "https://open.tiktokapis.com/v2";

async function initVideoPost(env, videoUrl, title) {
  // Direct Post (vs Upload)
  const res = await fetch(`${TT_API}/post/publish/video/init/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.TIKTOK_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      post_info: {
        title: title.slice(0, 150),
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: videoUrl,
      },
    }),
  });
  if (!res.ok) throw new Error(`init ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.data.publish_id;
}

async function pollStatus(env, publishId) {
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(`${TT_API}/post/publish/status/fetch/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.TIKTOK_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ publish_id: publishId }),
    });
    if (!res.ok) continue;
    const data = await res.json();
    const status = data.data?.status;
    if (status === "PUBLISH_COMPLETE") return data.data;
    if (status === "FAILED") throw new Error(`tiktok publish failed: ${data.data?.fail_reason || "unknown"}`);
  }
  throw new Error("tiktok publish timed out");
}

async function uploadToSupabase(env, videoPath, slug) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const buf = await fs.readFile(videoPath);
  const filename = `${slug}/${Date.now()}-${path.basename(videoPath)}`;
  const res = await fetch(`${env.SUPABASE_URL}/storage/v1/object/social-media/${filename}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "video/mp4", "x-upsert": "true" },
    body: buf,
  });
  if (!res.ok) throw new Error(`supabase ${res.status}`);
  return `${env.SUPABASE_URL}/storage/v1/object/public/social-media/${filename}`;
}

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  const ctx = await loadTenant(slug);
  const queueDir = path.join(BIZ, slug, "social-queue/tiktok");
  if (!existsSync(queueDir)) { console.log("nothing in tiktok queue"); return; }

  const auto = await isAuto(slug, "tiktok");
  const files = (await fs.readdir(queueDir)).filter((f) => f.endsWith(".json"));
  const ready = [];
  for (const f of files) {
    try {
      const data = JSON.parse(await fs.readFile(path.join(queueDir, f), "utf8"));
      if (data.posted_at) continue;
      if (data.status === "approved" || (auto && data.status === "queued")) ready.push({ path: path.join(queueDir, f), data });
    } catch {}
  }
  if (ready.length === 0) { console.log("no TikToks ready"); return; }

  if (!env.TIKTOK_ACCESS_TOKEN) {
    const instr = path.join(queueDir, "_SETUP_INSTRUCTIONS.md");
    await fs.writeFile(instr, [
      `# TikTok publisher — setup needed`, ``,
      `${ready.length} videos approved but TikTok API not configured.`, ``,
      `## Manual upload (works today)`,
      `1. Open TikTok app on phone`,
      `2. Drag each video from this folder to upload`,
      `3. Use scripts/<slug>/tiktok-scripts/<date>/*.md for captions + hashtags`, ``,
      `## Auto-publish (1-2 week setup)`,
      `1. developers.tiktok.com → register app`,
      `2. Request scopes: \`video.publish\`, \`video.upload\``,
      `3. App review (TikTok manually reviews)`,
      `4. OAuth flow → get access token`,
      `5. Add to .env.local:`,
      `   TIKTOK_ACCESS_TOKEN=...`,
      `   TIKTOK_OPEN_ID=...`,
    ].join("\n"));
    await queueTelegram(env, slug, `🎵 *${ready.length} TikToks ready — manual upload mode*\n\nVideos in: \`${queueDir}\`\nSetup auto: \`${instr}\``);
    return;
  }

  if (!env.SUPABASE_URL) {
    console.log("need SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY for video hosting");
    return;
  }

  console.log(`→ Publishing ${ready.length} TikToks for ${ctx.display_name}`);
  const results = [];
  for (const r of ready) {
    process.stdout.write(`  ${r.data.content.slug.padEnd(40)} `);
    try {
      const videoPath = r.data.content.video_path;
      const videoUrl = await uploadToSupabase(env, videoPath, slug);
      const title = `${r.data.angle || ctx.display_name} #fyp #${slug.replace(/-/g, "")}`.slice(0, 150);
      const publishId = await initVideoPost(env, videoUrl, title);
      const result = await pollStatus(env, publishId);
      const postUrl = result.publicly_available_post_id ? `https://www.tiktok.com/video/${result.publicly_available_post_id}` : `tiktok:${publishId}`;
      r.data.status = "posted";
      r.data.posted_at = new Date().toISOString();
      r.data.posted_url = postUrl;
      await fs.writeFile(r.path, JSON.stringify(r.data, null, 2));
      results.push({ ok: true, slug: r.data.content.slug, url: postUrl });
      console.log(`✓ ${postUrl}`);
    } catch (e) {
      results.push({ ok: false, error: e.message });
      console.log(`✗ ${e.message.slice(0, 100)}`);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }

  const ok = results.filter((r) => r.ok);
  await queueTelegram(env, slug, `🎵 *TikTok — ${ctx.display_name}*\n\n${ok.length}/${results.length} live`);
  await audit(slug, { actor: "tiktok-publisher", action: "videos_published", count: ok.length });
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
