#!/usr/bin/env node
/**
 * morning-briefing.mjs
 *
 * Assembles Jack's 8:30 AM ET tap-through queue.
 *
 * Reads from drafts, growth-log, meta-gaps, churn-risk, heartbeats,
 * audit log, telegram outbox, and energy log. Emits a single decision-
 * ranked markdown doc + queues a Telegram P1 ping.
 *
 * Run: node ~/Documents/studio/scripts/morning-briefing.mjs
 * Scheduled: 8:30 AM ET via scheduled-tasks MCP
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

// ---- paths ----
const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const SEEDS = path.join(HOME, "Documents/studio/docs/seeds/skills");
const DRAFTS = path.join(SEEDS, "_drafts");
const META_DRAFTS = path.join(DRAFTS, "_meta");
const GROWTH_LOG = path.join(SHARED, "growth/growth-log.md");
const META_GAPS = path.join(SHARED, "growth/meta-gaps.md");
const META_CIRCUIT = path.join(SHARED, "growth/meta-circuit-state.json");
const POLLER_DIR = path.join(SHARED, "poller");
const TG_OUTBOX = path.join(SHARED, "telegram/outbox");
const FOUNDER = path.join(SHARED, "founder-ops");
const ENERGY_LOG = path.join(FOUNDER, "energy-log.jsonl");
const AUDIT_DIR = path.join(SHARED, "audit");
const STUDIO_DOCS = path.join(HOME, "Documents/studio/docs");

const HEARTBEAT_STALE_MIN = 10;

// ---- env (lazy) ----
async function loadEnv() {
  const envPath = path.join(HOME, "Documents/studio/.env.local");
  if (!existsSync(envPath)) return {};
  const text = await fs.readFile(envPath, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) {
      env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
  return env;
}

// ---- helpers ----
async function ls(dir) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function readFileSafe(p) {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

function escapeMd(t) {
  return String(t).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function fmt(d = new Date()) {
  return d.toISOString();
}

function minutesSince(iso) {
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000);
}

// ---- gather: drafts ----
async function gatherDrafts() {
  const domain = [];
  const meta = [];
  for (const e of await ls(DRAFTS)) {
    if (e.name.startsWith("_")) continue;
    if (!e.isDirectory()) continue;
    const skillFile = path.join(DRAFTS, e.name, "SKILL.md");
    if (!existsSync(skillFile)) continue;
    const stat = await fs.stat(skillFile);
    domain.push({ name: e.name, mtime: stat.mtime });
  }
  for (const e of await ls(META_DRAFTS)) {
    if (!e.isDirectory()) continue;
    const skillFile = path.join(META_DRAFTS, e.name, "SKILL.md");
    if (!existsSync(skillFile)) continue;
    const content = (await readFileSafe(skillFile)) || "";
    const riskMatch = content.match(/recurrence_risk:\s*([\d.]+)/);
    const risk = riskMatch ? parseFloat(riskMatch[1]) : 0;
    const stat = await fs.stat(skillFile);
    meta.push({ name: e.name, mtime: stat.mtime, risk });
  }
  return { domain, meta };
}

// ---- gather: heartbeats ----
async function gatherHeartbeats() {
  const results = [];
  for (const e of await ls(POLLER_DIR)) {
    if (!e.isFile()) continue;
    if (!e.name.endsWith("-heartbeat.log")) continue;
    const file = path.join(POLLER_DIR, e.name);
    const text = (await readFileSafe(file)) || "";
    const lines = text.trim().split("\n").filter(Boolean);
    const last = lines[lines.length - 1];
    let lastIso = null;
    if (last) {
      const m = last.match(/^(\S+)/);
      if (m) lastIso = m[1];
    }
    const ageMin = lastIso ? minutesSince(lastIso) : Infinity;
    const stale = ageMin > HEARTBEAT_STALE_MIN;
    const name = e.name.replace("-heartbeat.log", "");
    results.push({ name, lastIso, ageMin, stale });
  }
  return results;
}

// ---- gather: unsent telegram cards ----
async function gatherUnsentTg() {
  const items = [];
  for (const e of await ls(TG_OUTBOX)) {
    if (!e.isFile() || !e.name.endsWith(".json")) continue;
    const p = path.join(TG_OUTBOX, e.name);
    try {
      const data = JSON.parse(await fs.readFile(p, "utf8"));
      if (data.sent_at) continue;
      items.push({
        filename: e.name,
        urgency: data.urgency || "P3",
        queued_at: data.queued_at,
        text_preview: (data.text || "").slice(0, 80),
      });
    } catch {
      // skip malformed
    }
  }
  // P0 first, P1, P2, P3
  items.sort((a, b) =>
    (a.urgency || "P3").localeCompare(b.urgency || "P3")
  );
  return items;
}

// ---- gather: energy log tail ----
async function gatherEnergyTail() {
  if (!existsSync(ENERGY_LOG)) return [];
  const text = await fs.readFile(ENERGY_LOG, "utf8");
  const lines = text.trim().split("\n").filter(Boolean);
  return lines
    .slice(-3)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// ---- gather: growth log last 24h ----
async function gatherGrowthRecent() {
  const text = await readFileSafe(GROWTH_LOG);
  if (!text) return [];
  const entries = text
    .split(/\n## /)
    .slice(1)
    .map((s) => "## " + s);
  return entries.slice(-5);
}

async function gatherMetaGapsRecent() {
  const text = await readFileSafe(META_GAPS);
  if (!text) return [];
  const entries = text
    .split(/\n## /)
    .slice(1)
    .map((s) => "## " + s);
  return entries.slice(-3);
}

async function readMetaCircuit() {
  try {
    return JSON.parse(await fs.readFile(META_CIRCUIT, "utf8"));
  } catch {
    return { open: false };
  }
}

// ---- gather: skill audit results (if generated) ----
async function gatherSkillAudit() {
  const today = new Date().toISOString().slice(0, 10);
  const candidates = [
    `skill-merge-candidates-${today}.md`,
    `skill-merge-candidates-2026-05-18.md`,
    `skill-merge-candidates-2026-05-17.md`,
  ];
  for (const c of candidates) {
    const p = path.join(STUDIO_DOCS, c);
    if (existsSync(p)) {
      return { filename: c, path: p, content: await fs.readFile(p, "utf8") };
    }
  }
  return null;
}

// ---- gather: e2e test results ----
async function gatherE2eResults() {
  const today = new Date().toISOString().slice(0, 10);
  const candidates = [
    `e2e-pipeline-results-${today}.md`,
    `e2e-pipeline-results-2026-05-18.md`,
    `e2e-pipeline-results-2026-05-17.md`,
  ];
  for (const c of candidates) {
    const p = path.join(STUDIO_DOCS, c);
    if (existsSync(p)) {
      return { filename: c, path: p, content: await fs.readFile(p, "utf8") };
    }
  }
  return null;
}

// ---- count empire ----
async function countEmpire() {
  let count = 0;
  for (const e of await ls(SEEDS)) {
    if (e.isDirectory() && !e.name.startsWith("_")) {
      const skillFile = path.join(SEEDS, e.name, "SKILL.md");
      if (existsSync(skillFile)) count += 1;
    }
  }
  return count;
}

// ---- compose briefing ----
async function compose() {
  const empireSize = await countEmpire();
  const { domain, meta } = await gatherDrafts();
  const heartbeats = await gatherHeartbeats();
  const unsentTg = await gatherUnsentTg();
  const energy = await gatherEnergyTail();
  const growthRecent = await gatherGrowthRecent();
  const metaGaps = await gatherMetaGapsRecent();
  const circuit = await readMetaCircuit();
  const skillAudit = await gatherSkillAudit();
  const e2e = await gatherE2eResults();

  const staleHeartbeats = heartbeats.filter((h) => h.stale);
  const p0Cards = unsentTg.filter((c) => c.urgency === "P0");
  const p1Cards = unsentTg.filter((c) => c.urgency === "P1");

  const systemColor =
    staleHeartbeats.length > 0 || p0Cards.length > 0 || circuit.open
      ? "🔴"
      : p1Cards.length > 0 || meta.length > 2
        ? "🟡"
        : "🟢";

  const tapCount =
    domain.length + meta.length + p0Cards.length + p1Cards.length;
  const estMin = Math.min(30, Math.round(tapCount * 1.2 + 5));

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const dayName = now.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "America/New_York",
  });

  const out = [];
  out.push(`# Morning briefing — ${dayName} ${dateStr}, 8:30 AM ET`);
  out.push("");
  out.push(`> **Live dashboard**: http://localhost:3000/dashboard — open this in a tab for at-a-glance status (auto-refreshes every 30s).`);
  out.push("");
  out.push(`## TLDR (5 sec)`);
  out.push(`- Empire size: **${empireSize} skills**`);
  out.push(`- Tap queue: **${tapCount} items**, est ${estMin} min`);
  out.push(`- Systems: ${systemColor}`);
  out.push(
    `- Yesterday's energy: ${energy.length > 0 ? `${energy[energy.length - 1].energy}/10` : "no entry"}`
  );
  out.push("");

  // P0 first
  if (p0Cards.length || staleHeartbeats.length || circuit.open) {
    out.push(`## 🚨 P0 — act first`);
    if (circuit.open) {
      out.push(
        `- **Meta-growth circuit breaker OPEN** since ${circuit.since}: ${circuit.reason}`
      );
      out.push(`  Reset with \`/growth-reset\` after review.`);
    }
    for (const h of staleHeartbeats) {
      out.push(
        `- **Poller stale**: ${h.name} — ${h.ageMin === Infinity ? "no heartbeat ever" : `${h.ageMin} min ago`}`
      );
    }
    for (const c of p0Cards) {
      out.push(`- **P0 outbox**: ${c.text_preview}…`);
    }
    out.push("");
  }

  // P1
  if (p1Cards.length) {
    out.push(`## ⭐ P1 cards waiting`);
    for (const c of p1Cards.slice(0, 5)) {
      out.push(`- ${c.text_preview}…`);
    }
    if (p1Cards.length > 5) {
      out.push(`- _(plus ${p1Cards.length - 5} more)_`);
    }
    out.push("");
  }

  // Drafts
  if (domain.length) {
    out.push(`## ✏️ Domain drafts (${domain.length}) — 10-15 sec each`);
    for (const d of domain.slice(0, 10)) {
      out.push(`- \`${d.name}\` — \`docs/seeds/skills/_drafts/${d.name}/SKILL.md\``);
    }
    if (domain.length > 10) {
      out.push(`- _(plus ${domain.length - 10} more — batch-approve recommended)_`);
    }
    out.push("");
  }

  // Meta drafts
  if (meta.length) {
    out.push(`## 🧬 Meta drafts (${meta.length}) — read carefully`);
    for (const m of meta) {
      const tag =
        m.risk > 0.7 ? " 🔴 HIGH RISK" : m.risk > 0.5 ? " 🟠" : " 🟢";
      out.push(
        `- \`${m.name}\`${tag} (risk ${m.risk.toFixed(2)}) — \`docs/seeds/skills/_drafts/_meta/${m.name}/SKILL.md\``
      );
    }
    if (meta.some((m) => m.risk > 0.7)) {
      out.push(
        `- **Default action for HIGH-RISK meta drafts: defer to Council.**`
      );
    }
    out.push("");
  }

  // Skill audit
  if (skillAudit) {
    out.push(`## ⚠️ Skill merge proposals`);
    out.push(
      `Audit found candidates — see [\`${skillAudit.filename}\`](computer://${skillAudit.path})`
    );
    out.push("");
  }

  // E2E results
  if (e2e) {
    out.push(`## 🧪 E2E pipeline test results`);
    out.push(
      `See [\`${e2e.filename}\`](computer://${e2e.path}) for full output`
    );
    out.push("");
  }

  // Trends
  out.push(`## 📊 Trends (read, no action)`);
  out.push(`- Poller health:`);
  for (const h of heartbeats) {
    const tag = h.stale ? "🔴" : "✓";
    out.push(`  - ${tag} ${h.name}: ${h.ageMin === Infinity ? "never" : `${h.ageMin} min ago`}`);
  }
  if (growthRecent.length > 0) {
    out.push(`- Recent growth detections: ${growthRecent.length} in last few cycles`);
  }
  if (metaGaps.length > 0) {
    out.push(`- Recent meta-gap detections: ${metaGaps.length}`);
  }
  if (energy.length >= 2) {
    const vals = energy.map((e) => e.energy);
    out.push(`- Energy trend (last ${energy.length}): ${vals.join(", ")}`);
  }
  out.push("");

  // What was auto-parked
  out.push(`## 💤 What I parked`);
  out.push(`- All P3 cards (visible in outbox; tap when convenient)`);
  out.push(`- Skill firings logged but not requiring review`);
  out.push(`- Routine automations (webhooks, retries)`);
  out.push("");
  out.push(`---`);
  out.push(`_Briefing generated: ${fmt()}_`);
  out.push(``);

  return { briefing: out.join("\n"), tapCount, systemColor, estMin };
}

// ---- queue Telegram ping ----
async function queueTelegramPing(briefingPath, tapCount, systemColor, estMin) {
  const env = await loadEnv();
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!chatId) return false;

  const filename = `${Date.now()}-morning-briefing.json`;
  const filepath = path.join(TG_OUTBOX, filename);

  const text =
    `☀️ *Morning briefing ready*\n\n` +
    `${escapeMd(systemColor)} Systems\n` +
    `📋 ${tapCount} taps, est ${estMin} min\n\n` +
    `📊 Dashboard: http://localhost:3000/dashboard\n` +
    `📄 [briefing](computer://${escapeMd(briefingPath)})`;

  await fs.mkdir(TG_OUTBOX, { recursive: true });
  await fs.writeFile(
    filepath,
    JSON.stringify(
      {
        chat_id: chatId,
        text,
        parse_mode: "MarkdownV2",
        urgency: "P1",
        queued_at: new Date().toISOString(),
        sent_at: null,
      },
      null,
      2
    )
  );
  return true;
}

// ---- main ----
async function main() {
  await fs.mkdir(FOUNDER, { recursive: true });

  const { briefing, tapCount, systemColor, estMin } = await compose();

  const dateStr = new Date().toISOString().slice(0, 10);
  const briefingPath = path.join(FOUNDER, `briefing-${dateStr}.md`);
  await fs.writeFile(briefingPath, briefing, "utf8");

  const queued = await queueTelegramPing(
    briefingPath,
    tapCount,
    systemColor,
    estMin
  );

  console.log(
    `[morning-briefing] briefing written: ${briefingPath}`
  );
  console.log(
    `[morning-briefing] tap_count=${tapCount} systems=${systemColor} est_min=${estMin}`
  );
  console.log(
    `[morning-briefing] telegram_queued=${queued}`
  );

  return briefingPath;
}

main().catch((err) => {
  console.error("[morning-briefing] FATAL:", err);
  process.exit(1);
});
