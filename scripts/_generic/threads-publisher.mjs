#!/usr/bin/env node
/**
 * threads-publisher.mjs <tenant-slug>
 *
 * Posts to Meta's Threads via the Threads API.
 *
 * Required env:
 *   THREADS_ACCESS_TOKEN     (Threads-specific token, separate from Meta Graph)
 *   THREADS_USER_ID          (your Threads user ID)
 *
 * Supports: text-only, image, video, carousel.
 *
 * Docs: https://developers.facebook.com/docs/threads
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import {
  tenantSlug, loadEnv, loadTenant, audit, queueTelegram, BIZ,
} from "./_lib.mjs";
import { isAuto } from "./auto-post-config.mjs";

const TH_API = "https://graph.threads.net/v1.0";

async function publishThreadsPost(env, text, mediaUrl, mediaType) {
  // Step 1: create container
  const params = { access_token: env.THREADS_ACCESS_TOKEN, media_type: mediaType || "TEXT", text: text.slice(0, 500) };
  if (mediaUrl) {
    params.image_url = mediaType === "IMAGE" ? mediaUrl : undefined;
    params.video_url = mediaType === "VIDEO" ? mediaUrl : undefined;
  }
  const createRes = await fetch(`${TH_API}/${env.THREADS_USER_ID}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!createRes.ok) throw new Error(`create ${createRes.status}: ${(await createRes.text()).slice(0, 300)}`);
  const { id: containerId } = await createRes.json();

  // Step 2: wait + publish
  if (mediaType === "VIDEO") await new Promise((r) => setTimeout(r, 15000));
  else if (mediaType === "IMAGE") await new Promise((r) => setTimeout(r, 3000));

  const pubRes = await fetch(`${TH_API}/${env.THREADS_USER_ID}/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerId, access_token: env.THREADS_ACCESS_TOKEN }),
  });
  if (!pubRes.ok) throw new Error(`publish ${pubRes.status}: ${(await pubRes.text()).slice(0, 300)}`);
  const { id: threadId } = await pubRes.json();
  return { threadId, url: `https://www.threads.net/@username/post/${threadId}` };
}

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  const ctx = await loadTenant(slug);
  const queueDir = path.join(BIZ, slug, "social-queue/threads");
  if (!existsSync(queueDir)) { console.log("nothing in threads queue"); return; }

  const auto = await isAuto(slug, "threads");
  const files = (await fs.readdir(queueDir)).filter((f) => f.endsWith(".json"));
  const ready = [];
  for (const f of files) {
    try {
      const data = JSON.parse(await fs.readFile(path.join(queueDir, f), "utf8"));
      if (data.posted_at) continue;
      if (data.status === "approved" || (auto && data.status === "queued")) ready.push({ path: path.join(queueDir, f), data });
    } catch {}
  }
  if (ready.length === 0) { console.log("no Threads ready"); return; }

  if (!env.THREADS_ACCESS_TOKEN || !env.THREADS_USER_ID) {
    await fs.writeFile(path.join(queueDir, "_SETUP_INSTRUCTIONS.md"), [
      `# Threads publisher — setup needed`, ``,
      `1. developers.facebook.com → app → add Threads product`,
      `2. OAuth with scopes: threads_basic, threads_content_publish`,
      `3. .env.local: THREADS_ACCESS_TOKEN, THREADS_USER_ID`,
    ].join("\n"));
    await queueTelegram(env, slug, `🧵 *${ready.length} Threads posts ready — OAuth missing.*`);
    return;
  }

  console.log(`→ Publishing ${ready.length} Threads posts for ${ctx.display_name}`);
  const results = [];
  for (const r of ready) {
    process.stdout.write(`  ${(r.data.content?.slug || r.data.id).padEnd(40)} `);
    try {
      const text = r.data.content?.text || r.data.angle || "";
      const { url } = await publishThreadsPost(env, text, null, "TEXT");
      r.data.status = "posted";
      r.data.posted_at = new Date().toISOString();
      r.data.posted_url = url;
      await fs.writeFile(r.path, JSON.stringify(r.data, null, 2));
      results.push({ ok: true, url });
      console.log(`✓`);
    } catch (e) {
      results.push({ ok: false, error: e.message });
      console.log(`✗ ${e.message.slice(0, 80)}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  const ok = results.filter((r) => r.ok);
  await queueTelegram(env, slug, `🧵 *Threads — ${ctx.display_name}*\n${ok.length}/${results.length} live`);
  await audit(slug, { actor: "threads-publisher", action: "posts_published", count: ok.length });
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
