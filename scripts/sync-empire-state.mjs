#!/usr/bin/env node
/**
 * sync-empire-state.mjs
 *
 * Collects empire state from Jack's Mac filesystem + writes to
 *   studio/public/data/empire-state.json
 *
 * Then optionally git-commits + pushes (only if --push is passed).
 *
 * Runs every 15 minutes via LaunchAgent. The Vercel /admin pages
 * read this JSON file to render the dashboard from the cloud.
 *
 * No secrets in this JSON — purely empire state + counts. Safe to
 * commit publicly (but only Jack sees it via /admin auth gate).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { listOpenTodos } from "./_generic/operator-todos.mjs";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const STUDIO = path.join(HOME, "Documents/studio");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const ENV_FILE = path.join(STUDIO, ".env.local");

/**
 * Resolve the Telegram bot's @username so the homescreen can render
 * one-tap "Done" links (https://t.me/<bot>?text=done%20N). Best-effort:
 * any failure just yields null and the dashboard falls back to showing
 * the `done N` command as copyable text.
 */
async function botUsername() {
  try {
    if (!existsSync(ENV_FILE)) return null;
    const text = await fs.readFile(ENV_FILE, "utf8");
    const m = text.match(/^\s*TELEGRAM_BOT_TOKEN\s*=\s*(.+)\s*$/m);
    const token = m && m[1] ? m[1].replace(/^['"]|['"]$/g, "").trim() : "";
    if (!token) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.result?.username || null;
  } catch {
    return null;
  }
}
const POLLER_DIR = path.join(SHARED, "poller");
const SKILLS_LIVE = path.join(STUDIO, "docs/seeds/skills");
const SKILLS_DRAFTS = path.join(SKILLS_LIVE, "_drafts");
const OPPS_DIR = path.join(SHARED, "opportunities");
const PUBLIC_DATA = path.join(STUDIO, "public/data");
const OUT = path.join(PUBLIC_DATA, "empire-state.json");

async function tenantOrders(slug) {
  const f = path.join(BIZ, slug, "orders-watcher-state.json");
  if (!existsSync(f)) return { total_revenue_cents: 0, total_orders: 0 };
  try { return JSON.parse(await fs.readFile(f, "utf8")); } catch { return { total_revenue_cents: 0, total_orders: 0 }; }
}

async function tenantStreak(slug) {
  const f = path.join(BIZ, slug, "audit-log.jsonl");
  if (!existsSync(f)) return 0;
  const text = await fs.readFile(f, "utf8");
  const dates = new Set();
  for (const l of text.trim().split("\n").filter(Boolean)) {
    try {
      const ev = JSON.parse(l);
      if (["draft_created", "post_drafted", "issue_drafted", "scripts_generated", "video_created", "product_created", "pins_generated"].includes(ev.action)) {
        dates.add((ev.ts || "").slice(0, 10));
      }
    } catch {}
  }
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (dates.has(d.toISOString().slice(0, 10))) streak += 1; else break;
  }
  return streak;
}

async function tenantAudit(slug, n = 30) {
  const f = path.join(BIZ, slug, "audit-log.jsonl");
  if (!existsSync(f)) return [];
  const text = await fs.readFile(f, "utf8");
  return text.trim().split("\n").filter(Boolean).slice(-n).reverse().map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

async function contentCounts(slug) {
  const tDir = path.join(BIZ, slug);
  async function count(dir, ext) {
    if (!existsSync(dir)) return 0;
    return (await fs.readdir(dir)).filter((f) => f.endsWith(ext)).length;
  }
  async function countRecursive(dir, exts = [".png", ".mp4", ".md"]) {
    if (!existsSync(dir)) return 0;
    let total = 0;
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      if (e.isDirectory()) total += await countRecursive(path.join(dir, e.name), exts);
      else if (exts.some((x) => e.name.endsWith(x))) total++;
    }
    return total;
  }
  return {
    pinterestPins: await countRecursive(path.join(tDir, "pinterest-pins")),
    tiktokScripts: await countRecursive(path.join(tDir, "tiktok-scripts")),
    blogDrafts: await count(path.join(tDir, "blog-drafts"), ".md"),
    newsletterIssues: await count(path.join(tDir, "newsletter-drafts"), ".md"),
    aiVideos: await countRecursive(path.join(tDir, "ai-videos")),
    csDrafts: await count(path.join(tDir, "cs-drafts"), ".md"),
    marketingDrafts: await count(path.join(tDir, "marketing-drafts"), ".md"),
    rawFootage: await count(path.join(tDir, "raw-footage"), ".mp4") + await count(path.join(tDir, "raw-footage"), ".mov"),
    redditDrafts: await countRecursive(path.join(tDir, "reddit-drafts")),
  };
}

async function queueDepth(slug) {
  const sqRoot = path.join(BIZ, slug, "social-queue");
  if (!existsSync(sqRoot)) return { queued: 0, approved: 0, posted: 0, byPlatform: {} };
  let queued = 0, approved = 0, posted = 0;
  const byPlatform = {};
  for (const p of await fs.readdir(sqRoot)) {
    const platformDir = path.join(sqRoot, p);
    const files = (await fs.readdir(platformDir).catch(() => [])).filter((f) => f.endsWith(".json"));
    byPlatform[p] = { queued: 0, approved: 0, posted: 0 };
    for (const f of files) {
      try {
        const data = JSON.parse(await fs.readFile(path.join(platformDir, f), "utf8"));
        if (data.status === "queued") { queued++; byPlatform[p].queued++; }
        else if (data.status === "approved") { approved++; byPlatform[p].approved++; }
        else if (data.status === "posted") { posted++; byPlatform[p].posted++; }
      } catch {}
    }
  }
  return { queued, approved, posted, byPlatform };
}

async function heartbeats() {
  if (!existsSync(POLLER_DIR)) return [];
  const out = [];
  for (const f of await fs.readdir(POLLER_DIR)) {
    if (!f.endsWith("-heartbeat.log")) continue;
    const name = f.replace("-heartbeat.log", "");
    try {
      const text = await fs.readFile(path.join(POLLER_DIR, f), "utf8");
      const lines = text.trim().split("\n").filter(Boolean);
      // Parse the most recent timestamps from the heartbeat log.
      const stamps = lines
        .slice(-30)
        .map((l) => new Date((l.match(/^(\S+)/) || [])[1]).getTime())
        .filter((t) => !Number.isNaN(t));
      if (!stamps.length) {
        out.push({ name, status: "error", ageMin: 999, cadenceMin: null });
        continue;
      }
      const lastTs = stamps[stamps.length - 1];
      const ageMin = (Date.now() - lastTs) / 60_000;
      // Self-calibrate: the median gap between beats IS this daemon's cadence.
      // A daemon that beats every 60s and one that runs every 30 min are both
      // healthy as long as they're not far past their own normal interval.
      const gaps = [];
      for (let i = 1; i < stamps.length; i++) gaps.push((stamps[i] - stamps[i - 1]) / 60_000);
      gaps.sort((a, b) => a - b);
      const medianGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 1;
      const cadenceMin = Math.max(1, Math.round(medianGap));
      // Stale = missed ~3 expected beats. Error = long dead.
      const staleThreshold = Math.max(10, medianGap * 3);
      let status = "healthy";
      if (ageMin > Math.max(360, staleThreshold * 4)) status = "error";
      else if (ageMin > staleThreshold) status = "stale";
      out.push({ name, status, ageMin: Math.round(ageMin), cadenceMin });
    } catch {
      out.push({ name, status: "error", ageMin: 999, cadenceMin: null });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

async function loadOpportunities() {
  if (!existsSync(OPPS_DIR)) return [];
  const out = [];
  for (const f of await fs.readdir(OPPS_DIR)) {
    if (!f.endsWith(".json")) continue;
    try {
      const data = JSON.parse(await fs.readFile(path.join(OPPS_DIR, f), "utf8"));
      out.push({
        id: data.id || f.replace(/\.json$/, ""),
        niche: data.niche,
        total_score: data.total_score || 0,
        suggested_archetype: data.suggested_archetype,
        rationale: (data.rationale || data.evidence || "").slice(0, 400),
        pitched: !!data.pitched,
        status: data.status || "open",
      });
    } catch {}
  }
  return out.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
}

async function main() {
  if (!existsSync(TENANTS_FILE)) {
    console.error("No tenants.json — skipping sync");
    return;
  }
  const tenantsData = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];

  // Per-tenant state
  const tenants = [];
  for (const t of tenantsData) {
    const orders = await tenantOrders(t.slug);
    tenants.push({
      slug: t.slug,
      display_name: t.display_name || t.slug,
      type: t.type || "unknown",
      stage: t.stage || "unknown",
      tagline: t.tagline,
      revenue_cents: orders.total_revenue_cents || 0,
      orders: orders.total_orders || 0,
      streak: await tenantStreak(t.slug),
      recent_audit: await tenantAudit(t.slug, 30),
      content_counts: await contentCounts(t.slug),
      queue: await queueDepth(t.slug),
    });
  }

  // Empire-wide
  const beats = await heartbeats();

  let liveSkills = 0, draftSkills = 0;
  if (existsSync(SKILLS_LIVE)) liveSkills = (await fs.readdir(SKILLS_LIVE, { withFileTypes: true })).filter((e) => e.isDirectory() && !e.name.startsWith("_")).length;
  if (existsSync(SKILLS_DRAFTS)) draftSkills = (await fs.readdir(SKILLS_DRAFTS, { withFileTypes: true })).filter((e) => e.isDirectory() && !e.name.startsWith("_")).length;

  let expansionState = { skills_generated: 0 };
  const expF = path.join(SHARED, "founder-ops/recursive-expansion-state.json");
  if (existsSync(expF)) try { expansionState = JSON.parse(await fs.readFile(expF, "utf8")); } catch {}

  // Empire-wide battle log
  const allAudit = [];
  for (const t of tenantsData) {
    const events = await tenantAudit(t.slug, 15);
    for (const ev of events) allAudit.push({ ...ev, tenant: t.slug });
  }
  allAudit.sort((a, b) => (b.ts || "").localeCompare(a.ts || ""));

  // Operator to-do list — anything the agents can't do themselves.
  let humanTodos = [];
  try { humanTodos = await listOpenTodos(); } catch {}

  const out = {
    generated_at: new Date().toISOString(),
    tenants,
    heartbeats: beats,
    skill_counts: { live: liveSkills, drafts: draftSkills },
    expansion_state: { skills_generated: expansionState.skills_generated || 0 },
    opportunities: await loadOpportunities(),
    empire_battle_log: allAudit.slice(0, 30),
    human_todos: humanTodos,
    bot_username: await botUsername(),
  };

  await fs.mkdir(PUBLIC_DATA, { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(out, null, 2));
  console.log(`✓ wrote ${OUT} (${tenants.length} tenants, ${beats.length} heartbeats)`);

  // Git commit + push?
  if (process.argv.includes("--push")) {
    try {
      execSync("git add public/data/empire-state.json", { cwd: STUDIO, stdio: "pipe" });
      const status = execSync("git status --porcelain public/data/empire-state.json", { cwd: STUDIO, encoding: "utf8" });
      if (!status.trim()) {
        console.log("no changes — skip push");
        return;
      }
      execSync(`git commit -m "sync: empire state ${new Date().toISOString().slice(0, 16)}"`, { cwd: STUDIO, stdio: "pipe" });
      execSync("git push origin HEAD", { cwd: STUDIO, stdio: "inherit" });
      console.log("✓ pushed to git");
    } catch (e) {
      console.error(`git push failed: ${e.message.slice(0, 200)}`);
    }
  }
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
