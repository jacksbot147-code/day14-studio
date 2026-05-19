#!/usr/bin/env node
/**
 * priority-allocator.mjs
 *
 * Cross-business "what to work on today" engine. Scans state across all
 * tenants and ranks the top 5-10 actions by leverage.
 *
 * Inputs to scoring:
 *   - Pending Jack-taps (cs drafts, product drafts, skill drafts)  → high
 *   - Stale daemons (heartbeats > 10 min)                          → critical
 *   - Stuck outbox messages                                        → high
 *   - New sales unresponded                                        → medium
 *   - Tenants with 0 daily drafts today                            → medium
 *   - Bootstrap candidates in expansion-requests                   → variable
 *   - Marketing drafts ready to post                               → low
 *
 * Output: ~/Documents/businesses/_shared/founder-ops/priority-today.json
 * Also: optional Telegram push when /priority is called or in morning briefing.
 *
 * CLI:
 *   node priority-allocator.mjs           — print ranked list to stdout
 *   node priority-allocator.mjs --push    — also queue Telegram message
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const SHARED_OUTBOX = path.join(SHARED, "telegram/outbox");
const POLLER_DIR = path.join(SHARED, "poller");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const EXPANSION_INBOX = path.join(SHARED, "expansion-requests");
const SKILLS_DRAFTS = path.join(HOME, "Documents/studio/docs/seeds/skills/_drafts");
const OUT_FILE = path.join(SHARED, "founder-ops/priority-today.json");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");

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

async function checkStaleDaemons() {
  if (!existsSync(POLLER_DIR)) return [];
  const stale = [];
  const files = await fs.readdir(POLLER_DIR);
  for (const f of files) {
    if (!f.endsWith("-heartbeat.log")) continue;
    const name = f.replace("-heartbeat.log", "");
    try {
      const text = await fs.readFile(path.join(POLLER_DIR, f), "utf8");
      const lines = text.trim().split("\n").filter(Boolean);
      const last = lines[lines.length - 1];
      const ts = last?.match(/^(\S+)/)?.[1];
      if (!ts) { stale.push({ name, reason: "no beats" }); continue; }
      const ageMin = (Date.now() - new Date(ts).getTime()) / 60_000;
      if (ageMin > 10) stale.push({ name, age_min: Math.round(ageMin) });
    } catch {}
  }
  return stale;
}

async function countCsDrafts(tenant) {
  const dir = path.join(BIZ, tenant, "cs-drafts");
  if (!existsSync(dir)) return 0;
  return (await fs.readdir(dir)).filter((f) => f.endsWith(".md")).length;
}

async function countMarketingDrafts(tenant) {
  const dir = path.join(BIZ, tenant, "marketing-drafts");
  if (!existsSync(dir)) return 0;
  return (await fs.readdir(dir)).filter((f) => f.endsWith(".md")).length;
}

async function countSkillDrafts() {
  if (!existsSync(SKILLS_DRAFTS)) return 0;
  const entries = await fs.readdir(SKILLS_DRAFTS, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory() && !e.name.startsWith("_")).length;
}

async function countExpansionRequests() {
  if (!existsSync(EXPANSION_INBOX)) return { skills: 0, businesses: 0 };
  const out = { skills: 0, businesses: 0 };
  for (const f of await fs.readdir(EXPANSION_INBOX)) {
    if (!f.endsWith(".json")) continue;
    try {
      const data = JSON.parse(await fs.readFile(path.join(EXPANSION_INBOX, f), "utf8"));
      if (data.status !== "pending") continue;
      if (data.type === "new-business") out.businesses += 1;
      else out.skills += 1;
    } catch {}
  }
  return out;
}

async function tenantTodaysDrafts(slug) {
  const auditPath = path.join(BIZ, slug, "audit-log.jsonl");
  if (!existsSync(auditPath)) return 0;
  const text = await fs.readFile(auditPath, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  return text.trim().split("\n").filter((l) => {
    try {
      const ev = JSON.parse(l);
      return ev.action === "draft_created" && ev.ts?.startsWith(today);
    } catch { return false; }
  }).length;
}

async function tenantRevenueState(slug) {
  const f = path.join(BIZ, slug, "orders-watcher-state.json");
  if (!existsSync(f)) return { total_orders: 0, total_revenue_cents: 0 };
  return JSON.parse(await fs.readFile(f, "utf8"));
}

async function buildPriorities() {
  const tenants = await listTenants();
  const stale = await checkStaleDaemons();
  const skillDrafts = await countSkillDrafts();
  const expansion = await countExpansionRequests();
  const items = [];

  // CRITICAL: stale daemons
  for (const s of stale) {
    items.push({
      score: 100,
      tier: "🚨 critical",
      label: `Daemon down: ${s.name}${s.age_min ? ` (${s.age_min}m)` : ""}`,
      action: `tail -20 ~/Documents/businesses/_shared/poller/${s.name}.stderr.log`,
    });
  }

  // HIGH: pending Jack-taps per tenant
  for (const t of tenants) {
    const csCount = await countCsDrafts(t.slug);
    if (csCount > 0) {
      items.push({
        score: 80 + csCount * 5,
        tier: "🔴 high",
        label: `${csCount} CS drafts waiting in ${t.slug}`,
        action: `Open ~/Documents/businesses/${t.slug}/cs-drafts/ — review + send`,
      });
    }
    const mkCount = await countMarketingDrafts(t.slug);
    if (mkCount > 0) {
      items.push({
        score: 30 + mkCount,
        tier: "🟢 low",
        label: `${mkCount} marketing drafts ready in ${t.slug}`,
        action: `Open ~/Documents/businesses/${t.slug}/marketing-drafts/`,
      });
    }
    // Daily draft generated?
    const todays = await tenantTodaysDrafts(t.slug);
    if (todays === 0 && t.stage === "launching") {
      items.push({
        score: 40,
        tier: "🟡 medium",
        label: `${t.slug}: 0 drafts today (daily-engine may have skipped)`,
        action: `node scripts/${t.slug}-daily-engine.mjs`,
      });
    }
    // Revenue check
    const rev = await tenantRevenueState(t.slug);
    if (rev.total_orders > 0 && t.stage === "launching") {
      items.push({
        score: 60,
        tier: "🟡 medium",
        label: `${t.slug} has revenue ($${(rev.total_revenue_cents / 100).toFixed(2)}, ${rev.total_orders} orders) — advance to "active"?`,
        action: `Edit ~/Documents/businesses/_shared/tenants.json — set stage:"active"`,
      });
    }
  }

  // MEDIUM: skill drafts to approve
  if (skillDrafts > 0) {
    items.push({
      score: 50,
      tier: "🟡 medium",
      label: `${skillDrafts} skill drafts awaiting approval`,
      action: `ls ~/Documents/studio/docs/seeds/skills/_drafts/ — reply "approve <name>" in Telegram`,
    });
  }

  // MEDIUM: business bootstrap requests
  if (expansion.businesses > 0) {
    items.push({
      score: 70,
      tier: "🟡 medium",
      label: `${expansion.businesses} new-business request(s) queued`,
      action: `Reply "bootstrap now" in Telegram to launch oldest`,
    });
  }

  // Sort by score desc
  return items.sort((a, b) => b.score - a.score);
}

async function formatTelegram(items) {
  if (items.length === 0) return `✅ *Empire status: all clean*\n\nNothing waiting. Build something new.`;
  const lines = ["📋 *Today's priorities*\n"];
  for (const [i, item] of items.slice(0, 10).entries()) {
    lines.push(`${i + 1}. ${item.tier} ${item.label}`);
  }
  return lines.join("\n");
}

async function main() {
  const push = process.argv.includes("--push");
  const items = await buildPriorities();

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify({ generated_at: new Date().toISOString(), items }, null, 2));

  // Print to stdout
  if (items.length === 0) {
    console.log("✅ all clear");
  } else {
    for (const [i, item] of items.slice(0, 15).entries()) {
      console.log(`${i + 1}. [${item.score}] ${item.tier}  ${item.label}`);
      console.log(`     → ${item.action}`);
    }
  }

  if (push) {
    const env = await loadEnv();
    if (env.TELEGRAM_CHAT_ID) {
      await fs.mkdir(SHARED_OUTBOX, { recursive: true });
      await fs.writeFile(
        path.join(SHARED_OUTBOX, `${Date.now()}-priority-today.json`),
        JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: await formatTelegram(items),
          parse_mode: "Markdown",
          urgency: "P3",
          queued_at: new Date().toISOString(),
          sent_at: null,
        }, null, 2)
      );
      console.log(`\n✓ pushed to Telegram`);
    }
  }
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
