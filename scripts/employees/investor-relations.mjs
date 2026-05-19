#!/usr/bin/env node
/**
 * investor-relations.mjs
 *
 * Day14's VP of Investor Relations. Runs first Monday of each month + on-demand.
 *
 *   Generates a one-page investor-style update covering all tenants:
 *   - Headline metrics
 *   - Wins (specific revenue moments, milestones hit)
 *   - Asks (what Jack needs help with — even if no investors exist yet,
 *     this forces clarity)
 *   - Risks
 *   - Next quarter focus
 *
 *   Even for solo founder, the discipline of writing this forces clarity.
 *   Saves all monthly reports — over time, you have a real investor narrative.
 *
 * Output: ~/Documents/businesses/_shared/investor-updates/<YYYY-MM>.md
 * Telegram: full report inline (max 4000 chars) + link to file
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const UPDATES = path.join(SHARED, "investor-updates");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");
const GEMINI_MODEL = "gemini-2.5-flash";

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
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 4000 } }) });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function tenantOrders(slug) {
  const f = path.join(BIZ, slug, "orders-watcher-state.json");
  if (!existsSync(f)) return { total_revenue_cents: 0, total_orders: 0 };
  return JSON.parse(await fs.readFile(f, "utf8"));
}

async function loadLastMonth() {
  if (!existsSync(UPDATES)) return null;
  const files = (await fs.readdir(UPDATES)).filter((f) => f.endsWith(".md")).sort().reverse();
  if (!files.length) return null;
  return { name: files[0], content: await fs.readFile(path.join(UPDATES, files[0]), "utf8") };
}

async function main() {
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
  if (!existsSync(TENANTS_FILE)) return;
  await fs.mkdir(UPDATES, { recursive: true });

  const tenants = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];
  const today = new Date();
  const yyyymm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const reportPath = path.join(UPDATES, `${yyyymm}.md`);

  // Gather metrics
  let totalRevenue = 0, totalOrders = 0;
  const tenantStats = [];
  for (const t of tenants) {
    const orders = await tenantOrders(t.slug);
    totalRevenue += orders.total_revenue_cents || 0;
    totalOrders += orders.total_orders || 0;
    tenantStats.push({ slug: t.slug, name: t.display_name, type: t.type, stage: t.stage, revenue: orders.total_revenue_cents || 0, orders: orders.total_orders || 0 });
  }

  const lastMonth = await loadLastMonth();
  const lastMonthMetricsMatch = lastMonth?.content.match(/total_revenue_cents:\s*(\d+)/);
  const lastRev = lastMonthMetricsMatch ? parseInt(lastMonthMetricsMatch[1], 10) : 0;
  const momGrowth = lastRev > 0 ? ((totalRevenue - lastRev) / lastRev) * 100 : null;

  const prompt = `You are Jack's VP of Investor Relations writing the ${today.toLocaleString("en-US", { month: "long", year: "numeric" })} investor update for Day14.

Day14 is Jack's solo holding company running multiple businesses on autopilot via the Day14 OS automation stack.

THIS MONTH:
- Total revenue: $${(totalRevenue/100).toFixed(2)}
- Total orders: ${totalOrders}
- Tenants: ${tenants.length}
${momGrowth !== null ? `- MoM growth: ${momGrowth.toFixed(1)}%` : "- (first month — no prior comparison)"}

PER-TENANT:
${tenantStats.map((s) => `- ${s.name} (${s.type}, ${s.stage}): $${(s.revenue/100).toFixed(2)} · ${s.orders} orders`).join("\n")}

${lastMonth ? `LAST MONTH'S UPDATE (for context — don't repeat):\n${lastMonth.content.slice(0, 3000)}` : ""}

Write a tight monthly investor update in markdown. Sections:

## TL;DR
2-3 sentences. Net new this month.

## Headline metrics
Bulleted. Numbers + MoM if available.

## Wins
3-5 specific moments. NOT "made progress on X" — name actual things shipped, first customers, milestones hit.

## What broke / what we killed
Be honest. 2-3 things.

## Asks
3 specific things Jack would want help with (even if no current investors — this is for future advisors / future Jack reading back).

## Next month focus
3 specific bets.

## Tenant status
One paragraph per tenant: where it stands, next move.

Voice: direct, founder voice, no marketing speak, no "exciting news!", no "we're thrilled". Numbers + clarity.`;

  const body = await callGemini(prompt, env);
  const frontmatter = `---
month: ${yyyymm}
generated_at: ${new Date().toISOString()}
total_revenue_cents: ${totalRevenue}
total_orders: ${totalOrders}
tenants_count: ${tenants.length}
mom_growth_pct: ${momGrowth !== null ? momGrowth.toFixed(1) : "null"}
---

`;
  await fs.writeFile(reportPath, frontmatter + body);

  if (env.TELEGRAM_CHAT_ID) {
    await fs.mkdir(OUTBOX, { recursive: true });
    const tldr = body.match(/## TL;DR\s*\n+([\s\S]+?)(?=\n## |$)/)?.[1]?.trim() || body.slice(0, 600);
    await fs.writeFile(
      path.join(OUTBOX, `${Date.now()}-investor-relations.json`),
      JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `📈 *Monthly Investor Update — ${yyyymm}*\n\n*$${(totalRevenue/100).toFixed(2)} · ${totalOrders} orders · ${tenants.length} tenants${momGrowth !== null ? ` · ${momGrowth.toFixed(1)}% MoM` : ""}*\n\n${tldr.slice(0, 2000)}\n\nFull: \`${reportPath}\``,
        parse_mode: "Markdown", urgency: "P2",
        queued_at: new Date().toISOString(), sent_at: null,
      }, null, 2)
    );
  }
  console.log(`✓ monthly update → ${reportPath}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
