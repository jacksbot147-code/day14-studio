#!/usr/bin/env node
/**
 * cfo-agent.mjs
 *
 * Day14's Chief Financial Officer. Runs daily 8am + Sunday 6pm.
 *
 *   Daily report:
 *     - Per-tenant P&L estimate (revenue from orders-watcher - estimated COGS)
 *     - Cash position (from Stripe balance if wired, otherwise: Printify owed + projected)
 *     - Burn rate (paid API calls, hosting, ads)
 *     - Runway estimate
 *     - Concerning metrics flagged
 *
 *   Weekly report (Sunday):
 *     - Full P&L by tenant
 *     - WoW revenue + order growth
 *     - Margin analysis
 *     - Pricing recommendations
 *     - Investor-style 1-page summary
 *
 * Output: ~/Documents/businesses/_shared/finance/<date>.md
 * Telegram: digest pinged in chat
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const FINANCE = path.join(SHARED, "finance");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");
const GEMINI_MODEL = "gemini-2.5-flash";

// Rough COGS assumptions per archetype (cents)
const COGS_BY_ARCHETYPE = {
  "pod-store":        { per_order_cents: 800, fixed_monthly_cents: 0 },
  "newsletter":       { per_order_cents: 50, fixed_monthly_cents: 2900 },  // ESP cost
  "info-product":     { per_order_cents: 100, fixed_monthly_cents: 0 },
  "course":           { per_order_cents: 500, fixed_monthly_cents: 5900 }, // platform fee
  "saas":             { per_order_cents: 200, fixed_monthly_cents: 0 },
  "agency":           { per_order_cents: 50000, fixed_monthly_cents: 0 },
  "consulting":       { per_order_cents: 5000, fixed_monthly_cents: 0 },
  "physical-product": { per_order_cents: 1500, fixed_monthly_cents: 0 },
  "affiliate-site":   { per_order_cents: 0, fixed_monthly_cents: 0 },
};

// Empire-wide fixed costs (cents/month)
const EMPIRE_FIXED_MONTHLY = {
  vercel: 0,           // hobby tier
  supabase: 0,         // free tier
  printify: 0,         // pay-per-product
  gemini_api: 0,       // free tier (assumption — paid would change)
  domain: 100,         // ~$12/year
  misc: 500,
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

async function callGemini(prompt, env) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 3000 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function tenantOrdersState(slug) {
  const f = path.join(BIZ, slug, "orders-watcher-state.json");
  if (!existsSync(f)) return { total_revenue_cents: 0, total_orders: 0 };
  return JSON.parse(await fs.readFile(f, "utf8"));
}

async function buildPnL() {
  if (!existsSync(TENANTS_FILE)) return [];
  const tenants = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];
  const rows = [];
  for (const t of tenants) {
    const orders = await tenantOrdersState(t.slug);
    const cogs = COGS_BY_ARCHETYPE[t.type] || COGS_BY_ARCHETYPE["pod-store"];
    const revenueCents = orders.total_revenue_cents || 0;
    const variableCogs = (orders.total_orders || 0) * cogs.per_order_cents;
    const fixedCogs = cogs.fixed_monthly_cents;
    const totalCogs = variableCogs + fixedCogs;
    const gross = revenueCents - totalCogs;
    const margin = revenueCents > 0 ? (gross / revenueCents) * 100 : 0;
    rows.push({
      slug: t.slug,
      name: t.display_name,
      archetype: t.type,
      stage: t.stage,
      revenue_cents: revenueCents,
      orders: orders.total_orders || 0,
      cogs_cents: totalCogs,
      gross_profit_cents: gross,
      margin_pct: margin,
    });
  }
  return rows;
}

async function main() {
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
  await fs.mkdir(FINANCE, { recursive: true });

  const isSunday = new Date().getDay() === 0;
  const reportType = isSunday ? "weekly" : "daily";
  const pnl = await buildPnL();

  const totalRevenue = pnl.reduce((s, r) => s + r.revenue_cents, 0);
  const totalOrders = pnl.reduce((s, r) => s + r.orders, 0);
  const totalCogs = pnl.reduce((s, r) => s + r.cogs_cents, 0);
  const empireFixed = Object.values(EMPIRE_FIXED_MONTHLY).reduce((s, v) => s + v, 0);
  const netProfit = totalRevenue - totalCogs - empireFixed;
  const blendedMargin = totalRevenue > 0 ? ((totalRevenue - totalCogs) / totalRevenue) * 100 : 0;

  // CFO analysis via Gemini
  const cfoPrompt = `You are Day14's CFO. Generate a ${reportType} financial report. Be direct, no fluff. Numbers only. Suggest specific actions.

EMPIRE P&L (${reportType}, all $ amounts in dollars):
${pnl.map((r) => `${r.name} (${r.archetype}, ${r.stage}): rev $${(r.revenue_cents/100).toFixed(2)} · orders ${r.orders} · COGS $${(r.cogs_cents/100).toFixed(2)} · gross $${(r.gross_profit_cents/100).toFixed(2)} · margin ${r.margin_pct.toFixed(0)}%`).join("\n")}

Totals: rev $${(totalRevenue/100).toFixed(2)} · orders ${totalOrders} · COGS $${(totalCogs/100).toFixed(2)} · empire fixed $${(empireFixed/100).toFixed(2)}/mo · net $${(netProfit/100).toFixed(2)}

Write a tight markdown report with these sections:
## TL;DR (3 bullets)
## Empire summary (key numbers)
## Per-tenant breakdown
## Concerns flagged
## Specific actions (3-5 concrete next moves with dollar impact)
${isSunday ? "\n## Investor-style 1-paragraph summary (for Jack to send to advisors)\n## Pricing recommendations per tenant" : ""}

Jack's voice: direct, intelligent, no exclamation points, no "let's dive in", no "buckle up". Numbers + action.`;

  const report = await callGemini(cfoPrompt, env);
  const date = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(FINANCE, `${date}-${reportType}.md`);
  const frontmatter = `---
date: ${date}
type: ${reportType}
total_revenue_cents: ${totalRevenue}
total_orders: ${totalOrders}
total_cogs_cents: ${totalCogs}
net_profit_cents: ${netProfit}
blended_margin_pct: ${blendedMargin.toFixed(1)}
---

`;
  await fs.writeFile(reportPath, frontmatter + report);

  // Telegram digest
  if (env.TELEGRAM_CHAT_ID) {
    await fs.mkdir(OUTBOX, { recursive: true });
    const text = [
      `💼 *CFO ${reportType} report*`,
      ``,
      `Revenue: *$${(totalRevenue/100).toFixed(2)}* · ${totalOrders} orders`,
      `COGS: $${(totalCogs/100).toFixed(2)} · Margin: ${blendedMargin.toFixed(0)}%`,
      `Net: *$${(netProfit/100).toFixed(2)}*${netProfit < 0 ? " (loss)" : ""}`,
      ``,
      report.split("\n").slice(0, 20).join("\n").slice(0, 2000),
      ``,
      `Full: \`${reportPath}\``,
    ].join("\n");
    await fs.writeFile(
      path.join(OUTBOX, `${Date.now()}-cfo-${reportType}.json`),
      JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: "Markdown",
        urgency: isSunday ? "P2" : "P3",
        queued_at: new Date().toISOString(), sent_at: null,
      }, null, 2)
    );
  }
  console.log(`✓ ${reportType} report → ${reportPath}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
