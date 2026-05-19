#!/usr/bin/env node
/**
 * hot-flash-co-dashboard.mjs
 *
 * Generates an HTML dashboard for Hot Flash Co showing:
 *   - Lifetime revenue + order count (from orders-watcher state)
 *   - Active product count
 *   - Today's new drafts
 *   - Top 3 products by views (when we have that data)
 *   - Retire candidates (0 sales in 60d)
 *   - Recent activity (last 20 audit events)
 *
 * Output: ~/Documents/businesses/hot-flash-co/dashboard.html (open with browser)
 *
 * Run on-demand or daily via LaunchAgent.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const TENANT = "hot-flash-co";
const TENANT_DIR = path.join(HOME, "Documents/businesses", TENANT);
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");
const ORDERS_STATE = path.join(TENANT_DIR, "orders-watcher-state.json");
const AUDIT_LOG = path.join(TENANT_DIR, "audit-log.jsonl");
const OUT = path.join(TENANT_DIR, "dashboard.html");

const PRINTIFY_API = "https://api.printify.com/v1";

async function loadEnv() {
  const text = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function loadOrdersState() {
  if (!existsSync(ORDERS_STATE)) return { total_revenue_cents: 0, total_orders: 0, known_order_ids: [] };
  return JSON.parse(await fs.readFile(ORDERS_STATE, "utf8"));
}

async function loadRecentAudit(n = 20) {
  if (!existsSync(AUDIT_LOG)) return [];
  const text = await fs.readFile(AUDIT_LOG, "utf8");
  const lines = text.trim().split("\n").filter(Boolean);
  return lines
    .slice(-n)
    .reverse()
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function fetchProducts(printifyKey) {
  const shopsRes = await fetch(`${PRINTIFY_API}/shops.json`, {
    headers: { Authorization: `Bearer ${printifyKey}` },
  });
  if (!shopsRes.ok) return { products: [], shopId: null };
  const shops = await shopsRes.json();
  if (!shops.length) return { products: [], shopId: null };
  const shopId = shops[0].id;

  const all = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`${PRINTIFY_API}/shops/${shopId}/products.json?limit=50&page=${page}`, {
      headers: { Authorization: `Bearer ${printifyKey}` },
    });
    if (!res.ok) break;
    const data = await res.json();
    all.push(...(data.data || []));
    if ((data.data || []).length < 50) break;
  }
  return { products: all, shopId };
}

function relTime(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml({ ordersState, products, audit, generatedAt }) {
  const revenueDollars = (ordersState.total_revenue_cents / 100).toFixed(2);
  const visibleProducts = products.filter((p) => p.visible !== false);
  const drafts = products.filter((p) => p.visible === false);
  const todayIso = new Date().toISOString().slice(0, 10);
  const todaysDrafts = audit.filter(
    (a) => a.action === "draft_created" && a.ts?.startsWith(todayIso)
  );

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Hot Flash Co — Live Dashboard</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font: 15px/1.5 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif; background: #FAF8F4; color: #2F2A33; padding: 32px; max-width: 1100px; margin: 0 auto; }
  h1 { font-size: 28px; letter-spacing: -0.02em; margin-bottom: 4px; }
  .sub { color: #7A6F8F; font-size: 13px; margin-bottom: 32px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .kpi { background: white; border: 1px solid #E5DDD0; border-radius: 12px; padding: 20px; }
  .kpi-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #7A6F8F; margin-bottom: 8px; }
  .kpi-value { font-size: 28px; font-weight: 600; letter-spacing: -0.02em; }
  .kpi-sub { font-size: 12px; color: #888; margin-top: 4px; }
  .section { background: white; border: 1px solid #E5DDD0; border-radius: 12px; padding: 24px; margin-bottom: 16px; }
  .section h2 { font-size: 18px; margin-bottom: 16px; letter-spacing: -0.01em; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 10px 12px; text-align: left; border-bottom: 1px solid #F0EAE0; font-size: 14px; }
  th { color: #7A6F8F; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  tr:last-child td { border-bottom: none; }
  a { color: #7A6F8F; }
  .pill { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 100px; background: #F0EAE0; color: #2F2A33; text-transform: uppercase; letter-spacing: 0.04em; }
  .pill.draft { background: #FFE9DD; color: #B85B26; }
  .pill.live { background: #DCEFDE; color: #2A6F35; }
  .muted { color: #999; font-size: 12px; }
  footer { text-align: center; color: #999; font-size: 12px; margin-top: 32px; }
</style>
</head>
<body>
<h1>Hot Flash Co</h1>
<div class="sub">Real goods for the seasons no one warns you about. Live dashboard, refreshed ${escapeHtml(relTime(generatedAt))}.</div>

<div class="grid">
  <div class="kpi">
    <div class="kpi-label">Lifetime Revenue</div>
    <div class="kpi-value">$${escapeHtml(revenueDollars)}</div>
    <div class="kpi-sub">${ordersState.total_orders} orders</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Live Products</div>
    <div class="kpi-value">${visibleProducts.length}</div>
    <div class="kpi-sub">${drafts.length} drafts pending publish</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Today's Drafts</div>
    <div class="kpi-value">${todaysDrafts.length}</div>
    <div class="kpi-sub">via daily-engine</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Audit Events (last 24h)</div>
    <div class="kpi-value">${audit.filter((a) => Date.now() - new Date(a.ts).getTime() < 86_400_000).length}</div>
    <div class="kpi-sub">agent activity</div>
  </div>
</div>

<div class="section">
  <h2>Products</h2>
  ${products.length === 0
    ? '<div class="muted">No products yet. Run scripts/launch-hot-flash-co.mjs to seed.</div>'
    : `<table>
      <thead><tr><th>Title</th><th>Status</th><th>Price</th><th>Created</th></tr></thead>
      <tbody>
      ${products
        .slice(0, 25)
        .map((p) => {
          const minPrice = Math.min(...(p.variants || []).filter((v) => v.is_enabled).map((v) => v.price));
          const status = p.visible === false ? '<span class="pill draft">draft</span>' : '<span class="pill live">live</span>';
          const created = p.created_at ? relTime(p.created_at) : "—";
          const price = isFinite(minPrice) ? `$${(minPrice / 100).toFixed(2)}` : "—";
          return `<tr>
            <td><a href="https://printify.com/app/editor/${escapeHtml(p.id)}" target="_blank">${escapeHtml(p.title?.slice(0, 80) || "(untitled)")}</a></td>
            <td>${status}</td>
            <td>${price}</td>
            <td class="muted">${escapeHtml(created)}</td>
          </tr>`;
        })
        .join("")}
      </tbody>
    </table>`}
</div>

<div class="section">
  <h2>Recent agent activity</h2>
  ${audit.length === 0
    ? '<div class="muted">No agent activity logged yet.</div>'
    : `<table>
      <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Details</th></tr></thead>
      <tbody>
      ${audit
        .slice(0, 20)
        .map(
          (a) => `<tr>
        <td class="muted">${escapeHtml(relTime(a.ts))}</td>
        <td>${escapeHtml(a.actor || "—")}</td>
        <td>${escapeHtml(a.action || "—")}</td>
        <td class="muted">${escapeHtml(
          JSON.stringify(a).replace(/^{|}$/g, "").slice(0, 100)
        )}</td>
      </tr>`
        )
        .join("")}
      </tbody>
    </table>`}
</div>

<footer>Generated ${escapeHtml(generatedAt)} · refresh via <code>node scripts/hot-flash-co-dashboard.mjs</code></footer>
</body>
</html>`;
}

async function main() {
  const env = await loadEnv();
  const ordersState = await loadOrdersState();
  const audit = await loadRecentAudit(50);
  let products = [];
  if (env.PRINTIFY_API_KEY) {
    try {
      const { products: ps } = await fetchProducts(env.PRINTIFY_API_KEY);
      products = ps;
    } catch (e) {
      console.warn("could not fetch products:", e.message);
    }
  }
  const html = buildHtml({ ordersState, products, audit, generatedAt: new Date().toISOString() });
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, html);
  console.log(`✓ ${OUT}`);
  console.log(`Open: open ${OUT}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
