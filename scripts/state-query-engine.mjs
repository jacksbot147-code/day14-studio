#!/usr/bin/env node
/**
 * state-query-engine.mjs
 *
 * Module the smarter Telegram bot uses to answer questions about Day14 state.
 * Given a natural-language query, returns a structured snapshot.
 *
 * Used as a library (export functions) — not a standalone CLI.
 *
 * Capabilities:
 *   - Revenue per tenant + lifetime
 *   - Active products per tenant
 *   - Today's drafts (per tenant)
 *   - Recent audit events
 *   - LaunchAgent health (heartbeats)
 *   - Outbox queue depth
 *   - Audit log search
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
const OUTBOX = path.join(SHARED, "telegram/outbox");

export async function listTenants() {
  if (!existsSync(TENANTS_FILE)) return [];
  const data = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8"));
  return data.tenants || [];
}

export async function tenantRevenue(slug) {
  const statePath = path.join(BIZ, slug, "orders-watcher-state.json");
  if (!existsSync(statePath)) return null;
  const state = JSON.parse(await fs.readFile(statePath, "utf8"));
  return {
    lifetime_revenue_cents: state.total_revenue_cents || 0,
    total_orders: state.total_orders || 0,
    last_polled_at: state.last_polled_at,
  };
}

export async function tenantTodaysDrafts(slug) {
  const auditPath = path.join(BIZ, slug, "audit-log.jsonl");
  if (!existsSync(auditPath)) return [];
  const text = await fs.readFile(auditPath, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  const lines = text.trim().split("\n").filter(Boolean);
  const drafts = [];
  for (const l of lines) {
    try {
      const ev = JSON.parse(l);
      if (ev.action === "draft_created" && ev.ts?.startsWith(today)) {
        drafts.push(ev);
      }
    } catch {}
  }
  return drafts;
}

export async function recentAudit(slug, n = 10) {
  const auditPath = path.join(BIZ, slug, "audit-log.jsonl");
  if (!existsSync(auditPath)) return [];
  const text = await fs.readFile(auditPath, "utf8");
  const lines = text.trim().split("\n").filter(Boolean);
  return lines.slice(-n).reverse().map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

export async function heartbeatHealth() {
  if (!existsSync(POLLER_DIR)) return [];
  const files = await fs.readdir(POLLER_DIR);
  const results = [];
  for (const f of files) {
    if (!f.endsWith("-heartbeat.log")) continue;
    const name = f.replace("-heartbeat.log", "");
    try {
      const text = await fs.readFile(path.join(POLLER_DIR, f), "utf8");
      const lines = text.trim().split("\n").filter(Boolean);
      const last = lines[lines.length - 1];
      const ts = last?.match(/^(\S+)/)?.[1];
      if (!ts) { results.push({ name, status: "no-beats" }); continue; }
      const ageMin = (Date.now() - new Date(ts).getTime()) / 60_000;
      results.push({ name, last_beat: ts, age_min: Math.round(ageMin), status: ageMin < 10 ? "healthy" : "stale" });
    } catch (e) { results.push({ name, status: "error", error: e.message }); }
  }
  return results;
}

export async function outboxDepth() {
  if (!existsSync(OUTBOX)) return { total: 0, unsent: 0, urgent: 0 };
  const files = await fs.readdir(OUTBOX);
  let unsent = 0, urgent = 0;
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const data = JSON.parse(await fs.readFile(path.join(OUTBOX, f), "utf8"));
      if (!data.sent_at) {
        unsent += 1;
        if (data.urgency === "P0" || data.urgency === "P1") urgent += 1;
      }
    } catch {}
  }
  return { total: files.length, unsent, urgent };
}

/**
 * Returns a comprehensive snapshot the bot can use as context.
 */
export async function fullStateSnapshot() {
  const tenants = await listTenants();
  const perTenant = [];
  for (const t of tenants) {
    perTenant.push({
      slug: t.slug,
      display_name: t.display_name,
      type: t.type,
      stage: t.stage,
      revenue: await tenantRevenue(t.slug),
      todays_drafts: (await tenantTodaysDrafts(t.slug)).length,
      recent_audit: await recentAudit(t.slug, 5),
    });
  }
  return {
    timestamp: new Date().toISOString(),
    tenants: perTenant,
    heartbeats: await heartbeatHealth(),
    outbox: await outboxDepth(),
  };
}

/**
 * Lightweight snapshot for token-efficient prompts.
 */
export async function compactSnapshot() {
  const tenants = await listTenants();
  const lines = [`Day14 state @ ${new Date().toISOString()}:`];
  for (const t of tenants) {
    const rev = await tenantRevenue(t.slug);
    const drafts = (await tenantTodaysDrafts(t.slug)).length;
    const revStr = rev ? `$${(rev.lifetime_revenue_cents / 100).toFixed(2)} (${rev.total_orders})` : "—";
    lines.push(`  ${t.slug} [${t.type}, ${t.stage}]: revenue ${revStr}, ${drafts} drafts today`);
  }
  const beats = await heartbeatHealth();
  const stale = beats.filter((b) => b.status === "stale").length;
  const obx = await outboxDepth();
  lines.push(`Daemons: ${beats.length} total, ${stale} stale`);
  lines.push(`Outbox: ${obx.unsent} unsent (${obx.urgent} urgent)`);
  return lines.join("\n");
}

// CLI for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2] || "snapshot";
  if (cmd === "snapshot") {
    console.log(await compactSnapshot());
  } else if (cmd === "full") {
    console.log(JSON.stringify(await fullStateSnapshot(), null, 2));
  } else if (cmd === "tenants") {
    console.log(JSON.stringify(await listTenants(), null, 2));
  } else if (cmd === "outbox") {
    console.log(JSON.stringify(await outboxDepth(), null, 2));
  } else if (cmd === "heartbeats") {
    console.log(JSON.stringify(await heartbeatHealth(), null, 2));
  }
}
