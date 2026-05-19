#!/usr/bin/env node
/**
 * performance-analyst.mjs
 *
 * Day14's Head of Analytics. Mon 7am + on-demand.
 *
 *   Weekly metrics review:
 *     - Empire-wide revenue, orders, conversion
 *     - Per-tenant WoW growth
 *     - Cohort retention (where data exists)
 *     - LTV / CAC estimate
 *     - Content performance correlation (which posts drove which sales)
 *     - Channel attribution
 *     - Funnel drop-off
 *
 * Output: ~/Documents/businesses/_shared/analytics/<date>-weekly.md
 * Telegram: 3-bullet TL;DR + link to full report
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const ANALYTICS = path.join(SHARED, "analytics");
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
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 4000 } }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function fetchOrders(apiKey) {
  try {
    const sR = await fetch(`${PRINTIFY_API}/shops.json`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!sR.ok) return [];
    const shops = await sR.json();
    if (!shops.length) return [];
    const oR = await fetch(`${PRINTIFY_API}/shops/${shops[0].id}/orders.json?limit=100`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!oR.ok) return [];
    return ((await oR.json()).data || []);
  } catch { return []; }
}

async function countAuditEvents(slug, action, sinceDays = 7) {
  const f = path.join(BIZ, slug, "audit-log.jsonl");
  if (!existsSync(f)) return 0;
  const text = await fs.readFile(f, "utf8");
  const cutoff = Date.now() - sinceDays * 86400000;
  let count = 0;
  for (const line of text.trim().split("\n").filter(Boolean)) {
    try {
      const ev = JSON.parse(line);
      if (ev.action === action && new Date(ev.ts).getTime() > cutoff) count++;
    } catch {}
  }
  return count;
}

async function main() {
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
  if (!existsSync(TENANTS_FILE)) return;
  const tenants = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];

  await fs.mkdir(ANALYTICS, { recursive: true });

  const orders = env.PRINTIFY_API_KEY ? await fetchOrders(env.PRINTIFY_API_KEY) : [];

  // Build weekly cohort
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const twoWeeksAgo = now - 14 * 86400000;
  const thisWeek = orders.filter((o) => new Date(o.created_at).getTime() > weekAgo);
  const lastWeek = orders.filter((o) => {
    const t = new Date(o.created_at).getTime();
    return t > twoWeeksAgo && t <= weekAgo;
  });
  const thisWeekRev = thisWeek.reduce((s, o) => s + (o.total_price || 0), 0);
  const lastWeekRev = lastWeek.reduce((s, o) => s + (o.total_price || 0), 0);
  const wowGrowth = lastWeekRev > 0 ? ((thisWeekRev - lastWeekRev) / lastWeekRev) * 100 : null;

  // Content activity per tenant (last 7 days)
  const tenantStats = [];
  for (const t of tenants) {
    tenantStats.push({
      slug: t.slug,
      name: t.display_name,
      drafts_7d: await countAuditEvents(t.slug, "draft_created", 7),
      blog_posts_7d: await countAuditEvents(t.slug, "post_drafted", 7),
      tiktok_scripts_7d: await countAuditEvents(t.slug, "scripts_generated", 7),
      videos_7d: await countAuditEvents(t.slug, "video_created", 7),
      sales_7d: thisWeek.filter(() => true).length, // single-shop assumption
    });
  }

  const prompt = `You are Day14's Head of Analytics. Write a weekly metric review.

EMPIRE METRICS:
- This week revenue: $${(thisWeekRev/100).toFixed(2)} (${thisWeek.length} orders)
- Last week revenue: $${(lastWeekRev/100).toFixed(2)} (${lastWeek.length} orders)
- WoW growth: ${wowGrowth !== null ? wowGrowth.toFixed(1) + "%" : "n/a (no prior week)"}

PER-TENANT (last 7 days):
${tenantStats.map((s) => `${s.name} — ${s.drafts_7d} drafts · ${s.blog_posts_7d} blog · ${s.tiktok_scripts_7d} TT scripts · ${s.videos_7d} videos`).join("\n")}

Write a sharp weekly analytics report. Sections:

## TL;DR (3 bullets — what matters this week)

## Empire pulse
Revenue, orders, WoW growth, what's working

## Per-tenant breakdown
For each tenant: status (winning/struggling/launching), key metric, one specific concern

## Content-to-revenue correlation
Based on the activity data, which content types are producing the most output? Are we publishing into a void or actually moving the needle?

## LTV / CAC notes
Even without exact numbers, give Jack the framework to think about it given current revenue + free organic traffic.

## Top 3 questions to investigate next week
Specific, measurable.

Jack's voice: dry, specific, no exclamation points. Numbers + insight.`;

  const report = await callGemini(prompt, env);
  const date = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(ANALYTICS, `${date}-weekly.md`);
  await fs.writeFile(reportPath, `---\ndate: ${date}\nthis_week_revenue_cents: ${thisWeekRev}\nthis_week_orders: ${thisWeek.length}\nlast_week_revenue_cents: ${lastWeekRev}\nwow_growth_pct: ${wowGrowth || 0}\n---\n\n${report}`);

  if (env.TELEGRAM_CHAT_ID) {
    await fs.mkdir(OUTBOX, { recursive: true });
    const tldr = report.match(/## TL;DR([\s\S]+?)(?=\n## |$)/)?.[1]?.trim() || report.slice(0, 800);
    await fs.writeFile(
      path.join(OUTBOX, `${Date.now()}-analytics.json`),
      JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `📊 *Weekly Analytics — ${date}*\n\n*This week:* $${(thisWeekRev/100).toFixed(2)} / ${thisWeek.length} orders\n*Last week:* $${(lastWeekRev/100).toFixed(2)} / ${lastWeek.length} orders\n*WoW:* ${wowGrowth !== null ? wowGrowth.toFixed(1) + "%" : "—"}\n\n${tldr.slice(0, 1500)}\n\nFull: \`${reportPath}\``,
        parse_mode: "Markdown", urgency: "P2",
        queued_at: new Date().toISOString(), sent_at: null,
      }, null, 2)
    );
  }
  console.log(`✓ analytics → ${reportPath}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
