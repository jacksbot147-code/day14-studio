#!/usr/bin/env node
/**
 * empire-dashboard.mjs
 *
 * Cross-business empire dashboard. Single page, all tenants.
 *
 * Renders:
 *   - Empire revenue + order rollup
 *   - Per-tenant cards: revenue, products, daemons health, today's drafts
 *   - Pending Jack-tap queue (skill drafts + CS drafts + product drafts)
 *   - Recent agent activity across all tenants (last 30 events)
 *   - Daemon health grid
 *
 * Output: ~/Documents/businesses/_shared/empire-dashboard.html
 *
 * Run on-demand or via LaunchAgent (auto-refresh every 15 min).
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
const SKILLS_DRAFTS = path.join(HOME, "Documents/studio/docs/seeds/skills/_drafts");
const EXPANSION_INBOX = path.join(SHARED, "expansion-requests");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");
const OUT = path.join(SHARED, "empire-dashboard.html");
const PRINTIFY_API = "https://api.printify.com/v1";

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

async function tenantOrdersState(slug) {
  const f = path.join(BIZ, slug, "orders-watcher-state.json");
  if (!existsSync(f)) return null;
  return JSON.parse(await fs.readFile(f, "utf8"));
}

async function fetchPrintifyProducts(printifyKey) {
  try {
    const sR = await fetch(`${PRINTIFY_API}/shops.json`, { headers: { Authorization: `Bearer ${printifyKey}` } });
    if (!sR.ok) return [];
    const shops = await sR.json();
    if (!shops.length) return [];
    const pR = await fetch(`${PRINTIFY_API}/shops/${shops[0].id}/products.json?limit=100`, {
      headers: { Authorization: `Bearer ${printifyKey}` },
    });
    if (!pR.ok) return [];
    return ((await pR.json()).data || []);
  } catch { return []; }
}

async function tenantTodaysDrafts(slug) {
  const auditPath = path.join(BIZ, slug, "audit-log.jsonl");
  if (!existsSync(auditPath)) return 0;
  const text = await fs.readFile(auditPath, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  return text.trim().split("\n").filter((l) => {
    try { const ev = JSON.parse(l); return ev.action === "draft_created" && ev.ts?.startsWith(today); }
    catch { return false; }
  }).length;
}

async function tenantCsDrafts(slug) {
  const dir = path.join(BIZ, slug, "cs-drafts");
  if (!existsSync(dir)) return 0;
  return (await fs.readdir(dir)).filter((f) => f.endsWith(".md")).length;
}

async function heartbeats() {
  if (!existsSync(POLLER_DIR)) return [];
  const results = [];
  for (const f of await fs.readdir(POLLER_DIR)) {
    if (!f.endsWith("-heartbeat.log")) continue;
    const name = f.replace("-heartbeat.log", "");
    try {
      const text = await fs.readFile(path.join(POLLER_DIR, f), "utf8");
      const lines = text.trim().split("\n").filter(Boolean);
      const last = lines[lines.length - 1];
      const ts = last?.match(/^(\S+)/)?.[1];
      const ageMin = ts ? (Date.now() - new Date(ts).getTime()) / 60_000 : Infinity;
      results.push({ name, age_min: Math.round(ageMin), status: ageMin < 10 ? "healthy" : "stale" });
    } catch { results.push({ name, status: "error" }); }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}

async function recentAuditAcrossTenants(n = 30) {
  const all = [];
  const tenants = await listTenants();
  for (const t of tenants) {
    const auditPath = path.join(BIZ, t.slug, "audit-log.jsonl");
    if (!existsSync(auditPath)) continue;
    const text = await fs.readFile(auditPath, "utf8");
    for (const line of text.trim().split("\n").filter(Boolean).slice(-15)) {
      try { all.push(JSON.parse(line)); } catch {}
    }
  }
  return all.sort((a, b) => (b.ts || "").localeCompare(a.ts || "")).slice(0, n);
}

async function skillDraftCount() {
  if (!existsSync(SKILLS_DRAFTS)) return 0;
  const entries = await fs.readdir(SKILLS_DRAFTS, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory() && !e.name.startsWith("_")).length;
}

async function expansionQueueCounts() {
  if (!existsSync(EXPANSION_INBOX)) return { skills: 0, businesses: 0 };
  let s = 0, b = 0;
  for (const f of await fs.readdir(EXPANSION_INBOX)) {
    if (!f.endsWith(".json")) continue;
    try {
      const data = JSON.parse(await fs.readFile(path.join(EXPANSION_INBOX, f), "utf8"));
      if (data.status !== "pending") continue;
      if (data.type === "new-business") b += 1; else s += 1;
    } catch {}
  }
  return { skills: s, businesses: b };
}

function rel(iso) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h`;
  return `${Math.round(ms / 86_400_000)}d`;
}

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function buildHtml() {
  const env = await loadEnv();
  const tenants = await listTenants();
  const allProducts = env.PRINTIFY_API_KEY ? await fetchPrintifyProducts(env.PRINTIFY_API_KEY) : [];
  const beats = await heartbeats();
  const audit = await recentAuditAcrossTenants(30);
  const drafts = await skillDraftCount();
  const queue = await expansionQueueCounts();

  let totalRevenue = 0, totalOrders = 0, totalProducts = allProducts.length, totalLive = 0;
  const tenantCards = [];
  for (const t of tenants) {
    const orders = await tenantOrdersState(t.slug);
    const rev = orders?.total_revenue_cents || 0;
    const ord = orders?.total_orders || 0;
    totalRevenue += rev;
    totalOrders += ord;
    const todaysDrafts = await tenantTodaysDrafts(t.slug);
    const csDrafts = await tenantCsDrafts(t.slug);
    // Live products = (approx — Printify products with any visible variant)
    const tProducts = allProducts.filter((p) => p.visible !== false);
    const live = tProducts.length; // simplistic — needs per-tenant shop separation if multi-shop
    totalLive += live;
    tenantCards.push({
      slug: t.slug,
      name: t.display_name || t.slug,
      type: t.type || "—",
      stage: t.stage || "—",
      revenue_cents: rev,
      orders: ord,
      todays_drafts: todaysDrafts,
      cs_drafts: csDrafts,
      live_products: live,
    });
  }

  const stale = beats.filter((b) => b.status === "stale").length;
  const healthy = beats.filter((b) => b.status === "healthy").length;

  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>Day14 — Empire Dashboard</title>
<meta http-equiv="refresh" content="900">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font: 14px/1.5 -apple-system, BlinkMacSystemFont, system-ui, sans-serif; background: #0f0e13; color: #e8e6ea; padding: 32px; max-width: 1400px; margin: 0 auto; }
h1 { font-size: 32px; letter-spacing: -0.02em; margin-bottom: 4px; }
.sub { color: #999; font-size: 13px; margin-bottom: 32px; }
.row { display: grid; gap: 16px; margin-bottom: 24px; }
.row.kpi { grid-template-columns: repeat(5, 1fr); }
.row.cards { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
.card { background: #1a1820; border: 1px solid #2a2730; border-radius: 12px; padding: 20px; }
.kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 8px; }
.kpi-value { font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
.kpi-sub { font-size: 12px; color: #666; margin-top: 4px; }
.tenant-card h2 { font-size: 15px; margin-bottom: 8px; letter-spacing: -0.01em; }
.tenant-card .meta { font-size: 11px; color: #777; margin-bottom: 12px; }
.tenant-card .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
.tenant-card .stat-label { color: #888; }
.tenant-card .stat-value { color: #e8e6ea; font-weight: 500; }
.section { background: #1a1820; border: 1px solid #2a2730; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
.section h2 { font-size: 16px; margin-bottom: 16px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
td, th { padding: 8px 10px; text-align: left; border-bottom: 1px solid #2a2730; }
th { color: #888; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
.pill { display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.04em; }
.pill.healthy { background: #1d3a25; color: #6cbf6c; }
.pill.stale { background: #4a2020; color: #d97766; }
.pill.error { background: #3a3a40; color: #999; }
.muted { color: #666; }
footer { text-align: center; color: #666; font-size: 12px; margin-top: 40px; }
a { color: #b39ddb; }
</style>
</head><body>
<h1>Day14 — Empire</h1>
<div class="sub">${tenants.length} tenants · auto-refreshes every 15 min · ${new Date().toLocaleString()}</div>

<div class="row kpi">
  <div class="card">
    <div class="kpi-label">Lifetime Revenue</div>
    <div class="kpi-value">$${(totalRevenue / 100).toFixed(2)}</div>
    <div class="kpi-sub">${totalOrders} orders</div>
  </div>
  <div class="card">
    <div class="kpi-label">Live Products</div>
    <div class="kpi-value">${totalLive}</div>
    <div class="kpi-sub">${totalProducts - totalLive} drafts</div>
  </div>
  <div class="card">
    <div class="kpi-label">Daemons</div>
    <div class="kpi-value">${healthy}/${beats.length}</div>
    <div class="kpi-sub">${stale} stale</div>
  </div>
  <div class="card">
    <div class="kpi-label">Skill Drafts</div>
    <div class="kpi-value">${drafts}</div>
    <div class="kpi-sub">awaiting approval</div>
  </div>
  <div class="card">
    <div class="kpi-label">Expansion Queue</div>
    <div class="kpi-value">${queue.skills + queue.businesses}</div>
    <div class="kpi-sub">${queue.skills} skill / ${queue.businesses} biz</div>
  </div>
</div>

<div class="section">
  <h2>Tenants</h2>
  ${tenantCards.length === 0 ? '<div class="muted">No tenants yet. Run business-bootstrap.</div>' :
    `<div class="row cards">${tenantCards.map((c) => `
      <div class="card tenant-card">
        <h2>${esc(c.name)}</h2>
        <div class="meta">${esc(c.slug)} · ${esc(c.type)} · ${esc(c.stage)}</div>
        <div class="stats">
          <div class="stat-label">Revenue</div><div class="stat-value">$${(c.revenue_cents / 100).toFixed(2)}</div>
          <div class="stat-label">Orders</div><div class="stat-value">${c.orders}</div>
          <div class="stat-label">Today's drafts</div><div class="stat-value">${c.todays_drafts}</div>
          <div class="stat-label">CS waiting</div><div class="stat-value">${c.cs_drafts}</div>
        </div>
      </div>`).join("")}
    </div>`}
</div>

<div class="section">
  <h2>Daemon Health</h2>
  <table>
    <thead><tr><th>Name</th><th>Status</th><th>Last Beat</th></tr></thead>
    <tbody>
    ${beats.map((b) => `<tr>
      <td>${esc(b.name)}</td>
      <td><span class="pill ${b.status}">${b.status}</span></td>
      <td class="muted">${isFinite(b.age_min) ? b.age_min + "m ago" : "—"}</td>
    </tr>`).join("")}
    </tbody>
  </table>
</div>

<div class="section">
  <h2>Recent Agent Activity</h2>
  ${audit.length === 0 ? '<div class="muted">No activity yet.</div>' :
    `<table>
      <thead><tr><th>When</th><th>Tenant</th><th>Actor</th><th>Action</th></tr></thead>
      <tbody>
      ${audit.map((a) => `<tr>
        <td class="muted">${esc(rel(a.ts))}</td>
        <td>${esc(a.tenant || "—")}</td>
        <td>${esc(a.actor || "—")}</td>
        <td>${esc(a.action || "—")}</td>
      </tr>`).join("")}
      </tbody>
    </table>`}
</div>

<footer>Generated ${esc(new Date().toISOString())}</footer>
</body></html>`;
}

async function main() {
  const html = await buildHtml();
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, html);
  console.log(`✓ ${OUT}`);
  console.log(`Open: open ${OUT}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
