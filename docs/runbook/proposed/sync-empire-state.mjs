#!/usr/bin/env node
/**
 * sync-empire-state.mjs  — PROPOSED (innovation-t8)
 *
 * Drop-in replacement for scripts/sync-empire-state.mjs.
 *
 * WHAT CHANGED vs. the live version:
 *   The `--push` block no longer commits `public/data/empire-state.json` to
 *   whatever branch happens to be checked out (which was polluting main /
 *   redesign with ~hundreds of `sync: empire state HH:MM` commits). Instead it
 *   redirects every auto-sync commit to a dedicated `state/auto` branch and
 *   then restores the original branch + working tree exactly as it found them.
 *
 * EVERYTHING ABOVE the `--push` block is byte-for-byte identical to the live
 * script — only the commit/push tail is modified. Review the diff, then, if you
 * approve, copy this file over scripts/sync-empire-state.mjs.
 *
 * !! DO NOT cron this file from docs/runbook/proposed/ — the LaunchAgent points
 *    at scripts/sync-empire-state.mjs, so this copy is inert until promoted.
 *
 * See docs/runbook/EMPIRE-STATE-SYNC.md for the full architecture + the one
 * unresolved decision (perpetual dirty empire-state.json on the working
 * branch) that needs Jack's call before promotion.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { listOpenTodos } from "../../../scripts/_generic/operator-todos.mjs";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const STUDIO = path.join(HOME, "Documents/studio");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const ENV_FILE = path.join(STUDIO, ".env.local");

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

const KNOWN_CADENCE_MIN = [
  { prefix: "realty-scout-", cadence: 60 },
  { prefix: "lawn-care-gm-", cadence: 30 },
];
function knownCadence(name) {
  for (const k of KNOWN_CADENCE_MIN) if (name.startsWith(k.prefix)) return k.cadence;
  return null;
}

async function heartbeats() {
  if (!existsSync(POLLER_DIR)) return [];
  const out = [];
  const ISO_TS = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d\d:?\d\d)?/;
  for (const f of await fs.readdir(POLLER_DIR)) {
    if (!f.endsWith("-heartbeat.log")) continue;
    const name = f.replace("-heartbeat.log", "");
    const known = knownCadence(name);
    const kind = known != null ? "oneshot" : "daemon";
    try {
      const text = await fs.readFile(path.join(POLLER_DIR, f), "utf8");
      const lines = text.trim().split("\n").filter(Boolean);
      const stamps = lines
        .slice(-30)
        .map((l) => { const m = l.match(ISO_TS); return m ? new Date(m[0]).getTime() : NaN; })
        .filter((t) => !Number.isNaN(t));
      if (!stamps.length) {
        out.push({ name, kind, status: "error", ageMin: 999, cadenceMin: known, lastBeat: null });
        continue;
      }
      const lastTs = stamps[stamps.length - 1];
      const ageMin = (Date.now() - lastTs) / 60_000;
      let cadenceMin = known;
      if (cadenceMin == null) {
        const gaps = [];
        for (let i = 1; i < stamps.length; i++) gaps.push((stamps[i] - stamps[i - 1]) / 60_000);
        gaps.sort((a, b) => a - b);
        cadenceMin = gaps.length ? Math.max(1, Math.round(gaps[Math.floor(gaps.length / 2)])) : 5;
      }
      const staleThreshold = Math.max(10, Math.round(cadenceMin * (kind === "oneshot" ? 1.6 : 3)));
      const downThreshold = Math.max(kind === "oneshot" ? 120 : 360, Math.round(cadenceMin * (kind === "oneshot" ? 5 : 8)));
      let status = "healthy";
      if (ageMin > downThreshold) status = "error";
      else if (ageMin > staleThreshold) status = "stale";
      out.push({
        name,
        kind,
        status,
        ageMin: Math.round(ageMin),
        cadenceMin,
        lastBeat: new Date(lastTs).toISOString(),
      });
    } catch {
      out.push({ name, kind, status: "error", ageMin: 999, cadenceMin: known, lastBeat: null });
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

async function snapshotOps(tenantsData) {
  const opsOut = path.join(PUBLIC_DATA, "ops");
  await fs.mkdir(opsOut, { recursive: true });
  for (const t of tenantsData) {
    const dir = path.join(BIZ, t.slug, "ops");
    if (!existsSync(dir)) continue;
    const snap = { slug: t.slug, generated_at: new Date().toISOString() };
    for (const f of await fs.readdir(dir)) {
      if (!f.endsWith(".json")) continue;
      try {
        snap[f.replace(/\.json$/, "")] = JSON.parse(await fs.readFile(path.join(dir, f), "utf8"));
      } catch {}
    }
    await fs.writeFile(path.join(opsOut, `${t.slug}.json`), JSON.stringify(snap, null, 2));
  }
}

async function main() {
  if (!existsSync(TENANTS_FILE)) {
    console.error("No tenants.json — skipping sync");
    return;
  }
  const tenantsData = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];

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

  const beats = await heartbeats();

  let liveSkills = 0, draftSkills = 0;
  if (existsSync(SKILLS_LIVE)) liveSkills = (await fs.readdir(SKILLS_LIVE, { withFileTypes: true })).filter((e) => e.isDirectory() && !e.name.startsWith("_")).length;
  if (existsSync(SKILLS_DRAFTS)) draftSkills = (await fs.readdir(SKILLS_DRAFTS, { withFileTypes: true })).filter((e) => e.isDirectory() && !e.name.startsWith("_")).length;

  let expansionState = { skills_generated: 0 };
  const expF = path.join(SHARED, "founder-ops/recursive-expansion-state.json");
  if (existsSync(expF)) try { expansionState = JSON.parse(await fs.readFile(expF, "utf8")); } catch {}

  const allAudit = [];
  for (const t of tenantsData) {
    const events = await tenantAudit(t.slug, 15);
    for (const ev of events) allAudit.push({ ...ev, tenant: t.slug });
  }
  allAudit.sort((a, b) => (b.ts || "").localeCompare(a.ts || ""));

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

  await snapshotOps(tenantsData);
  console.log(`✓ wrote per-tenant ops snapshots`);

  // ---------------------------------------------------------------------------
  // Git commit + push?  (REDIRECTED to the dedicated `state/auto` branch)
  //
  // Design goals:
  //   1. Never add a `sync: empire state` commit to main / redesign again.
  //   2. Never disturb in-flight human/agent work: if the tree is dirty we
  //      stash first, and a `finally` block ALWAYS returns to the original
  //      branch and pops the stash — even on error or mid-push failure.
  //   3. Be a no-op when there's nothing to sync.
  //
  // Known tradeoff (see runbook): because the empire-state.json delta is
  // stashed and popped back onto the original branch, it shows as a perpetual
  // uncommitted modification there. Resolve via the gitignore OR worktree
  // option documented in docs/runbook/EMPIRE-STATE-SYNC.md before relying on a
  // clean `git status`.
  // ---------------------------------------------------------------------------
  if (process.argv.includes("--push")) {
    const SYNC_BRANCH = "state/auto";
    const git = (cmd, opts = {}) =>
      execSync(`git ${cmd}`, { cwd: STUDIO, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...opts });

    let originalBranch = null;
    let stashed = false;
    try {
      originalBranch = git("symbolic-ref --short HEAD").trim();
    } catch {
      console.error("git push skipped: detached HEAD or not a git repo");
      return;
    }

    try {
      // Is there an empire-state delta worth pushing at all?
      git("add public/data");
      const dataStatus = git("status --porcelain public/data").trim();
      if (!dataStatus) {
        console.log("no empire-state changes — skip push");
        return;
      }

      // Stash the ENTIRE working tree (incl. untracked) so the branch switch
      // can never clobber concurrent work. Popped back in `finally`.
      const fullStatus = git("status --porcelain").trim();
      if (fullStatus) {
        git("stash push -u -m empire-state-sync-autostash");
        stashed = true;
      }

      // Switch to (or create) the dedicated branch.
      git(`checkout -B ${SYNC_BRANCH}`);

      // Re-apply ONLY the empire-state snapshot onto state/auto.
      if (stashed) {
        git("checkout stash@{0} -- public/data");
      }
      git("add public/data");
      const onBranch = git("status --porcelain public/data").trim();
      if (onBranch) {
        git(`commit -m "sync: empire state ${new Date().toISOString().slice(0, 16)}"`);
        git(`push -u origin ${SYNC_BRANCH}`, { stdio: ["pipe", "inherit", "inherit"] });
        console.log(`✓ pushed empire-state to ${SYNC_BRANCH}`);
      } else {
        console.log("no empire-state delta on branch — nothing to push");
      }
    } catch (e) {
      console.error(`empire-state sync push failed: ${String(e.message).slice(0, 300)}`);
    } finally {
      // ALWAYS restore the human's branch + working tree, no matter what.
      try {
        if (originalBranch) git(`checkout ${originalBranch}`);
      } catch (e) {
        console.error(`WARNING: could not restore branch ${originalBranch}: ${String(e.message).slice(0, 200)}`);
      }
      if (stashed) {
        try {
          git("stash pop");
        } catch (e) {
          console.error(`WARNING: stash pop failed — recover via 'git stash list': ${String(e.message).slice(0, 200)}`);
        }
      }
    }
  }
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
