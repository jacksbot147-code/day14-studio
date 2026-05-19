#!/usr/bin/env node
/**
 * instagram-publisher.mjs <tenant-slug>
 *
 * Publishes IG Reels via Meta Graph API.
 *
 * Required env (in .env.local):
 *   META_ACCESS_TOKEN          (Page-scoped Graph API token, ~60-day lived; refresh via long-lived token flow)
 *   META_INSTAGRAM_BUSINESS_ID (your IG Business account ID)
 *   META_PAGE_ID               (the Facebook Page tied to the IG account)
 *
 * The video must be hosted at a public URL or uploaded via the resumable
 * upload endpoint. Since IG doesn't accept local files, we need a temporary
 * public host. Options:
 *   - Cloudflare R2 (free 10GB, public URLs) — recommended
 *   - Supabase Storage (already used by day14)
 *   - AWS S3
 *
 * If no SUPABASE_URL or R2 config: writes manual-upload instructions.
 *
 * IG Reels API docs: https://developers.facebook.com/docs/instagram-platform/content-publishing
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import {
  tenantSlug, loadEnv, loadTenant, audit, queueTelegram, BIZ,
} from "./_lib.mjs";
import { isAuto } from "./auto-post-config.mjs";

const META_GRAPH = "https://graph.facebook.com/v21.0";

async function uploadToSupabase(env, videoPath, slug) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const buf = await fs.readFile(videoPath);
  const filename = `${slug}/${Date.now()}-${path.basename(videoPath)}`;
  const url = `${env.SUPABASE_URL}/storage/v1/object/social-media/${filename}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "video/mp4", "x-upsert": "true" },
    body: buf,
  });
  if (!res.ok) throw new Error(`supabase upload ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return `${env.SUPABASE_URL}/storage/v1/object/public/social-media/${filename}`;
}

async function publishReel(env, videoUrl, caption) {
  // Step 1: create media container
  const createRes = await fetch(`${META_GRAPH}/${env.META_INSTAGRAM_BUSINESS_ID}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      access_token: env.META_ACCESS_TOKEN,
    }),
  });
  if (!createRes.ok) throw new Error(`create container ${createRes.status}: ${(await createRes.text()).slice(0, 300)}`);
  const { id: containerId } = await createRes.json();

  // Step 2: poll for status (Meta needs time to process video)
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 4000));
    const statusRes = await fetch(`${META_GRAPH}/${containerId}?fields=status_code&access_token=${env.META_ACCESS_TOKEN}`);
    const { status_code } = await statusRes.json();
    if (status_code === "FINISHED") break;
    if (status_code === "ERROR" || status_code === "EXPIRED") throw new Error(`container status: ${status_code}`);
  }

  // Step 3: publish
  const pubRes = await fetch(`${META_GRAPH}/${env.META_INSTAGRAM_BUSINESS_ID}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: env.META_ACCESS_TOKEN }),
  });
  if (!pubRes.ok) throw new Error(`publish ${pubRes.status}: ${(await pubRes.text()).slice(0, 300)}`);
  const { id: mediaId } = await pubRes.json();
  return { mediaId, postUrl: `https://www.instagram.com/reel/${mediaId}` };
}

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  const ctx = await loadTenant(slug);
  const queueDir = path.join(BIZ, slug, "social-queue/instagram_reels");
  if (!existsSync(queueDir)) { console.log("nothing in IG queue"); return; }

  const files = (await fs.readdir(queueDir)).filter((f) => f.endsWith(".json"));
  const auto = await isAuto(slug, "instagram_reels");
  const ready = [];
  for (const f of files) {
    try {
      const data = JSON.parse(await fs.readFile(path.join(queueDir, f), "utf8"));
      if (data.posted_at) continue;
      if (data.status === "approved" || (auto && data.status === "queued")) ready.push({ path: path.join(queueDir, f), data });
    } catch {}
  }
  if (ready.length === 0) { console.log("no IG reels ready"); return; }

  // Check creds
  const hasMeta = env.META_ACCESS_TOKEN && env.META_INSTAGRAM_BUSINESS_ID;
  const hasHost = env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasMeta || !hasHost) {
    const instr = path.join(queueDir, "_SETUP_INSTRUCTIONS.md");
    await fs.writeFile(instr, [
      `# Instagram Reels publisher — setup needed`,
      ``,
      `${ready.length} reels ready but setup incomplete.`,
      ``,
      `Required in .env.local:`,
      hasMeta ? "✓ META_ACCESS_TOKEN" : "✗ META_ACCESS_TOKEN  → developers.facebook.com → create app → Instagram Basic Display + Instagram Graph API permissions",
      hasMeta ? "✓ META_INSTAGRAM_BUSINESS_ID" : "✗ META_INSTAGRAM_BUSINESS_ID  → from your IG Business profile",
      hasHost ? "✓ SUPABASE storage for video hosting" : "✗ SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY  → for hosting videos publicly (IG needs URL)",
      ``,
      `IG requires the video to be at a public URL — local file won't work.`,
    ].join("\n"));
    await queueTelegram(env, slug, `📷 *${ready.length} IG reels ready, setup incomplete.*\n\nSee: \`${instr}\``);
    return;
  }

  console.log(`→ Publishing ${ready.length} IG reels for ${ctx.display_name}`);
  const results = [];
  for (const r of ready) {
    process.stdout.write(`  ${r.data.content.slug.padEnd(40)} `);
    try {
      const videoPath = r.data.content.video_path;
      if (!existsSync(videoPath)) throw new Error(`video missing: ${videoPath}`);
      const publicUrl = await uploadToSupabase(env, videoPath, slug);
      if (!publicUrl) throw new Error("no public URL — supabase upload failed");
      const caption = `${r.data.angle || ctx.niche}\n\n#reels #${slug.replace(/-/g, "")}`.slice(0, 2200);
      const { mediaId, postUrl } = await publishReel(env, publicUrl, caption);
      r.data.status = "posted";
      r.data.posted_at = new Date().toISOString();
      r.data.posted_url = postUrl;
      await fs.writeFile(r.path, JSON.stringify(r.data, null, 2));
      results.push({ ok: true, slug: r.data.content.slug, url: postUrl });
      console.log(`✓ ${postUrl}`);
    } catch (e) {
      results.push({ ok: false, slug: r.data.content.slug, error: e.message });
      console.log(`✗ ${e.message.slice(0, 100)}`);
    }
    await new Promise((r) => setTimeout(r, 4000));
  }

  const ok = results.filter((r) => r.ok);
  await queueTelegram(env, slug, `📷 *Instagram Reels — ${ctx.display_name}*\n\n${ok.length}/${results.length} live${ok.length ? ":\n" + ok.map((r) => `• ${r.url}`).join("\n") : ""}`);
  await audit(slug, { actor: "instagram-publisher", action: "reels_published", count: ok.length });
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
