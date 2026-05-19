#!/usr/bin/env node
/**
 * product-strategist.mjs
 *
 * Day14's Head of Product. Daily 4pm.
 *
 *   - Per tenant: pulls all Printify products + sales data
 *   - Identifies winners (sales velocity > avg)
 *   - Identifies losers (zero sales in 30+ days)
 *   - Recommends: variants to expand on winners, products to retire, gap to fill
 *   - Cross-pollinates: when one tenant has a winning concept, suggests applying to another
 *
 * Output: ~/Documents/businesses/<tenant>/product-strategy.md (overwritten)
 * Telegram: top 3 recommendations
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");
const GEMINI_MODEL = "gemini-2.5-flash";
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

async function callGemini(prompt, env) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 3000 } }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function fetchAllProducts(apiKey) {
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

async function fetchOrders(apiKey) {
  try {
    const sR = await fetch(`${PRINTIFY_API}/shops.json`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!sR.ok) return [];
    const shops = await sR.json();
    if (!shops.length) return [];
    const oR = await fetch(`${PRINTIFY_API}/shops/${shops[0].id}/orders.json?limit=50`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!oR.ok) return [];
    return ((await oR.json()).data || []);
  } catch { return []; }
}

async function main() {
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
  if (!existsSync(TENANTS_FILE)) return;

  const tenants = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];
  const podTenants = tenants.filter((t) => t.type === "pod-store" || t.type === "physical-product");
  const products = env.PRINTIFY_API_KEY ? await fetchAllProducts(env.PRINTIFY_API_KEY) : [];
  const orders = env.PRINTIFY_API_KEY ? await fetchOrders(env.PRINTIFY_API_KEY) : [];

  // Build sales-per-product map
  const salesByProduct = {};
  for (const o of orders) {
    for (const li of (o.line_items || [])) {
      const id = li.product_id;
      if (!id) continue;
      if (!salesByProduct[id]) salesByProduct[id] = { units: 0, revenue_cents: 0 };
      salesByProduct[id].units += li.quantity || 1;
      salesByProduct[id].revenue_cents += li.cost || 0;
    }
  }

  // Winners + losers
  const productsWithSales = products.map((p) => ({
    id: p.id,
    title: p.title,
    visible: p.visible !== false,
    created_at: p.created_at,
    units: salesByProduct[p.id]?.units || 0,
    revenue_cents: salesByProduct[p.id]?.revenue_cents || 0,
    ageDays: p.created_at ? (Date.now() - new Date(p.created_at).getTime()) / 86400000 : 0,
  }));
  productsWithSales.sort((a, b) => b.units - a.units);

  const winners = productsWithSales.filter((p) => p.units > 0).slice(0, 5);
  const oldNoSales = productsWithSales.filter((p) => p.visible && p.units === 0 && p.ageDays > 30);

  // Gemini strategist
  const ctxLines = [
    `WINNERS (top 5 by units sold):`,
    ...winners.map((w) => `  • "${w.title}" — ${w.units} units, $${(w.revenue_cents/100).toFixed(2)}`),
    ``,
    `STALLED (>30 days, 0 sales — retire candidates):`,
    ...oldNoSales.slice(0, 10).map((p) => `  • "${p.title}" — ${Math.round(p.ageDays)}d old`),
    ``,
    `Total products: ${products.length} · with sales: ${productsWithSales.filter((p) => p.units > 0).length}`,
  ];

  const prompt = `You are Day14's Head of Product. Review the empire's product portfolio and produce strategic recommendations.

PORTFOLIO:
${ctxLines.join("\n")}

For each ACTIVE tenant: ${podTenants.map((t) => `${t.slug} (${t.display_name})`).join(", ")}

Write a focused product strategy report:

## Winners — double down
For each winner, suggest 3 specific variant/expansion products (different quote, different mug style, same theme).

## Kill list
Specific products to retire from each tenant with reasoning.

## Gap analysis
What product categories/angles are missing that the data suggests we need?

## Cross-pollination
If a winning concept in one tenant could work in another tenant's niche (with adjusted voice), name it.

## Top 3 recommended actions
Concrete next moves with expected revenue impact.

Be direct. No fluff. Match Jack's voice — dry, specific.`;

  const report = await callGemini(prompt, env);
  const reportPath = path.join(SHARED, "product-strategy.md");
  const frontmatter = `---
generated_at: ${new Date().toISOString()}
total_products: ${products.length}
products_with_sales: ${productsWithSales.filter((p) => p.units > 0).length}
total_units_sold: ${productsWithSales.reduce((s, p) => s + p.units, 0)}
---

`;
  await fs.writeFile(reportPath, frontmatter + report);

  if (env.TELEGRAM_CHAT_ID) {
    await fs.mkdir(OUTBOX, { recursive: true });
    const top3 = report.match(/## Top 3 recommended actions([\s\S]+?)(?=\n## |$)/)?.[1]?.trim() || report.slice(0, 1500);
    const text = [
      `📦 *Head of Product daily*`,
      ``,
      `Winners: ${winners.length} · Stalled: ${oldNoSales.length}`,
      ``,
      `*Top 3 actions:*`,
      top3.slice(0, 1500),
      ``,
      `Full: \`${reportPath}\``,
    ].join("\n");
    await fs.writeFile(
      path.join(OUTBOX, `${Date.now()}-product-strategist.json`),
      JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: "Markdown",
        urgency: "P3", queued_at: new Date().toISOString(), sent_at: null,
      }, null, 2)
    );
  }
  console.log(`✓ product strategy → ${reportPath}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
