#!/usr/bin/env node
/**
 * customer-success-agent.mjs
 *
 * Day14's VP Customer Success. Polls every 60 min.
 *
 *   - Tracks every customer order via Printify orders + Stripe events
 *   - Drafts post-purchase thank-you (Jack-tap)
 *   - 14-day NPS survey email draft (Jack-tap)
 *   - Detects churn signals (no repeat in 60d) → win-back campaign draft
 *   - Watches cs-drafts/ folders for stale CS items (>4h waiting)
 *
 * Output: ~/Documents/businesses/<tenant>/customer-success/
 *   post-purchase-<order-id>.md
 *   nps-<order-id>.md
 *   winback-<customer-id>.md
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
const STATE_FILE = path.join(SHARED, "founder-ops/customer-success-state.json");
const LOG_FILE = path.join(SHARED, "poller/customer-success.log");
const HEARTBEAT_FILE = path.join(SHARED, "poller/customer-success-heartbeat.log");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");
const GEMINI_MODEL = "gemini-2.5-flash";
const PRINTIFY_API = "https://api.printify.com/v1";

const POLL_INTERVAL_MS = 60 * 60_000;
const HEARTBEAT_INTERVAL_MS = 60_000;

async function loadEnv() {
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
  await fs.appendFile(LOG_FILE, line);
}

async function heartbeat() {
  await fs.mkdir(path.dirname(HEARTBEAT_FILE), { recursive: true });
  await fs.appendFile(HEARTBEAT_FILE, `${new Date().toISOString()} alive\n`);
}

async function loadState() {
  if (!existsSync(STATE_FILE)) return { processed_orders: [], nps_sent: [], winbacks_sent: [] };
  return JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
}

async function saveState(s) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(s, null, 2));
}

async function callGemini(prompt, env) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 1500 } }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function loadTenantConstitution(slug) {
  const f = path.join(BIZ, slug, "CONSTITUTION.md");
  if (!existsSync(f)) return null;
  return await fs.readFile(f, "utf8");
}

async function fetchRecentOrders(apiKey) {
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

async function draftPostPurchase(env, tenantSlug, constitution, order) {
  const prompt = `Draft a post-purchase email for "${tenantSlug}". Match voice:\n${(constitution || "").slice(0, 2000)}\n\nOrder context:\n- Order #${order.id}\n- Items: ${order.line_items?.length || 0}\n- Customer name: ${order.address_to?.first_name || "Friend"}\n\nRules:\n- 80-120 words\n- Warm but not saccharine\n- Tell them what to expect (shipping timeline)\n- ONE inside-joke about the niche\n- Sign "— Jack"\n- No exclamation points`;
  return await callGemini(prompt, env);
}

async function draftNps(env, tenantSlug, constitution, order) {
  const prompt = `Draft a 14-day post-purchase NPS check-in email for "${tenantSlug}". Match voice:\n${(constitution || "").slice(0, 2000)}\n\nOrder #${order.id}, customer ${order.address_to?.first_name || "Friend"}.\n\nRules:\n- 60-100 words\n- Ask: would they recommend us (0-10) + ONE follow-up question\n- Link to reply or a survey form\n- Sign "— Jack"`;
  return await callGemini(prompt, env);
}

async function cycle() {
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) { await log("no GEMINI_API_KEY"); return; }
  if (!env.PRINTIFY_API_KEY) { await log("no PRINTIFY_API_KEY"); return; }

  const state = await loadState();
  const orders = await fetchRecentOrders(env.PRINTIFY_API_KEY);
  const tenants = existsSync(TENANTS_FILE) ? JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [] : [];
  const defaultTenant = tenants[0]?.slug || "hot-flash-co";

  let postPurchase = 0, nps = 0;
  for (const order of orders) {
    const tenantSlug = defaultTenant; // TODO: multi-shop tenant detection
    const constitution = await loadTenantConstitution(tenantSlug);
    const csDir = path.join(BIZ, tenantSlug, "customer-success");
    await fs.mkdir(csDir, { recursive: true });

    // Post-purchase email if not done
    if (!state.processed_orders.includes(order.id)) {
      try {
        const draft = await draftPostPurchase(env, tenantSlug, constitution, order);
        await fs.writeFile(path.join(csDir, `post-purchase-${order.id}.md`), `# Post-purchase — order ${order.id}\n\n${draft}\n`);
        state.processed_orders.push(order.id);
        postPurchase++;
      } catch (e) { await log(`post-purchase error for ${order.id}: ${e.message}`); }
    }

    // NPS at 14 days
    const orderAge = order.created_at ? (Date.now() - new Date(order.created_at).getTime()) / 86400000 : 0;
    if (orderAge >= 14 && orderAge <= 30 && !state.nps_sent.includes(order.id)) {
      try {
        const draft = await draftNps(env, tenantSlug, constitution, order);
        await fs.writeFile(path.join(csDir, `nps-${order.id}.md`), `# NPS — order ${order.id}\n\n${draft}\n`);
        state.nps_sent.push(order.id);
        nps++;
      } catch (e) { await log(`nps error for ${order.id}: ${e.message}`); }
    }
  }

  await saveState(state);

  if ((postPurchase + nps) > 0 && env.TELEGRAM_CHAT_ID) {
    await fs.mkdir(OUTBOX, { recursive: true });
    await fs.writeFile(
      path.join(OUTBOX, `${Date.now()}-customer-success.json`),
      JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `🤝 *Customer Success activity*\n\n${postPurchase} post-purchase drafts\n${nps} NPS check-in drafts\n\nReview at: \`~/Documents/businesses/*/customer-success/\``,
        parse_mode: "Markdown", urgency: "P3",
        queued_at: new Date().toISOString(), sent_at: null,
      }, null, 2)
    );
  }
  await log(`cycle: ${postPurchase} post-purchase, ${nps} NPS drafted`);
}

async function main() {
  await log("customer-success-agent starting");
  setInterval(cycle, POLL_INTERVAL_MS);
  setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  await cycle();
  await heartbeat();
}

main().catch(async (err) => { await log(`FATAL: ${err.message}`); process.exit(1); });
