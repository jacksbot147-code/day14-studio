#!/usr/bin/env node
/**
 * gamified-dashboard.mjs (v2)
 *
 * Two-level dashboard:
 *   1. Empire index — ~/Documents/businesses/_shared/empire.html
 *      - Clickable hero cards → tenant detail pages
 *      - Empire-wide XP/health/KPIs
 *      - Achievements + battle log + daemons
 *   2. Per-tenant detail — ~/Documents/businesses/_shared/tenant-<slug>.html
 *      - Full stats for one tenant
 *      - Products grid, content stats, approval queue, daemons, battle log
 *      - Quick links: brand site, Printify, dashboard panel
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const POLLER_DIR = path.join(SHARED, "poller");
const SKILLS_LIVE = path.join(HOME, "Documents/studio/docs/seeds/skills");
const SKILLS_DRAFTS = path.join(SKILLS_LIVE, "_drafts");
const EXPANSION_INBOX = path.join(SHARED, "expansion-requests");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");
const EMPIRE_OUT = path.join(SHARED, "empire.html");
const PRINTIFY_API = "https://api.printify.com/v1";

// B1 — dashboard convergence.
// The live /admin dashboard is the single source of truth. It renders from
// studio/public/data/empire-state.json (written by sync-empire-state.mjs).
// These static _shared/*.html files are convenient offline snapshots only.
// To stop them drifting, the empire-level + finance pages read their headline
// numbers from this same canonical JSON instead of re-deriving them.
const EMPIRE_STATE_FILE = path.join(HOME, "Documents/studio/public/data/empire-state.json");
const CANONICAL_DASHBOARD_URL = "https://day14.us/admin";

/**
 * Load the canonical empire snapshot (studio/public/data/empire-state.json) —
 * the exact file the live /admin dashboard reads. Returns null if missing so
 * callers can fall back to local re-derivation rather than crash.
 */
async function loadEmpireState() {
  if (!existsSync(EMPIRE_STATE_FILE)) return null;
  try {
    return JSON.parse(await fs.readFile(EMPIRE_STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Snapshot banner shown at the very top of every generated _shared/*.html page.
 * Makes the hierarchy unmistakable: the live dashboard is the truth, this file
 * is a static snapshot. `canonical` flags whether the page's numbers came from
 * empire-state.json (the same source /admin uses).
 */
function snapshotBanner({ canonical = false } = {}) {
  const ts = new Date().toLocaleString();
  const sourceNote = canonical
    ? "numbers from the canonical empire-state.json"
    : "static snapshot of local state";
  return `<div class="snapshot-banner">
  <span class="snapshot-banner-dot"></span>
  <span><strong>Static snapshot</strong> · generated ${esc(ts)} · ${esc(sourceNote)} · the live, canonical dashboard is at <a href="${esc(CANONICAL_DASHBOARD_URL)}">day14.us/admin</a></span>
</div>`;
}

const XP = {
  product_created: 100, product_sold: 1000, skill_approved: 250,
  draft_created: 25, daemon_running: 10, tenant_launched: 500, revenue_per_dollar: 10,
};

const ACHIEVEMENTS = [
  { id: "first_blood",     name: "First Blood",            icon: "⚔️",  requirement: "First product created",        test: (e) => e.totalProducts >= 1 },
  { id: "ten_strong",      name: "Ten Strong",             icon: "🛡️",  requirement: "10 products live",             test: (e) => e.totalProducts >= 10 },
  { id: "fifty_dragoons",  name: "Fifty Dragoons",         icon: "🐉",  requirement: "50 products live",             test: (e) => e.totalProducts >= 50 },
  { id: "century",         name: "Century",                icon: "💯",  requirement: "100 products live",            test: (e) => e.totalProducts >= 100 },
  { id: "first_coin",      name: "First Coin",             icon: "🪙",  requirement: "First sale ($1+)",             test: (e) => e.totalRevenue >= 100 },
  { id: "hundred_dollar",  name: "Hundred Dollar Empire",  icon: "💵",  requirement: "$100 in revenue",              test: (e) => e.totalRevenue >= 10000 },
  { id: "thousand_dollar", name: "Thousand Dollar Empire", icon: "💰",  requirement: "$1,000 in revenue",            test: (e) => e.totalRevenue >= 100000 },
  { id: "ten_thousand",    name: "Five Figures",           icon: "👑",  requirement: "$10,000 in revenue",           test: (e) => e.totalRevenue >= 1000000 },
  { id: "first_skill",     name: "Apprentice",             icon: "🧙",  requirement: "First skill approved",         test: (e) => e.totalSkills >= 1 },
  { id: "skill_master",    name: "Skill Master",           icon: "🎓",  requirement: "100 skills in registry",       test: (e) => e.totalSkills >= 100 },
  { id: "two_tenants",     name: "Duopoly",                icon: "⚖️",  requirement: "2 active tenants",             test: (e) => e.tenantCount >= 2 },
  { id: "five_tenants",    name: "Empire Builder",         icon: "🏛️",  requirement: "5 active tenants",             test: (e) => e.tenantCount >= 5 },
  { id: "ten_tenants",     name: "Industrialist",          icon: "🏭",  requirement: "10 active tenants",            test: (e) => e.tenantCount >= 10 },
  { id: "all_systems_go",  name: "All Systems Go",         icon: "🟢",  requirement: "All daemons healthy",          test: (e) => e.staleDaemons === 0 && e.daemonCount > 0 },
  { id: "self_improving",  name: "Self-Improving",         icon: "🧬",  requirement: "5+ recursive expansions",      test: (e) => e.expansionRuns >= 5 },
  { id: "streak_7",        name: "Week Streak",            icon: "🔥",  requirement: "7-day content streak",         test: (e) => e.maxStreak >= 7 },
  { id: "streak_30",       name: "Month Streak",           icon: "🔥🔥", requirement: "30-day content streak",       test: (e) => e.maxStreak >= 30 },
];

const ARCHETYPE_CLASSES = {
  "pod-store":        { class: "Merchant",   icon: "👕", color: "#f59e0b" },
  "newsletter":       { class: "Bard",       icon: "📜", color: "#a855f7" },
  "saas":             { class: "Engineer",   icon: "⚙️", color: "#06b6d4" },
  "course":           { class: "Scholar",    icon: "📚", color: "#10b981" },
  "info-product":     { class: "Sage",       icon: "🔮", color: "#8b5cf6" },
  "agency":           { class: "Warlord",    icon: "⚔️", color: "#ef4444" },
  "consulting":       { class: "Oracle",     icon: "🧠", color: "#3b82f6" },
  "physical-product": { class: "Smith",      icon: "🔨", color: "#f97316" },
  "affiliate-site":   { class: "Scout",      icon: "🗺️", color: "#84cc16" },
  "marketplace":      { class: "Broker",     icon: "🤝", color: "#ec4899" },
  "community":        { class: "Druid",      icon: "🌳", color: "#22c55e" },
};

async function loadEnv() {
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function listTenants() {
  if (!existsSync(TENANTS_FILE)) return [];
  return JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];
}

async function tenantOrders(slug) {
  const f = path.join(BIZ, slug, "orders-watcher-state.json");
  if (!existsSync(f)) return { total_revenue_cents: 0, total_orders: 0 };
  return JSON.parse(await fs.readFile(f, "utf8"));
}

async function tenantStreak(slug) {
  const f = path.join(BIZ, slug, "audit-log.jsonl");
  if (!existsSync(f)) return 0;
  const text = await fs.readFile(f, "utf8");
  const dates = new Set();
  for (const l of text.trim().split("\n").filter(Boolean)) {
    try {
      const ev = JSON.parse(l);
      if (["draft_created","post_drafted","issue_drafted","scripts_generated","video_created","product_created","pins_generated"].includes(ev.action)) {
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
  const lines = text.trim().split("\n").filter(Boolean);
  return lines.slice(-n).reverse().map((l) => { try { return JSON.parse(l); } catch { return null; }}).filter(Boolean);
}

async function tenantContentCounts(slug) {
  const tDir = path.join(BIZ, slug);
  async function count(dir, ext) {
    if (!existsSync(dir)) return 0;
    return (await fs.readdir(dir)).filter((f) => f.endsWith(ext)).length;
  }
  async function countRecursive(dir) {
    if (!existsSync(dir)) return 0;
    let total = 0;
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      if (e.isDirectory()) total += await countRecursive(path.join(dir, e.name));
      else if (e.name.endsWith(".png") || e.name.endsWith(".mp4") || e.name.endsWith(".md")) total++;
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

async function tenantQueueDepth(slug) {
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

async function countLiveSkills() {
  if (!existsSync(SKILLS_LIVE)) return 0;
  return (await fs.readdir(SKILLS_LIVE, { withFileTypes: true })).filter((e) => e.isDirectory() && !e.name.startsWith("_")).length;
}

async function countDraftSkills() {
  if (!existsSync(SKILLS_DRAFTS)) return 0;
  return (await fs.readdir(SKILLS_DRAFTS, { withFileTypes: true })).filter((e) => e.isDirectory() && !e.name.startsWith("_")).length;
}

async function expansionState() {
  const f = path.join(SHARED, "founder-ops/recursive-expansion-state.json");
  if (!existsSync(f)) return { skills_generated: 0 };
  return JSON.parse(await fs.readFile(f, "utf8"));
}

async function heartbeats() {
  if (!existsSync(POLLER_DIR)) return [];
  const out = [];
  for (const f of await fs.readdir(POLLER_DIR)) {
    if (!f.endsWith("-heartbeat.log")) continue;
    const name = f.replace("-heartbeat.log", "");
    try {
      const text = await fs.readFile(path.join(POLLER_DIR, f), "utf8");
      const last = text.trim().split("\n").filter(Boolean).slice(-1)[0];
      const ts = last?.match(/^(\S+)/)?.[1];
      const ageMin = ts ? (Date.now() - new Date(ts).getTime()) / 60_000 : Infinity;
      out.push({ name, status: ageMin < 10 ? "healthy" : "stale", ageMin: Math.round(ageMin) });
    } catch { out.push({ name, status: "error" }); }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

async function recentEmpireBattleLog(n = 30) {
  const all = [];
  for (const t of await listTenants()) {
    all.push(...(await tenantAudit(t.slug, 15)).map((ev) => ({ ...ev, _slug: t.slug })));
  }
  return all.sort((a, b) => (b.ts || "").localeCompare(a.ts || "")).slice(0, n);
}

async function fetchPrintifyProducts(apiKey) {
  if (!apiKey) return [];
  try {
    const sR = await fetch(`${PRINTIFY_API}/shops.json`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!sR.ok) return [];
    const shops = await sR.json();
    if (!shops.length) return [];
    const pR = await fetch(`${PRINTIFY_API}/shops/${shops[0].id}/products.json?limit=100`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!pR.ok) return [];
    return ((await pR.json()).data || []);
  } catch { return []; }
}

function levelFromXp(xp) { return Math.floor(Math.sqrt(xp / 100)); }
function xpForLevel(l) { return l * l * 100; }
function rel(iso) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}
function esc(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

const SHARED_CSS = `
:root { --bg:#08070d; --surface:#13111a; --surface-2:#1a1825; --border:#2a2535; --text:#e8e6ea; --muted:#847a92; --accent:#b39ddb; --gold:#f5a623; --green:#6cd66c; --red:#ff6b6b; --purple:#a855f7; --cyan:#06b6d4; }
* { box-sizing:border-box; margin:0; padding:0; }
body { font:14px/1.5 'SF Mono', Menlo, Monaco, Consolas, monospace; background:var(--bg); background-image: radial-gradient(at 80% 0%, rgba(168,85,247,0.15) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(6,182,212,0.1) 0px, transparent 50%); color:var(--text); padding:32px; max-width:1440px; margin:0 auto; min-height:100vh; }
a { color:inherit; text-decoration:none; }
h1 { font-size:36px; letter-spacing:-0.02em; margin-bottom:4px; background:linear-gradient(135deg,#fff,#b39ddb 50%,#06b6d4); -webkit-background-clip:text; background-clip:text; color:transparent; }
.sub { color:var(--muted); font-size:12px; margin-bottom:32px; }
.crumb { font-size:11px; color:var(--muted); margin-bottom:16px; text-transform:uppercase; letter-spacing:0.1em; }
.crumb a { color:var(--accent); }
.empire-bar { background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:24px; margin-bottom:24px; }
.empire-row { display:grid; grid-template-columns:200px 1fr 200px; gap:24px; align-items:center; }
.level-badge { text-align:center; }
.level-num { font-size:56px; font-weight:700; line-height:1; background:linear-gradient(135deg,#f5a623,#fff); -webkit-background-clip:text; background-clip:text; color:transparent; }
.level-label { font-size:11px; text-transform:uppercase; letter-spacing:0.15em; color:var(--muted); margin-top:4px; }
.xp-bar { width:100%; height:24px; background:var(--surface-2); border-radius:12px; overflow:hidden; position:relative; border:1px solid var(--border); }
.xp-fill { height:100%; background:linear-gradient(90deg,#a855f7,#06b6d4,#f5a623); transition:width 0.6s; border-radius:12px; box-shadow:0 0 12px rgba(168,85,247,0.4); }
.xp-text { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; text-shadow:0 0 8px rgba(0,0,0,0.8); }
.health-badge { text-align:center; }
.health-bar { width:100%; height:12px; background:var(--surface-2); border-radius:6px; overflow:hidden; margin-top:6px; border:1px solid var(--border); }
.health-fill { height:100%; }
.health-fill.good { background:var(--green); box-shadow:0 0 8px rgba(108,214,108,0.5); }
.health-fill.warn { background:var(--gold); }
.health-fill.bad { background:var(--red); animation:pulse 1.2s infinite; }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
.kpi-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; margin-bottom:24px; }
.kpi { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:16px; transition:transform 0.2s; }
.kpi:hover { transform:translateY(-2px); border-color:var(--accent); }
.kpi-label { font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); margin-bottom:6px; }
.kpi-value { font-size:22px; font-weight:700; }
.kpi-sub { font-size:11px; color:var(--muted); margin-top:2px; }
.section-header { display:flex; align-items:baseline; justify-content:space-between; margin:24px 0 12px; }
.section-title { font-size:14px; text-transform:uppercase; letter-spacing:0.2em; color:var(--muted); }
.tenant-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px; }
.char-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px; position:relative; overflow:hidden; cursor:pointer; transition:all 0.2s; }
.char-card:hover { transform:translateY(-4px); border-color:var(--accent); box-shadow:0 8px 24px rgba(168,85,247,0.2); }
.char-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--accent); }
.char-card.rank-1::before { background:linear-gradient(90deg,#f5a623,#ffeb3b); }
.char-card.rank-2::before { background:linear-gradient(90deg,#c0c0c0,#fff); }
.char-card.rank-3::before { background:linear-gradient(90deg,#cd7f32,#f5a623); }
.char-header { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
.char-icon { width:48px; height:48px; background:var(--surface-2); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:24px; border:1px solid var(--border); }
.char-name { font-size:16px; font-weight:600; }
.char-class { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; }
.char-level { position:absolute; top:16px; right:16px; background:linear-gradient(135deg,#f5a623,#ff6b6b); color:white; padding:4px 10px; border-radius:100px; font-size:11px; font-weight:700; box-shadow:0 0 8px rgba(245,166,35,0.4); }
.char-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px; margin-top:12px; padding-top:12px; border-top:1px solid var(--border); }
.char-stat-label { color:var(--muted); }
.char-stat-value { font-weight:600; }
.streak-fire { color:var(--gold); }
.rank-badge { position:absolute; top:16px; left:16px; background:var(--surface-2); border-radius:100px; padding:2px 8px; font-size:10px; font-weight:700; border:1px solid var(--border); }
.char-click-hint { font-size:10px; color:var(--accent); margin-top:12px; text-align:center; opacity:0; transition:opacity 0.2s; }
.char-card:hover .char-click-hint { opacity:1; }
.ach-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:8px; }
.ach { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:12px; text-align:center; }
.ach.unlocked { border-color:var(--gold); box-shadow:0 0 12px rgba(245,166,35,0.15); background:linear-gradient(135deg,var(--surface),rgba(245,166,35,0.05)); }
.ach.locked { opacity:0.35; filter:grayscale(1); }
.ach-icon { font-size:28px; margin-bottom:4px; }
.ach-name { font-size:11px; font-weight:600; margin-bottom:2px; }
.ach-req { font-size:9px; color:var(--muted); }
.section { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px; }
.battle-log { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:20px; max-height:500px; overflow-y:auto; }
.battle-entry { font-size:12px; padding:6px 0; border-bottom:1px solid var(--surface-2); display:grid; grid-template-columns:80px 110px 1fr; gap:12px; }
.battle-entry:last-child { border-bottom:none; }
.battle-time { color:var(--muted); }
.battle-tenant { color:var(--cyan); }
.daemon-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:8px; }
.daemon { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:12px; display:flex; align-items:center; gap:10px; }
.daemon-status { width:8px; height:8px; border-radius:50%; }
.daemon-status.healthy { background:var(--green); box-shadow:0 0 8px var(--green); }
.daemon-status.stale { background:var(--red); animation:pulse 1.2s infinite; }
.daemon-status.error { background:var(--muted); }
.daemon-name { font-size:11px; font-family:'SF Mono',monospace; flex:1; }
.daemon-age { font-size:10px; color:var(--muted); }
.action-btn { display:inline-block; padding:10px 18px; background:var(--surface-2); border:1px solid var(--border); border-radius:8px; font-size:13px; margin-right:8px; transition:all 0.2s; cursor:pointer; }
.action-btn:hover { border-color:var(--accent); background:var(--surface); }
.action-btn.primary { background:linear-gradient(135deg,#a855f7,#06b6d4); border-color:transparent; color:white; font-weight:500; }
.action-btn.primary:hover { box-shadow:0 0 12px rgba(168,85,247,0.4); }
.product-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:12px; }
.product-card { background:var(--surface); border:1px solid var(--border); border-radius:8px; overflow:hidden; }
.product-card img { width:100%; aspect-ratio:1; object-fit:cover; display:block; }
.product-card .meta { padding:10px; }
.product-card h4 { font-size:11px; margin-bottom:4px; line-height:1.3; }
.product-card .price { color:var(--gold); font-size:12px; font-weight:600; }
.product-card .pill { display:inline-block; font-size:9px; padding:1px 6px; border-radius:100px; background:var(--surface-2); margin-top:4px; }
.product-card .pill.live { background:#1d3a25; color:var(--green); }
.product-card .pill.draft { background:#4a2020; color:var(--red); }
.content-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:12px; }
.content-stat { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px; }
.content-stat-icon { font-size:24px; margin-bottom:6px; }
.content-stat-num { font-size:24px; font-weight:700; }
.content-stat-label { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em; margin-top:2px; }
.queue-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:8px; }
.queue-cell { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:10px; text-align:center; }
.queue-cell-name { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px; }
.queue-counts { display:flex; gap:6px; justify-content:center; align-items:center; font-size:12px; }
.queue-counts .q { color:var(--gold); }
.queue-counts .a { color:var(--accent); }
.queue-counts .p { color:var(--green); }
.nav { display:flex; gap:4px; margin-bottom:24px; flex-wrap:wrap; }
.nav a { padding:8px 14px; background:var(--surface); border:1px solid var(--border); border-radius:8px; font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; transition:all 0.2s; }
.nav a:hover { color:var(--text); border-color:var(--accent); }
.nav a.active { background:linear-gradient(135deg,#a855f7,#06b6d4); color:white; border-color:transparent; }
.report-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:18px; margin-bottom:12px; }
.report-card h3 { font-size:14px; margin-bottom:6px; }
.report-card .meta { font-size:11px; color:var(--muted); margin-bottom:10px; }
.report-card .preview { font-size:12px; color:var(--text); opacity:0.85; line-height:1.5; max-height:80px; overflow:hidden; }
.report-card .open-btn { display:inline-block; margin-top:10px; padding:4px 10px; font-size:11px; background:var(--surface-2); border:1px solid var(--border); border-radius:6px; color:var(--accent); }
.filter-bar { display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
.filter-pill { padding:4px 10px; background:var(--surface-2); border:1px solid var(--border); border-radius:100px; font-size:11px; cursor:pointer; transition:all 0.2s; }
.filter-pill:hover { border-color:var(--accent); }
.filter-pill.active { background:var(--accent); color:#08070d; border-color:transparent; }
.opp-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:18px; margin-bottom:12px; }
.opp-score-badge { display:inline-block; padding:3px 10px; border-radius:100px; font-size:11px; font-weight:700; }
.opp-score-badge.high { background:linear-gradient(135deg,#10b981,#06b6d4); color:white; }
.opp-score-badge.medium { background:var(--gold); color:#08070d; }
.opp-score-badge.low { background:var(--surface-2); color:var(--muted); }
.skill-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:10px; }
.skill-tile { background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:14px; }
.skill-tile h4 { font-size:13px; margin-bottom:4px; font-family:'SF Mono',monospace; }
.skill-tile .purpose { font-size:11px; color:var(--muted); line-height:1.4; max-height:48px; overflow:hidden; }
.skill-tile.draft { border-color:var(--gold); background:linear-gradient(135deg,var(--surface),rgba(245,166,35,0.05)); }
.skill-tile .badge { display:inline-block; font-size:9px; padding:1px 6px; border-radius:100px; background:var(--surface-2); margin-top:6px; }
.skill-tile.draft .badge { background:var(--gold); color:#08070d; }
.pnl-table { width:100%; border-collapse:collapse; }
.pnl-table th, .pnl-table td { padding:10px 12px; text-align:right; border-bottom:1px solid var(--border); font-size:13px; }
.pnl-table th:first-child, .pnl-table td:first-child { text-align:left; }
.pnl-table th { color:var(--muted); font-size:10px; text-transform:uppercase; letter-spacing:0.08em; font-weight:500; }
.pnl-table tr.totals { font-weight:700; background:var(--surface-2); }
.pnl-table .negative { color:var(--red); }
.pnl-table .positive { color:var(--green); }
.snapshot-banner { display:flex; align-items:center; gap:10px; background:linear-gradient(135deg,rgba(245,166,35,0.16),rgba(168,85,247,0.12)); border:1px solid var(--gold); border-radius:10px; padding:10px 16px; margin-bottom:20px; font-size:12px; line-height:1.45; color:var(--text); }
.snapshot-banner strong { color:var(--gold); }
.snapshot-banner a { color:var(--cyan); text-decoration:underline; font-weight:600; }
.snapshot-banner-dot { width:9px; height:9px; border-radius:50%; background:var(--gold); flex:none; box-shadow:0 0 8px var(--gold); }
`;

function navBar(active = "empire") {
  const pages = [
    { id: "empire", href: "empire.html", label: "⚔ Empire" },
    { id: "employees", href: "employees.html", label: "🏢 Employees" },
    { id: "pipeline", href: "content-pipeline.html", label: "🚦 Pipeline" },
    { id: "skills", href: "skills-browser.html", label: "🧬 Skills" },
    { id: "opps", href: "opportunities.html", label: "💡 Ideas" },
    { id: "finance", href: "finance.html", label: "💼 Finance" },
  ];
  return `<nav class="nav">${pages.map((p) => `<a href="${p.href}" class="${p.id === active ? "active" : ""}">${p.label}</a>`).join("")}</nav>`;
}

async function buildEmpire() {
  const env = await loadEnv();
  const allProducts = await fetchPrintifyProducts(env.PRINTIFY_API_KEY);

  // Canonical path: read headline numbers from empire-state.json — the exact
  // file /admin renders from — so the two dashboards cannot disagree.
  const state = await loadEmpireState();
  const usingCanonical = !!state;

  let tenants, beats, battleLog, liveSkills, draftSkills, expState;
  if (usingCanonical) {
    tenants = state.tenants || [];
    beats = (state.heartbeats || []).map((h) => ({ ...h, ageMin: h.ageMin }));
    battleLog = (state.empire_battle_log || []).map((ev) => ({ ...ev, _slug: ev.tenant }));
    liveSkills = state.skill_counts?.live || 0;
    draftSkills = state.skill_counts?.drafts || 0;
    expState = state.expansion_state || { skills_generated: 0 };
  } else {
    // Fallback: empire-state.json missing — re-derive locally (legacy behaviour).
    tenants = await listTenants();
    beats = await heartbeats();
    battleLog = await recentEmpireBattleLog(30);
    liveSkills = await countLiveSkills();
    draftSkills = await countDraftSkills();
    expState = await expansionState();
  }

  let totalRevenue = 0, totalOrders = 0, maxStreak = 0;
  const tenantCards = [];
  for (const t of tenants) {
    // empire-state.json tenants carry revenue_cents/orders/streak directly;
    // legacy fallback reads the same fields from per-tenant orders/audit files.
    let revCents, orderCount, streak;
    if (usingCanonical) {
      revCents = t.revenue_cents || 0;
      orderCount = t.orders || 0;
      streak = t.streak || 0;
    } else {
      const orders = await tenantOrders(t.slug);
      revCents = orders.total_revenue_cents || 0;
      orderCount = orders.total_orders || 0;
      streak = await tenantStreak(t.slug);
    }
    totalRevenue += revCents;
    totalOrders += orderCount;
    if (streak > maxStreak) maxStreak = streak;
    const archetype = ARCHETYPE_CLASSES[t.type] || { class: "Adventurer", icon: "🎯", color: "#6b7280" };
    const xp = orderCount * XP.product_sold + revCents / 100 * XP.revenue_per_dollar + XP.tenant_launched + streak * 50;
    tenantCards.push({ slug: t.slug, name: t.display_name || t.slug, type: t.type, stage: t.stage, class: archetype.class, classIcon: archetype.icon, classColor: archetype.color, revenue: revCents, orders: orderCount, streak, xp, level: levelFromXp(xp) });
  }
  tenantCards.sort((a, b) => b.xp - a.xp);

  const empire = {
    totalProducts: allProducts.length, totalRevenue, totalOrders,
    totalSkills: liveSkills, draftSkills, tenantCount: tenants.length,
    daemonCount: beats.length, staleDaemons: beats.filter((b) => b.status === "stale").length,
    healthyDaemons: beats.filter((b) => b.status === "healthy").length,
    expansionRuns: expState.skills_generated || 0, maxStreak,
  };
  empire.totalXp = empire.totalProducts * XP.product_created + empire.totalOrders * XP.product_sold + empire.totalRevenue / 100 * XP.revenue_per_dollar + empire.totalSkills * XP.skill_approved + empire.healthyDaemons * XP.daemon_running + empire.tenantCount * XP.tenant_launched;
  empire.level = levelFromXp(empire.totalXp);
  empire.xpToNext = xpForLevel(empire.level + 1) - empire.totalXp;
  empire.xpProgressPct = ((empire.totalXp - xpForLevel(empire.level)) / (xpForLevel(empire.level + 1) - xpForLevel(empire.level))) * 100;
  empire.healthPct = empire.daemonCount > 0 ? (empire.healthyDaemons / empire.daemonCount) * 100 : 0;
  const unlocked = ACHIEVEMENTS.filter((a) => a.test(empire));
  const locked = ACHIEVEMENTS.filter((a) => !a.test(empire));

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Day14 — Empire</title><meta http-equiv="refresh" content="60"><style>${SHARED_CSS}</style></head><body>
${snapshotBanner({ canonical: usingCanonical })}
${navBar("empire")}
<h1>⚔️ Day14 Empire</h1>
<div class="sub">${tenants.length} tenants · refreshing 60s · ${new Date().toLocaleString()}</div>

<div class="empire-bar">
  <div class="empire-row">
    <div class="level-badge"><div class="level-num">${empire.level}</div><div class="level-label">Empire Level</div></div>
    <div>
      <div class="xp-bar"><div class="xp-fill" style="width:${Math.max(0,Math.min(100,empire.xpProgressPct)).toFixed(1)}%"></div><div class="xp-text">${empire.totalXp.toLocaleString()} XP · ${empire.xpToNext.toLocaleString()} to level ${empire.level + 1}</div></div>
    </div>
    <div class="health-badge"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em">Empire Health</div><div style="font-size:22px;font-weight:700;margin:4px 0">${empire.healthPct.toFixed(0)}%</div><div class="health-bar"><div class="health-fill ${empire.healthPct > 80 ? 'good' : empire.healthPct > 50 ? 'warn' : 'bad'}" style="width:${empire.healthPct}%"></div></div><div style="font-size:10px;color:var(--muted);margin-top:4px">${empire.healthyDaemons}/${empire.daemonCount} daemons</div></div>
  </div>
</div>

<div class="kpi-grid">
  <div class="kpi"><div class="kpi-label">💰 Revenue</div><div class="kpi-value">$${(empire.totalRevenue/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div><div class="kpi-sub">${empire.totalOrders} orders</div></div>
  <div class="kpi"><div class="kpi-label">👕 Products</div><div class="kpi-value">${empire.totalProducts}</div></div>
  <div class="kpi"><div class="kpi-label">🏛️ Tenants</div><div class="kpi-value">${empire.tenantCount}</div></div>
  <div class="kpi"><div class="kpi-label">🧬 Skills</div><div class="kpi-value">${empire.totalSkills}</div><div class="kpi-sub">${empire.draftSkills} drafts</div></div>
  <div class="kpi"><div class="kpi-label">🔥 Best Streak</div><div class="kpi-value">${empire.maxStreak}d</div></div>
  <div class="kpi"><div class="kpi-label">⚙️ Daemons</div><div class="kpi-value">${empire.healthyDaemons}/${empire.daemonCount}</div><div class="kpi-sub" style="color:${empire.staleDaemons > 0 ? 'var(--red)' : 'var(--muted)'}">${empire.staleDaemons} stale</div></div>
</div>

<div class="section-header"><div class="section-title">⚔ Heroes — click any card</div></div>
${tenantCards.length === 0 ? '<div style="color:var(--muted);text-align:center;padding:40px">No heroes yet.</div>' :
`<div class="tenant-grid">
${tenantCards.map((c, i) => `<a href="tenant-${esc(c.slug)}.html" class="char-card ${i < 3 ? 'rank-' + (i + 1) : ''}" style="display:block">
  ${i < 3 ? `<div class="rank-badge">#${i + 1}</div>` : ''}
  <div class="char-level">LVL ${c.level}</div>
  <div class="char-header"><div class="char-icon" style="color:${c.classColor}">${c.classIcon}</div><div><div class="char-name">${esc(c.name)}</div><div class="char-class" style="color:${c.classColor}">${esc(c.class)}</div></div></div>
  <div class="char-stats">
    <div class="char-stat-label">💰 Revenue</div><div class="char-stat-value">$${(c.revenue/100).toFixed(2)}</div>
    <div class="char-stat-label">📦 Orders</div><div class="char-stat-value">${c.orders}</div>
    <div class="char-stat-label">⚡ XP</div><div class="char-stat-value">${c.xp.toLocaleString()}</div>
    <div class="char-stat-label">🔥 Streak</div><div class="char-stat-value streak-fire">${c.streak}d</div>
  </div>
  <div class="char-click-hint">→ Open dashboard</div>
</a>`).join("")}
</div>`}

<div class="section-header"><div class="section-title">🏆 Achievements (${unlocked.length}/${ACHIEVEMENTS.length})</div></div>
<div class="ach-grid">${[...unlocked,...locked].map((a) => `<div class="ach ${unlocked.includes(a) ? 'unlocked' : 'locked'}"><div class="ach-icon">${a.icon}</div><div class="ach-name">${esc(a.name)}</div><div class="ach-req">${esc(a.requirement)}</div></div>`).join("")}</div>

<div class="section-header"><div class="section-title">📜 Empire Battle Log</div></div>
<div class="battle-log">${battleLog.length === 0 ? '<div style="color:var(--muted)">No activity.</div>' : battleLog.map((a) => `<div class="battle-entry"><div class="battle-time">${esc(rel(a.ts))}</div><div class="battle-tenant"><a href="tenant-${esc(a._slug)}.html">${esc(a._slug)}</a></div><div><b>${esc(a.actor || "?")}</b> → ${esc(a.action || "")}</div></div>`).join("")}</div>

<div class="section-header"><div class="section-title">⚙ Daemons</div></div>
<div class="daemon-grid">${beats.map((b) => `<div class="daemon"><div class="daemon-status ${b.status}"></div><div class="daemon-name">${esc(b.name)}</div>${isFinite(b.ageMin) ? `<div class="daemon-age">${b.ageMin}m</div>` : ''}</div>`).join("")}</div>

<div style="text-align:center;color:var(--muted);font-size:11px;margin-top:40px">Generated ${esc(new Date().toISOString())}</div>
</body></html>`;
}

async function buildTenantPage(tenant, env, allProducts, canonicalTenant) {
  const slug = tenant.slug;
  const archetype = ARCHETYPE_CLASSES[tenant.type] || { class: "Adventurer", icon: "🎯", color: "#6b7280" };
  // Prefer canonical revenue/orders/streak from empire-state.json so tenant
  // pages match the empire page and /admin; fall back to local files.
  const orders = canonicalTenant
    ? { total_revenue_cents: canonicalTenant.revenue_cents || 0, total_orders: canonicalTenant.orders || 0 }
    : await tenantOrders(slug);
  const streak = canonicalTenant ? (canonicalTenant.streak || 0) : await tenantStreak(slug);
  const audit = await tenantAudit(slug, 50);
  const content = await tenantContentCounts(slug);
  const queue = await tenantQueueDepth(slug);
  const beats = (await heartbeats()).filter((b) => b.name.includes(slug));

  // Per-tenant products: best-effort filter (single-shop assumption — show all)
  const products = allProducts;
  const liveProducts = products.filter((p) => p.visible !== false);
  const draftProducts = products.filter((p) => p.visible === false);

  const xp = (orders.total_orders || 0) * XP.product_sold + (orders.total_revenue_cents || 0) / 100 * XP.revenue_per_dollar + XP.tenant_launched + streak * 50;
  const level = levelFromXp(xp);
  const xpToNext = xpForLevel(level + 1) - xp;
  const xpPct = ((xp - xpForLevel(level)) / (xpForLevel(level + 1) - xpForLevel(level))) * 100;

  const contentEntries = [
    { icon: "📌", num: content.pinterestPins, label: "Pinterest pins" },
    { icon: "🎬", num: content.tiktokScripts, label: "TikTok scripts" },
    { icon: "📝", num: content.blogDrafts, label: "Blog drafts" },
    { icon: "📧", num: content.newsletterIssues, label: "Newsletter issues" },
    { icon: "🎥", num: content.aiVideos, label: "AI videos" },
    { icon: "📨", num: content.csDrafts, label: "CS drafts" },
    { icon: "📣", num: content.marketingDrafts, label: "Marketing drafts" },
    { icon: "📹", num: content.rawFootage, label: "Raw footage" },
    { icon: "👽", num: content.redditDrafts, label: "Reddit drafts" },
  ];

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(tenant.display_name)} — Day14</title><meta http-equiv="refresh" content="60"><style>${SHARED_CSS}</style></head><body>
${snapshotBanner({ canonical: !!canonicalTenant })}
${navBar("")}
<div class="crumb"><a href="empire.html">← Empire</a> / ${esc(slug)}</div>
<h1>${archetype.icon} ${esc(tenant.display_name || slug)}</h1>
<div class="sub" style="color:${archetype.color}">${esc(archetype.class)} · ${esc(tenant.type || "")} · ${esc(tenant.stage || "")} · ${esc(tenant.tagline || "")}</div>

<div class="empire-bar">
  <div class="empire-row">
    <div class="level-badge"><div class="level-num">${level}</div><div class="level-label">Tenant Level</div></div>
    <div><div class="xp-bar"><div class="xp-fill" style="width:${Math.max(0,Math.min(100,xpPct)).toFixed(1)}%"></div><div class="xp-text">${xp.toLocaleString()} XP · ${xpToNext.toLocaleString()} to level ${level + 1}</div></div></div>
    <div class="health-badge"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em">Streak</div><div style="font-size:36px;font-weight:700;color:var(--gold)">🔥 ${streak}d</div></div>
  </div>
</div>

<div class="kpi-grid">
  <div class="kpi"><div class="kpi-label">💰 Revenue</div><div class="kpi-value">$${(orders.total_revenue_cents/100).toFixed(2)}</div><div class="kpi-sub">${orders.total_orders} orders</div></div>
  <div class="kpi"><div class="kpi-label">👕 Live</div><div class="kpi-value">${liveProducts.length}</div><div class="kpi-sub">${draftProducts.length} drafts</div></div>
  <div class="kpi"><div class="kpi-label">⏳ Queued</div><div class="kpi-value">${queue.queued}</div></div>
  <div class="kpi"><div class="kpi-label">✓ Approved</div><div class="kpi-value">${queue.approved}</div></div>
  <div class="kpi"><div class="kpi-label">📤 Posted</div><div class="kpi-value">${queue.posted}</div></div>
  <div class="kpi"><div class="kpi-label">📨 CS waiting</div><div class="kpi-value">${content.csDrafts}</div></div>
</div>

<div class="section-header"><div class="section-title">🚀 Quick actions</div></div>
<div style="margin-bottom:24px">
  <a href="../../${slug}/" class="action-btn">📂 Open folder</a>
  <a href="https://printify.com/app/store/products/1" target="_blank" class="action-btn">🛒 Printify</a>
  <a href="https://day14.us/brands/${slug}" target="_blank" class="action-btn">🌐 Brand site</a>
  <a href="${slug}-dashboard.html" class="action-btn">📊 Original dashboard</a>
</div>

<div class="section-header"><div class="section-title">📚 Content factory output</div></div>
<div class="content-grid">${contentEntries.map((e) => `<div class="content-stat"><div class="content-stat-icon">${e.icon}</div><div class="content-stat-num">${e.num}</div><div class="content-stat-label">${esc(e.label)}</div></div>`).join("")}</div>

<div class="section-header"><div class="section-title">🚦 Social queue (by platform)</div></div>
${Object.keys(queue.byPlatform).length === 0 ? '<div style="color:var(--muted);padding:20px">No platforms queued yet. Run full-content-pipeline.</div>' :
`<div class="queue-grid">${Object.entries(queue.byPlatform).map(([p, c]) => `<div class="queue-cell"><div class="queue-cell-name">${esc(p)}</div><div class="queue-counts"><span class="q" title="queued">${c.queued}</span> · <span class="a" title="approved">${c.approved}</span> · <span class="p" title="posted">${c.posted}</span></div></div>`).join("")}</div>
<div style="font-size:10px;color:var(--muted);margin-top:6px">queued · approved · posted</div>`}

<div class="section-header"><div class="section-title">👕 Products (${products.length})</div></div>
${products.length === 0 ? '<div style="color:var(--muted);padding:20px">No products yet.</div>' :
`<div class="product-grid">${products.slice(0, 30).map((p) => {
  const minPrice = Math.min(...(p.variants || []).filter((v) => v.is_enabled).map((v) => v.price));
  return `<a href="https://printify.com/app/editor/${esc(p.id)}" target="_blank" class="product-card" style="display:block">
    ${p.images?.[0]?.src ? `<img src="${esc(p.images[0].src)}" alt="" loading="lazy">` : ''}
    <div class="meta"><h4>${esc((p.title || "").slice(0, 60))}</h4>${isFinite(minPrice) ? `<div class="price">$${(minPrice/100).toFixed(2)}</div>` : ''}<span class="pill ${p.visible === false ? 'draft' : 'live'}">${p.visible === false ? 'draft' : 'live'}</span></div>
  </a>`;
}).join("")}</div>`}

<div class="section-header"><div class="section-title">⚙ Tenant daemons</div></div>
${beats.length === 0 ? '<div style="color:var(--muted);padding:20px">No tenant-specific daemons (uses empire ones).</div>' :
`<div class="daemon-grid">${beats.map((b) => `<div class="daemon"><div class="daemon-status ${b.status}"></div><div class="daemon-name">${esc(b.name)}</div>${isFinite(b.ageMin) ? `<div class="daemon-age">${b.ageMin}m</div>` : ''}</div>`).join("")}</div>`}

<div class="section-header"><div class="section-title">📜 Activity log</div></div>
<div class="battle-log">${audit.length === 0 ? '<div style="color:var(--muted)">No activity logged yet.</div>' : audit.map((a) => `<div class="battle-entry"><div class="battle-time">${esc(rel(a.ts))}</div><div class="battle-tenant">${esc(a.actor || "?")}</div><div>${esc(a.action || "")}${a.slug ? ` <span style="color:var(--muted)">${esc(a.slug)}</span>` : ''}${a.quote ? ` — <i>${esc(a.quote.slice(0,80))}</i>` : ''}</div></div>`).join("")}</div>

<div style="text-align:center;color:var(--muted);font-size:11px;margin-top:40px"><a href="empire.html" style="color:var(--accent)">← Back to empire</a> · Generated ${esc(new Date().toISOString())}</div>
</body></html>`;
}

// ============= EMPLOYEES PAGE =============

const EMPLOYEES = [
  { id: "cfo-agent",            name: "CFO",                       icon: "💼", reportsDir: "finance",          schedule: "daily 8am + Sun 6pm" },
  { id: "product-strategist",   name: "Head of Product",           icon: "📦", reportsDir: "product-strategy", schedule: "daily 4pm" },
  { id: "customer-success-agent", name: "Customer Success",        icon: "🤝", reportsDir: null,               schedule: "continuous" },
  { id: "compliance-officer",   name: "Compliance Officer",        icon: "⚖️", reportsDir: "compliance",       schedule: "daily 11pm" },
  { id: "performance-analyst",  name: "Performance Analyst",       icon: "📊", reportsDir: "analytics",        schedule: "Mon 7am" },
  { id: "sales-director",       name: "VP Sales",                  icon: "🎯", reportsDir: null,               schedule: "daily 10am" },
  { id: "pr-director",          name: "PR Director",               icon: "📰", reportsDir: null,               schedule: "Tue + Thu 9am" },
  { id: "brand-steward",        name: "Brand Steward",             icon: "🎨", reportsDir: null,               schedule: "daily 10pm" },
  { id: "devops-sre",           name: "DevOps / SRE",              icon: "🔧", reportsDir: "ops",              schedule: "every 4hr" },
  { id: "investor-relations",   name: "Investor Relations",        icon: "📈", reportsDir: "investor-updates", schedule: "monthly" },
];

async function lastReport(reportsDir) {
  if (!reportsDir) return null;
  const dir = path.join(SHARED, reportsDir);
  if (!existsSync(dir)) return null;
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md")).sort().reverse();
  if (!files.length) return null;
  const fp = path.join(dir, files[0]);
  const stat = await fs.stat(fp);
  const text = (await fs.readFile(fp, "utf8")).slice(0, 600);
  return { file: files[0], path: fp, mtime: stat.mtime, preview: text.replace(/^---[\s\S]+?---/, "").trim().slice(0, 400) };
}

async function lastHeartbeat(employeeId) {
  const f = path.join(POLLER_DIR, `${employeeId}-heartbeat.log`);
  if (!existsSync(f)) return null;
  try {
    const text = await fs.readFile(f, "utf8");
    const last = text.trim().split("\n").filter(Boolean).slice(-1)[0];
    const ts = last?.match(/^(\S+)/)?.[1];
    return ts ? new Date(ts) : null;
  } catch { return null; }
}

async function buildEmployeesPage() {
  const lines = [];
  for (const emp of EMPLOYEES) {
    const report = await lastReport(emp.reportsDir);
    const beat = await lastHeartbeat(emp.id);
    lines.push({ emp, report, beat });
  }

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Employees — Day14</title><meta http-equiv="refresh" content="120"><style>${SHARED_CSS}</style></head><body>
${snapshotBanner()}
${navBar("employees")}
<h1>🏢 Employees</h1>
<div class="sub">${EMPLOYEES.length} C-suite agents · ${new Date().toLocaleString()}</div>

<div class="kpi-grid" style="grid-template-columns:repeat(auto-fill, minmax(220px, 1fr))">
${lines.map(({ emp, report, beat }) => `
<div class="report-card">
  <h3>${emp.icon} ${esc(emp.name)}</h3>
  <div class="meta">${esc(emp.schedule)} · ${beat ? "last beat " + rel(beat.toISOString()) : "no heartbeat"}</div>
  ${report
    ? `<div class="preview">${esc(report.preview)}</div><a href="file://${esc(report.path)}" class="open-btn">📄 ${esc(report.file)} (${rel(report.mtime.toISOString())})</a>`
    : `<div class="preview" style="color:var(--muted)">No report yet — waiting for first scheduled run.</div>`}
</div>
`).join("")}
</div>

<div class="section-header"><div class="section-title">📚 Report directories</div></div>
<div class="ach-grid">
${EMPLOYEES.filter((e) => e.reportsDir).map((e) => `<div class="ach unlocked"><div class="ach-icon">${e.icon}</div><div class="ach-name">${esc(e.name)}</div><div class="ach-req">~/Documents/businesses/_shared/${esc(e.reportsDir)}/</div></div>`).join("")}
</div>
</body></html>`;
}

// ============= CONTENT PIPELINE PAGE =============

const PLATFORMS = ["pinterest", "instagram_reels", "instagram_feed", "tiktok", "youtube_shorts", "linkedin", "threads", "twitter", "blog", "newsletter"];

async function buildPipelinePage() {
  const tenants = await listTenants();
  const grid = [];
  for (const t of tenants) {
    const queue = await tenantQueueDepth(t.slug);
    grid.push({ tenant: t, queue });
  }

  // Empire totals per platform
  const platformTotals = {};
  for (const p of PLATFORMS) platformTotals[p] = { queued: 0, approved: 0, posted: 0 };
  for (const g of grid) {
    for (const [p, c] of Object.entries(g.queue.byPlatform)) {
      if (!platformTotals[p]) platformTotals[p] = { queued: 0, approved: 0, posted: 0 };
      platformTotals[p].queued += c.queued;
      platformTotals[p].approved += c.approved;
      platformTotals[p].posted += c.posted;
    }
  }

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Pipeline — Day14</title><meta http-equiv="refresh" content="60"><style>${SHARED_CSS}</style></head><body>
${snapshotBanner()}
${navBar("pipeline")}
<h1>🚦 Content Pipeline</h1>
<div class="sub">Queue states across all platforms · ${new Date().toLocaleString()}</div>

<div class="section-header"><div class="section-title">Empire totals by platform</div></div>
<div class="queue-grid">
${Object.entries(platformTotals).map(([p, c]) => `<div class="queue-cell"><div class="queue-cell-name">${esc(p)}</div><div class="queue-counts"><span class="q">${c.queued}</span> · <span class="a">${c.approved}</span> · <span class="p">${c.posted}</span></div></div>`).join("")}
</div>
<div style="font-size:10px;color:var(--muted);margin-top:6px">⏳ queued · ✓ approved · 📤 posted</div>

<div class="section-header"><div class="section-title">By tenant</div></div>
${grid.map(({ tenant, queue }) => `
<div class="section" style="margin-bottom:16px">
  <h3 style="margin-bottom:12px">${esc(tenant.display_name || tenant.slug)} <span style="font-size:11px;color:var(--muted)">${queue.queued} queued · ${queue.approved} approved · ${queue.posted} posted</span></h3>
  ${Object.keys(queue.byPlatform).length === 0
    ? '<div style="color:var(--muted);font-size:12px">No content queued yet.</div>'
    : `<div class="queue-grid">${Object.entries(queue.byPlatform).map(([p, c]) => `<div class="queue-cell"><div class="queue-cell-name">${esc(p)}</div><div class="queue-counts"><span class="q">${c.queued}</span> · <span class="a">${c.approved}</span> · <span class="p">${c.posted}</span></div></div>`).join("")}</div>`}
  <div style="margin-top:8px"><a href="tenant-${esc(tenant.slug)}.html" style="color:var(--accent);font-size:11px">→ Open ${esc(tenant.slug)} dashboard</a></div>
</div>
`).join("")}

<div class="section-header"><div class="section-title">⚡ Quick commands (Telegram)</div></div>
<div class="section">
  <div style="font-size:12px;line-height:1.8;color:var(--muted)">
    <code style="color:var(--accent)">approve all</code> — approve every queued post empire-wide<br>
    <code style="color:var(--accent)">approve post &lt;id&gt;</code> — approve specific queued post<br>
    <code style="color:var(--accent)">enable auto pinterest hot-flash-co</code> — skip review on a platform for one tenant<br>
    <code style="color:var(--accent)">disable auto tiktok hot-flash-co</code> — re-enable review<br>
  </div>
</div>
</body></html>`;
}

// ============= SKILLS BROWSER =============

async function readSkillMeta(dir) {
  const skillMd = path.join(dir, "SKILL.md");
  if (!existsSync(skillMd)) return null;
  const text = await fs.readFile(skillMd, "utf8");
  const fm = text.match(/^---([\s\S]+?)---/);
  if (!fm) return { name: path.basename(dir), purpose: "(no frontmatter)" };
  const meta = {};
  for (const line of fm[1].split("\n")) {
    const m = line.match(/^(\w+):\s*(.+?)\s*$/);
    if (m) meta[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return { name: meta.name || path.basename(dir), purpose: meta.purpose || "", hand_coded: meta.hand_coded === "true", status: meta.status || "live" };
}

async function buildSkillsPage() {
  const liveSkills = [];
  const draftSkills = [];
  if (existsSync(SKILLS_LIVE)) {
    for (const e of await fs.readdir(SKILLS_LIVE, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name.startsWith("_")) continue;
      const meta = await readSkillMeta(path.join(SKILLS_LIVE, e.name));
      if (meta) liveSkills.push(meta);
    }
  }
  if (existsSync(SKILLS_DRAFTS)) {
    for (const e of await fs.readdir(SKILLS_DRAFTS, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name.startsWith("_")) continue;
      const meta = await readSkillMeta(path.join(SKILLS_DRAFTS, e.name));
      if (meta) draftSkills.push(meta);
    }
  }
  liveSkills.sort((a, b) => a.name.localeCompare(b.name));
  draftSkills.sort((a, b) => a.name.localeCompare(b.name));

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Skills — Day14</title><meta http-equiv="refresh" content="120"><style>${SHARED_CSS}</style></head><body>
${snapshotBanner()}
${navBar("skills")}
<h1>🧬 Skill Registry</h1>
<div class="sub">${liveSkills.length} live · ${draftSkills.length} drafts · ${new Date().toLocaleString()}</div>

${draftSkills.length > 0 ? `
<div class="section-header"><div class="section-title">📝 Drafts awaiting approval (${draftSkills.length})</div></div>
<div class="skill-grid">
${draftSkills.map((s) => `<div class="skill-tile draft"><h4>${esc(s.name)}</h4><div class="purpose">${esc(s.purpose)}</div><span class="badge">DRAFT</span></div>`).join("")}
</div>
<div style="font-size:11px;color:var(--muted);margin-top:8px">Reply <code style="color:var(--accent)">approve &lt;skill-name&gt;</code> in Telegram to ship to live.</div>
` : ""}

<div class="section-header"><div class="section-title">✓ Live skills (${liveSkills.length})</div></div>
<div class="skill-grid">
${liveSkills.map((s) => `<div class="skill-tile"><h4>${esc(s.name)}</h4><div class="purpose">${esc(s.purpose)}</div><span class="badge">${s.hand_coded ? "HAND-CODED" : "LLM"}</span></div>`).join("")}
</div>
</body></html>`;
}

// ============= OPPORTUNITIES PAGE =============

async function buildOpportunitiesPage() {
  if (!existsSync(EXPANSION_INBOX) && !existsSync(path.join(SHARED, "opportunities"))) return null;
  const oppsDir = path.join(SHARED, "opportunities");
  const opps = [];
  if (existsSync(oppsDir)) {
    for (const f of await fs.readdir(oppsDir)) {
      if (!f.endsWith(".json")) continue;
      try { opps.push({ ...JSON.parse(await fs.readFile(path.join(oppsDir, f), "utf8")), _file: f }); } catch {}
    }
  }
  opps.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

  const byStatus = {
    open: opps.filter((o) => o.status === "open" && !o.pitched),
    pitched: opps.filter((o) => o.pitched && o.status === "open"),
    launching: opps.filter((o) => o.status === "launching"),
    skipped: opps.filter((o) => o.status === "skipped"),
  };

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Ideas — Day14</title><meta http-equiv="refresh" content="120"><style>${SHARED_CSS}</style></head><body>
${snapshotBanner()}
${navBar("opps")}
<h1>💡 Opportunities</h1>
<div class="sub">${opps.length} ideas scanned · ${byStatus.pitched.length} pitched · ${byStatus.launching.length} launching</div>

<div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="kpi"><div class="kpi-label">🆕 New</div><div class="kpi-value">${byStatus.open.length}</div></div>
  <div class="kpi"><div class="kpi-label">📩 Pitched</div><div class="kpi-value">${byStatus.pitched.length}</div></div>
  <div class="kpi"><div class="kpi-label">🚀 Launching</div><div class="kpi-value">${byStatus.launching.length}</div></div>
  <div class="kpi"><div class="kpi-label">⏭ Skipped</div><div class="kpi-value">${byStatus.skipped.length}</div></div>
</div>

${["pitched", "open", "launching", "skipped"].map((bucket) => {
  const items = byStatus[bucket];
  if (items.length === 0) return "";
  const titles = { pitched: "📩 Pitched — ready to launch", open: "🆕 New opportunities (unpitched)", launching: "🚀 Launching", skipped: "⏭ Skipped" };
  return `
<div class="section-header"><div class="section-title">${titles[bucket]} (${items.length})</div></div>
${items.slice(0, 20).map((o) => {
  const score = o.total_score || 0;
  const tier = score >= 85 ? "high" : score >= 70 ? "medium" : "low";
  const id = o.id || o._file.replace(/\.json$/, "");
  return `
<div class="opp-card">
  <div style="display:flex; justify-content:space-between; align-items:start; gap:12px;">
    <div style="flex:1">
      <div style="font-size:11px; color:var(--muted); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">${esc(o.suggested_archetype || "?")} · ${esc(id)}</div>
      <h3 style="font-size:16px; margin-bottom:8px;">${esc(o.niche || id)}</h3>
      <div style="font-size:12px; color:var(--text); opacity:0.85; line-height:1.5;">${esc((o.rationale || o.evidence || "").slice(0, 280))}</div>
      ${o.pitched ? `<div style="margin-top:10px;"><code style="color:var(--accent); font-size:11px;">bootstrap-pitch ${esc(id)}</code></div>` : ""}
    </div>
    <div class="opp-score-badge ${tier}">${score}</div>
  </div>
</div>`;
}).join("")}
`;
}).join("")}

<div class="section-header"><div class="section-title">⚡ Telegram commands</div></div>
<div class="section">
  <div style="font-size:12px;line-height:1.8;color:var(--muted)">
    <code style="color:var(--accent)">bootstrap-pitch &lt;id&gt;</code> — launch the business (full archetype scaffold)<br>
    <code style="color:var(--accent)">show pitch &lt;id&gt;</code> — show the full pitch text inline<br>
    <code style="color:var(--accent)">skip-pitch &lt;id&gt;</code> — retire this opportunity<br>
  </div>
</div>
</body></html>`;
}

// ============= FINANCE PAGE =============

const COGS_BY_TYPE = {
  "pod-store": { per_order_cents: 800, fixed_monthly_cents: 0 },
  "newsletter": { per_order_cents: 50, fixed_monthly_cents: 2900 },
  "course": { per_order_cents: 500, fixed_monthly_cents: 5900 },
  "info-product": { per_order_cents: 100, fixed_monthly_cents: 0 },
  "saas": { per_order_cents: 200, fixed_monthly_cents: 0 },
  "agency": { per_order_cents: 50000, fixed_monthly_cents: 0 },
  "consulting": { per_order_cents: 5000, fixed_monthly_cents: 0 },
  "physical-product": { per_order_cents: 1500, fixed_monthly_cents: 0 },
  "affiliate-site": { per_order_cents: 0, fixed_monthly_cents: 0 },
};

async function buildFinancePage() {
  // Revenue + orders come from the canonical empire-state.json (same source as
  // /admin); COGS is derived here from archetype assumptions. Fall back to
  // local per-tenant files only if the canonical snapshot is unavailable.
  const state = await loadEmpireState();
  const usingCanonical = !!state;
  const tenants = usingCanonical ? (state.tenants || []) : await listTenants();
  const rows = [];
  let totalRev = 0, totalCogs = 0, totalOrders = 0;
  for (const t of tenants) {
    const orders = usingCanonical
      ? { total_revenue_cents: t.revenue_cents || 0, total_orders: t.orders || 0 }
      : await tenantOrders(t.slug);
    const cogs = COGS_BY_TYPE[t.type] || COGS_BY_TYPE["pod-store"];
    const rev = orders.total_revenue_cents || 0;
    const cogsTotal = (orders.total_orders || 0) * cogs.per_order_cents + cogs.fixed_monthly_cents;
    const gross = rev - cogsTotal;
    const margin = rev > 0 ? (gross / rev) * 100 : 0;
    totalRev += rev;
    totalCogs += cogsTotal;
    totalOrders += orders.total_orders || 0;
    rows.push({ slug: t.slug, name: t.display_name, type: t.type, rev, cogs: cogsTotal, gross, margin, orders: orders.total_orders || 0 });
  }
  const grossEmpire = totalRev - totalCogs;
  const marginEmpire = totalRev > 0 ? (grossEmpire / totalRev) * 100 : 0;

  // Recent CFO reports
  const cfoReports = [];
  const fdir = path.join(SHARED, "finance");
  if (existsSync(fdir)) {
    const files = (await fs.readdir(fdir)).filter((f) => f.endsWith(".md")).sort().reverse().slice(0, 5);
    for (const f of files) {
      const stat = await fs.stat(path.join(fdir, f));
      cfoReports.push({ file: f, mtime: stat.mtime });
    }
  }

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Finance — Day14</title><meta http-equiv="refresh" content="60"><style>${SHARED_CSS}</style></head><body>
${snapshotBanner({ canonical: usingCanonical })}
${navBar("finance")}
<h1>💼 Finance</h1>
<div class="sub">Empire-wide P&L · revenue from canonical empire-state.json · ${new Date().toLocaleString()}</div>

<div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
  <div class="kpi"><div class="kpi-label">💰 Revenue</div><div class="kpi-value">$${(totalRev/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div><div class="kpi-sub">${totalOrders} orders</div></div>
  <div class="kpi"><div class="kpi-label">💸 COGS</div><div class="kpi-value">$${(totalCogs/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div>
  <div class="kpi"><div class="kpi-label">📈 Gross</div><div class="kpi-value ${grossEmpire >= 0 ? "" : "negative"}" style="color:${grossEmpire >= 0 ? "var(--green)" : "var(--red)"}">$${(grossEmpire/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div>
  <div class="kpi"><div class="kpi-label">📊 Margin</div><div class="kpi-value">${marginEmpire.toFixed(0)}%</div></div>
</div>

<div class="section-header"><div class="section-title">Per-tenant P&L</div></div>
<div class="section">
  <table class="pnl-table">
    <thead><tr><th>Tenant</th><th>Type</th><th>Orders</th><th>Revenue</th><th>COGS</th><th>Gross</th><th>Margin</th></tr></thead>
    <tbody>
    ${rows.map((r) => `<tr>
      <td><a href="tenant-${esc(r.slug)}.html" style="color:var(--accent)">${esc(r.name)}</a></td>
      <td style="color:var(--muted);font-size:12px">${esc(r.type)}</td>
      <td>${r.orders}</td>
      <td>$${(r.rev/100).toFixed(2)}</td>
      <td>$${(r.cogs/100).toFixed(2)}</td>
      <td class="${r.gross >= 0 ? "positive" : "negative"}">$${(r.gross/100).toFixed(2)}</td>
      <td>${r.margin.toFixed(0)}%</td>
    </tr>`).join("")}
    <tr class="totals"><td>EMPIRE</td><td></td><td>${totalOrders}</td><td>$${(totalRev/100).toFixed(2)}</td><td>$${(totalCogs/100).toFixed(2)}</td><td class="${grossEmpire >= 0 ? "positive" : "negative"}">$${(grossEmpire/100).toFixed(2)}</td><td>${marginEmpire.toFixed(0)}%</td></tr>
    </tbody>
  </table>
</div>

<div class="section-header"><div class="section-title">📄 Recent CFO reports</div></div>
${cfoReports.length === 0 ? '<div style="color:var(--muted);padding:20px">No CFO reports yet. First runs daily at 8am.</div>' :
`<div class="ach-grid">${cfoReports.map((r) => `<div class="ach unlocked"><div class="ach-icon">📄</div><div class="ach-name">${esc(r.file)}</div><div class="ach-req">${esc(rel(r.mtime.toISOString()))}</div></div>`).join("")}</div>`}
</body></html>`;
}

async function main() {
  const env = await loadEnv();
  const tenants = await listTenants();
  const allProducts = await fetchPrintifyProducts(env.PRINTIFY_API_KEY);
  await fs.mkdir(SHARED, { recursive: true });

  // Canonical snapshot — the same file /admin renders from. Used to keep the
  // per-tenant pages' headline numbers in step with the empire page.
  const state = await loadEmpireState();
  const canonicalBySlug = new Map((state?.tenants || []).map((t) => [t.slug, t]));
  if (!state) console.warn("⚠ empire-state.json missing — falling back to local re-derivation");

  // Empire index
  await fs.writeFile(EMPIRE_OUT, await buildEmpire());
  console.log(`✓ ${EMPIRE_OUT}`);

  // Per-tenant pages
  for (const t of tenants) {
    const out = path.join(SHARED, `tenant-${t.slug}.html`);
    await fs.writeFile(out, await buildTenantPage(t, env, allProducts, canonicalBySlug.get(t.slug)));
    console.log(`✓ ${out}`);
  }

  // Aux pages
  await fs.writeFile(path.join(SHARED, "employees.html"), await buildEmployeesPage());
  console.log(`✓ employees.html`);
  await fs.writeFile(path.join(SHARED, "content-pipeline.html"), await buildPipelinePage());
  console.log(`✓ content-pipeline.html`);
  await fs.writeFile(path.join(SHARED, "skills-browser.html"), await buildSkillsPage());
  console.log(`✓ skills-browser.html`);
  const opps = await buildOpportunitiesPage();
  if (opps) {
    await fs.writeFile(path.join(SHARED, "opportunities.html"), opps);
    console.log(`✓ opportunities.html`);
  }
  await fs.writeFile(path.join(SHARED, "finance.html"), await buildFinancePage());
  console.log(`✓ finance.html`);

  console.log(`\nOpen: open ${EMPIRE_OUT}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
