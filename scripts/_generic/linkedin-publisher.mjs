#!/usr/bin/env node
/**
 * linkedin-publisher.mjs <tenant-slug>
 *
 * Posts to LinkedIn via the Marketing API (free).
 *
 * Required env:
 *   LINKEDIN_ACCESS_TOKEN  (OAuth — needs w_member_social scope, 60-day lifespan)
 *   LINKEDIN_AUTHOR_URN    (urn:li:person:<id> OR urn:li:organization:<id>)
 *
 * Supports text posts + image posts + video posts. Auto-uploads media via
 * LinkedIn's resumable upload protocol.
 *
 * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import {
  tenantSlug, loadEnv, loadTenant, audit, queueTelegram, BIZ,
} from "./_lib.mjs";
import { isAuto } from "./auto-post-config.mjs";

const LI_API = "https://api.linkedin.com";

async function registerUpload(env, mediaType) {
  // mediaType: image|video
  const res = await fetch(`${LI_API}/v2/assets?action=registerUpload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: [mediaType === "video" ? "urn:li:digitalmediaRecipe:feedshare-video" : "urn:li:digitalmediaRecipe:feedshare-image"],
        owner: env.LINKEDIN_AUTHOR_URN,
        serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
      },
    }),
  });
  if (!res.ok) throw new Error(`register upload ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const upload = data.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"];
  return { uploadUrl: upload.uploadUrl, asset: data.value.asset };
}

async function uploadBinary(uploadUrl, filePath, token) {
  const buf = await fs.readFile(filePath);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: buf,
  });
  if (!res.ok) throw new Error(`upload ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function createPost(env, text, mediaType, mediaAsset) {
  // Use Posts API (newer than ugcPosts)
  const body = {
    author: env.LINKEDIN_AUTHOR_URN,
    commentary: text,
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };
  if (mediaAsset) {
    body.content = { media: { id: mediaAsset, title: "" } };
  }
  const res = await fetch(`${LI_API}/rest/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202410",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`post ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const id = res.headers.get("x-restli-id");
  return { postId: id, url: `https://www.linkedin.com/feed/update/${id}` };
}

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  const ctx = await loadTenant(slug);
  const queueDir = path.join(BIZ, slug, "social-queue/linkedin");
  if (!existsSync(queueDir)) { console.log("nothing in LinkedIn queue"); return; }

  const auto = await isAuto(slug, "linkedin");
  const files = (await fs.readdir(queueDir)).filter((f) => f.endsWith(".json"));
  const ready = [];
  for (const f of files) {
    try {
      const data = JSON.parse(await fs.readFile(path.join(queueDir, f), "utf8"));
      if (data.posted_at) continue;
      if (data.status === "approved" || (auto && data.status === "queued")) ready.push({ path: path.join(queueDir, f), data });
    } catch {}
  }
  if (ready.length === 0) { console.log("no LinkedIn posts ready"); return; }

  if (!env.LINKEDIN_ACCESS_TOKEN || !env.LINKEDIN_AUTHOR_URN) {
    const instr = path.join(queueDir, "_SETUP_INSTRUCTIONS.md");
    await fs.writeFile(instr, [
      `# LinkedIn publisher — setup needed`, ``,
      `Required in .env.local:`,
      `  LINKEDIN_ACCESS_TOKEN — OAuth 2.0 token with scope w_member_social`,
      `  LINKEDIN_AUTHOR_URN   — urn:li:person:<id> or urn:li:organization:<id>`,
      ``,
      `Setup:`,
      `  1. linkedin.com/developers → create app, request access to "Community Management API"`,
      `  2. OAuth flow with scope w_member_social r_liteprofile`,
      `  3. Token lasts 60 days — refresh before expiry`,
      `  4. Get your author URN: https://api.linkedin.com/v2/userinfo`,
    ].join("\n"));
    await queueTelegram(env, slug, `🔗 *${ready.length} LinkedIn posts ready, OAuth missing.*\nSee: \`${instr}\``);
    return;
  }

  console.log(`→ Publishing ${ready.length} LinkedIn posts for ${ctx.display_name}`);
  const results = [];
  for (const r of ready) {
    process.stdout.write(`  ${(r.data.content?.slug || r.data.id).padEnd(40)} `);
    try {
      let mediaAsset = null;
      const mediaPath = r.data.content?.video_path || r.data.content?.image_path;
      if (mediaPath && existsSync(mediaPath)) {
        const mediaType = mediaPath.endsWith(".mp4") || mediaPath.endsWith(".mov") ? "video" : "image";
        const { uploadUrl, asset } = await registerUpload(env, mediaType);
        await uploadBinary(uploadUrl, mediaPath, env.LINKEDIN_ACCESS_TOKEN);
        mediaAsset = asset;
        // LinkedIn needs a moment to process video uploads
        if (mediaType === "video") await new Promise((res) => setTimeout(res, 8000));
      }
      const text = r.data.content?.text || r.data.angle || `${ctx.display_name} — ${ctx.niche}`;
      const { postId, url } = await createPost(env, text, mediaAsset ? "media" : "text", mediaAsset);
      r.data.status = "posted";
      r.data.posted_at = new Date().toISOString();
      r.data.posted_url = url;
      await fs.writeFile(r.path, JSON.stringify(r.data, null, 2));
      results.push({ ok: true, slug: r.data.content?.slug || r.data.id, url });
      console.log(`✓ ${url}`);
    } catch (e) {
      results.push({ ok: false, error: e.message });
      console.log(`✗ ${e.message.slice(0, 100)}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  const ok = results.filter((r) => r.ok);
  await queueTelegram(env, slug, `🔗 *LinkedIn — ${ctx.display_name}*\n\n${ok.length}/${results.length} live`);
  await audit(slug, { actor: "linkedin-publisher", action: "posts_published", count: ok.length });
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
