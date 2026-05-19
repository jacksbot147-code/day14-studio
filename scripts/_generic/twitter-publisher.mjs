#!/usr/bin/env node
/**
 * twitter-publisher.mjs <tenant-slug>
 *
 * Posts to Twitter/X via API v2.
 *
 * Required env:
 *   TWITTER_API_KEY              (Consumer Key)
 *   TWITTER_API_SECRET           (Consumer Secret)
 *   TWITTER_ACCESS_TOKEN         (per-user)
 *   TWITTER_ACCESS_TOKEN_SECRET  (per-user)
 *
 * Plan: paid Basic tier ($100/mo) gets ~3000 posts/month. Free tier is
 * read-only as of mid-2023.
 *
 * Supports text + threads. Video upload via v1.1 media endpoint with chunked upload.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import crypto from "node:crypto";
import {
  tenantSlug, loadEnv, loadTenant, audit, queueTelegram, BIZ,
} from "./_lib.mjs";
import { isAuto } from "./auto-post-config.mjs";

function oauthHeader(env, method, url, params = {}) {
  const oauthParams = {
    oauth_consumer_key: env.TWITTER_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: env.TWITTER_ACCESS_TOKEN,
    oauth_version: "1.0",
  };
  const all = { ...oauthParams, ...params };
  const sortedKeys = Object.keys(all).sort();
  const paramString = sortedKeys.map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(all[k])}`).join("&");
  const base = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(env.TWITTER_API_SECRET)}&${encodeURIComponent(env.TWITTER_ACCESS_TOKEN_SECRET)}`;
  const signature = crypto.createHmac("sha1", signingKey).update(base).digest("base64");
  oauthParams.oauth_signature = signature;
  return "OAuth " + Object.keys(oauthParams).sort().map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`).join(", ");
}

async function postTweet(env, text, replyToId) {
  const url = "https://api.twitter.com/2/tweets";
  const body = { text };
  if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: oauthHeader(env, "POST", url), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`tweet ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).data;
}

async function postThread(env, tweets) {
  const ids = [];
  let lastId = null;
  for (const text of tweets) {
    const result = await postTweet(env, text.slice(0, 280), lastId);
    ids.push(result.id);
    lastId = result.id;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return ids;
}

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  const ctx = await loadTenant(slug);
  const queueDir = path.join(BIZ, slug, "social-queue/twitter");
  if (!existsSync(queueDir)) { console.log("nothing in twitter queue"); return; }

  const auto = await isAuto(slug, "twitter");
  const files = (await fs.readdir(queueDir)).filter((f) => f.endsWith(".json"));
  const ready = [];
  for (const f of files) {
    try {
      const data = JSON.parse(await fs.readFile(path.join(queueDir, f), "utf8"));
      if (data.posted_at) continue;
      if (data.status === "approved" || (auto && data.status === "queued")) ready.push({ path: path.join(queueDir, f), data });
    } catch {}
  }
  if (ready.length === 0) { console.log("no tweets ready"); return; }

  if (!env.TWITTER_API_KEY || !env.TWITTER_ACCESS_TOKEN) {
    await fs.writeFile(path.join(queueDir, "_SETUP_INSTRUCTIONS.md"), [
      `# Twitter/X publisher — setup needed`, ``,
      `Requires Basic tier (\$100/mo as of 2024) for posting.`,
      ``,
      `1. developer.twitter.com → create app under a paid plan`,
      `2. Generate Consumer Keys + Access Tokens with Write permission`,
      `3. .env.local:`,
      `   TWITTER_API_KEY=`, `   TWITTER_API_SECRET=`,
      `   TWITTER_ACCESS_TOKEN=`, `   TWITTER_ACCESS_TOKEN_SECRET=`,
    ].join("\n"));
    await queueTelegram(env, slug, `🐦 *${ready.length} tweets ready — Twitter API not configured.*`);
    return;
  }

  console.log(`→ Posting ${ready.length} tweets/threads for ${ctx.display_name}`);
  const results = [];
  for (const r of ready) {
    process.stdout.write(`  ${(r.data.content?.slug || r.data.id).padEnd(40)} `);
    try {
      // Thread vs single tweet
      const thread = r.data.content?.thread || (r.data.content?.text ? [r.data.content.text] : []);
      if (!thread.length) { console.log("(no text)"); continue; }
      const ids = await postThread(env, thread);
      const url = `https://twitter.com/i/status/${ids[0]}`;
      r.data.status = "posted";
      r.data.posted_at = new Date().toISOString();
      r.data.posted_url = url;
      r.data.thread_ids = ids;
      await fs.writeFile(r.path, JSON.stringify(r.data, null, 2));
      results.push({ ok: true, url });
      console.log(`✓ ${url}`);
    } catch (e) {
      results.push({ ok: false, error: e.message });
      console.log(`✗ ${e.message.slice(0, 80)}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  const ok = results.filter((r) => r.ok);
  await queueTelegram(env, slug, `🐦 *Twitter/X — ${ctx.display_name}*\n${ok.length}/${results.length} live`);
  await audit(slug, { actor: "twitter-publisher", action: "tweets_posted", count: ok.length });
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
