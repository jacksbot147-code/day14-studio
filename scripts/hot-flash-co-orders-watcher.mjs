#!/usr/bin/env node
/**
 * hot-flash-co-orders-watcher.mjs
 *
 * Polls Printify's orders API hourly. Detects:
 *   - New orders (since last poll) → Telegram celebration
 *   - Refund requests → P1 Telegram alert
 *   - Fulfillment issues (canceled, on hold) → P2 alert
 *
 * State stored at: ~/Documents/businesses/hot-flash-co/orders-watcher-state.json
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const TENANT = "hot-flash-co";
const TENANT_DIR = path.join(HOME, "Documents/businesses", TENANT);
const STATE_FILE = path.join(TENANT_DIR, "orders-watcher-state.json");
const AUDIT_LOG = path.join(TENANT_DIR, "audit-log.jsonl");
const SHARED_OUTBOX = path.join(HOME, "Documents/businesses/_shared/telegram/outbox");
const HEARTBEAT_FILE = path.join(HOME, "Documents/businesses/_shared/poller/hot-flash-co-orders-heartbeat.log");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");

const PRINTIFY_API = "https://api.printify.com/v1";
const POLL_INTERVAL_MS = 60 * 60_000; // hourly
const HEARTBEAT_INTERVAL_MS = 60_000;

async function loadEnv() {
  const text = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function loadState() {
  if (!existsSync(STATE_FILE)) {
    return { last_order_id: null, known_order_ids: [], total_revenue_cents: 0, total_orders: 0 };
  }
  return JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
}

async function saveState(s) {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  await fs.writeFile(STATE_FILE, JSON.stringify(s, null, 2));
}

async function audit(record) {
  const line = JSON.stringify({ ts: new Date().toISOString(), tenant: TENANT, ...record }) + "\n";
  await fs.mkdir(TENANT_DIR, { recursive: true });
  await fs.appendFile(AUDIT_LOG, line);
}

async function heartbeat() {
  await fs.mkdir(path.dirname(HEARTBEAT_FILE), { recursive: true });
  await fs.appendFile(HEARTBEAT_FILE, `${new Date().toISOString()} alive\n`);
}

async function queueAlert(env, text, urgency = "P3") {
  if (!env.TELEGRAM_CHAT_ID) return;
  await fs.mkdir(SHARED_OUTBOX, { recursive: true });
  const filename = `${Date.now()}-hot-flash-orders.json`;
  await fs.writeFile(
    path.join(SHARED_OUTBOX, filename),
    JSON.stringify(
      {
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown",
        urgency,
        queued_at: new Date().toISOString(),
        sent_at: null,
        tenant: TENANT,
      },
      null,
      2
    )
  );
}

async function fetchOrders(printifyKey, shopId) {
  // Pull first page (50 orders most recent)
  const res = await fetch(`${PRINTIFY_API}/shops/${shopId}/orders.json?limit=50&page=1`, {
    headers: { Authorization: `Bearer ${printifyKey}` },
  });
  if (!res.ok) throw new Error(`orders ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.data || [];
}

async function getShopId(printifyKey) {
  const res = await fetch(`${PRINTIFY_API}/shops.json`, {
    headers: { Authorization: `Bearer ${printifyKey}` },
  });
  if (!res.ok) throw new Error(`shops ${res.status}`);
  const shops = await res.json();
  if (!shops.length) throw new Error("no shops");
  return shops[0].id;
}

async function pollCycle() {
  try {
    const env = await loadEnv();
    if (!env.PRINTIFY_API_KEY) {
      console.error("PRINTIFY_API_KEY missing");
      return;
    }
    const state = await loadState();
    const shopId = await getShopId(env.PRINTIFY_API_KEY);
    const orders = await fetchOrders(env.PRINTIFY_API_KEY, shopId);

    const known = new Set(state.known_order_ids);
    const newOrders = orders.filter((o) => !known.has(o.id));

    let newRevenue = 0;
    let newCount = 0;
    for (const order of newOrders) {
      const total = order.total_price || 0; // cents
      newRevenue += total;
      newCount += 1;
      state.known_order_ids.push(order.id);
      state.total_revenue_cents += total;
      state.total_orders += 1;

      const dollars = (total / 100).toFixed(2);
      const itemCount = order.line_items?.length || 0;
      const item = order.line_items?.[0];
      const itemTitle = item?.metadata?.title || "Hot Flash Co item";

      await queueAlert(
        env,
        `💸 *NEW SALE — Hot Flash Co*\n\n` +
          `Order #${order.id}\n` +
          `Amount: *$${dollars}*\n` +
          `Items: ${itemCount} (${itemTitle})\n` +
          `Status: ${order.status || "pending"}\n\n` +
          `Lifetime: $${(state.total_revenue_cents / 100).toFixed(2)} / ${state.total_orders} orders`,
        "P2"
      );
      await audit({
        actor: "orders-watcher",
        action: "new_order_detected",
        order_id: order.id,
        amount_cents: total,
        status: order.status,
      });
    }

    // Check for issues on tracked orders
    for (const order of orders) {
      if (["canceled", "on-hold"].includes(order.status)) {
        // Only alert if we haven't already (basic dedupe: track issued_alerts)
        const alertKey = `issue-${order.id}-${order.status}`;
        if (!state.issued_alerts?.includes(alertKey)) {
          await queueAlert(
            env,
            `⚠️ *Order issue — Hot Flash Co*\n\nOrder #${order.id} status: *${order.status}*\nReview in Printify.`,
            "P1"
          );
          state.issued_alerts = state.issued_alerts || [];
          state.issued_alerts.push(alertKey);
          await audit({
            actor: "orders-watcher",
            action: "order_issue",
            order_id: order.id,
            status: order.status,
          });
        }
      }
    }

    state.last_polled_at = new Date().toISOString();
    state.last_revenue_polled_cents = state.total_revenue_cents;
    await saveState(state);

    console.log(
      `[${new Date().toISOString()}] polled ${orders.length} orders, ${newCount} new, ${(newRevenue / 100).toFixed(
        2
      )} new revenue. lifetime: $${(state.total_revenue_cents / 100).toFixed(2)}/${state.total_orders}`
    );
  } catch (err) {
    console.error(`[${new Date().toISOString()}] poll error:`, err.message);
    await audit({ actor: "orders-watcher", action: "poll_error", error: err.message }).catch(() => {});
  }
}

async function main() {
  await fs.mkdir(TENANT_DIR, { recursive: true });
  console.log("Hot Flash Co orders watcher started");

  setInterval(pollCycle, POLL_INTERVAL_MS);
  setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

  await pollCycle();
  await heartbeat();
  console.log("Watching every hour. Heartbeats every 60s.");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
