#!/usr/bin/env node
/**
 * social-orchestrator.mjs <tenant-slug>
 *
 * Daily social-content dispatcher. Reads content-calendar.json for today's
 * planned posts across all channels, locates the matching content drafts
 * (Pinterest pins, TikTok videos, blog posts, newsletter, etc.), and queues
 * them in the per-platform "ready-to-post" buckets.
 *
 *   ~/Documents/businesses/<tenant>/social-queue/
 *     pinterest/   ← pin images + descriptions
 *     youtube/     ← videos + descriptions
 *     tiktok/      ← videos (manual upload — no public TikTok upload API)
 *     instagram/   ← videos + captions
 *     linkedin/    ← posts
 *     x/           ← thread drafts
 *
 * Each queued post gets a state.json with: { status: "queued"|"approved"|"posted",
 * scheduled_for: ISO, approved_by: "jack", posted_at: null }
 *
 * Approval flow: Telegram "approve post <id>" via approval-handler → status=approved.
 * Posters (pinterest-publisher.mjs etc) only act on status=approved entries.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import {
  tenantSlug, loadEnv, loadTenant, audit, queueTelegram, BIZ,
} from "./_lib.mjs";

const PLATFORMS = ["pinterest", "youtube", "tiktok", "instagram_reels", "linkedin", "twitter", "blog", "newsletter"];

async function loadCalendar(slug) {
  const f = path.join(BIZ, slug, "content-calendar.json");
  if (!existsSync(f)) return null;
  return JSON.parse(await fs.readFile(f, "utf8"));
}

async function findAvailableContent(slug, platform, angle) {
  const tenantDir = path.join(BIZ, slug);
  const today = new Date().toISOString().slice(0, 10);

  if (platform === "pinterest") {
    const dir = path.join(tenantDir, "pinterest-pins", today);
    if (!existsSync(dir)) return null;
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".png"));
    if (!files.length) return null;
    // Pick one not yet queued
    const queueDir = path.join(tenantDir, "social-queue/pinterest");
    const queued = existsSync(queueDir) ? new Set((await fs.readdir(queueDir)).map((f) => f.replace(/\.(json|png)$/, ""))) : new Set();
    const available = files.find((f) => !queued.has(f.replace(/\.png$/, "")));
    if (!available) return null;
    const slug = available.replace(/\.png$/, "");
    const imgPath = path.join(dir, available);
    const txtPath = path.join(dir, `${slug}.txt`);
    const text = existsSync(txtPath) ? await fs.readFile(txtPath, "utf8") : "";
    return { slug, image_path: imgPath, copy: text };
  }

  if (platform === "tiktok" || platform === "instagram_reels" || platform === "youtube") {
    const dir = path.join(tenantDir, "ai-videos");
    if (!existsSync(dir)) return null;
    const subdirs = (await fs.readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort().reverse();
    for (const sub of subdirs) {
      const subdir = path.join(dir, sub);
      const files = (await fs.readdir(subdir)).filter((f) => f.endsWith(".mp4"));
      if (!files.length) continue;
      const queueDir = path.join(tenantDir, "social-queue", platform);
      const queued = existsSync(queueDir) ? new Set((await fs.readdir(queueDir)).map((f) => f.replace(/\.(json|mp4)$/, ""))) : new Set();
      const available = files.find((f) => !queued.has(`${sub}-${f.replace(/\.mp4$/, "")}`));
      if (available) return { slug: `${sub}-${available.replace(/\.mp4$/, "")}`, video_path: path.join(subdir, available) };
    }
    return null;
  }

  if (platform === "blog") {
    const dir = path.join(tenantDir, "blog-drafts");
    if (!existsSync(dir)) return null;
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md")).sort().reverse();
    const queueDir = path.join(tenantDir, "social-queue/blog");
    const queued = existsSync(queueDir) ? new Set((await fs.readdir(queueDir)).map((f) => f.replace(/\.(json|md)$/, ""))) : new Set();
    const available = files.find((f) => !queued.has(f.replace(/\.md$/, "")));
    if (available) return { slug: available.replace(/\.md$/, ""), md_path: path.join(dir, available) };
    return null;
  }

  if (platform === "newsletter") {
    const dir = path.join(tenantDir, "newsletter-drafts");
    if (!existsSync(dir)) return null;
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md")).sort().reverse();
    const queueDir = path.join(tenantDir, "social-queue/newsletter");
    const queued = existsSync(queueDir) ? new Set((await fs.readdir(queueDir)).map((f) => f.replace(/\.(json|md)$/, ""))) : new Set();
    const available = files.find((f) => !queued.has(f.replace(/\.md$/, "")));
    if (available) return { slug: available.replace(/\.md$/, ""), md_path: path.join(dir, available) };
    return null;
  }

  return null;
}

async function queuePost(slug, platform, content, plannedEntry) {
  const queueDir = path.join(BIZ, slug, "social-queue", platform);
  await fs.mkdir(queueDir, { recursive: true });
  const stateFile = path.join(queueDir, `${content.slug}.json`);
  const state = {
    id: `${slug}-${platform}-${content.slug}`,
    tenant: slug,
    platform,
    status: "queued",
    angle: plannedEntry.angle,
    scheduled_for: plannedEntry.date,
    queued_at: new Date().toISOString(),
    approved_at: null,
    approved_by: null,
    posted_at: null,
    posted_url: null,
    content,
  };
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
  return state;
}

async function main() {
  const slug = tenantSlug();
  const env = await loadEnv();
  const ctx = await loadTenant(slug);
  const calendar = await loadCalendar(slug);
  if (!calendar) {
    console.error(`No content-calendar.json — run content-calendar-orchestrator first`);
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const todaysEntries = (calendar.entries || []).filter((e) => e.date === today);
  console.log(`→ Orchestrating ${todaysEntries.length} planned entries for ${ctx.display_name} (${today})`);

  const queued = [];
  for (const entry of todaysEntries) {
    if (!PLATFORMS.includes(entry.channel)) continue;
    const content = await findAvailableContent(slug, entry.channel, entry.angle);
    if (!content) {
      console.log(`  ${entry.channel.padEnd(20)} — no available content`);
      continue;
    }
    const state = await queuePost(slug, entry.channel, content, entry);
    console.log(`  ${entry.channel.padEnd(20)} ✓ queued: ${state.content.slug}`);
    queued.push(state);
  }

  if (queued.length > 0) {
    const lines = [
      `🚦 *Social queue — ${ctx.display_name}*`,
      ``,
      `Queued ${queued.length} posts for today:`,
      ...queued.map((q) => `  • ${q.platform}: \`${q.content.slug}\``),
      ``,
      `Reply *approve all* to send all to publishers,`,
      `or *approve post <id>* for individuals.`,
    ];
    await queueTelegram(env, slug, lines.join("\n"));
  }

  await audit(slug, { actor: "social-orchestrator", action: "queue_built", count: queued.length, date: today });
  console.log(`\n✓ ${queued.length} posts queued.`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
