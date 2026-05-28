#!/usr/bin/env node
/**
 * morning-briefing.mjs
 *
 * Assembles Jack's 8:30 AM ET action-oriented morning briefing.
 *
 * Initiative A3 — actionable morning briefing. The briefing no longer just
 * tells Jack what is happening; it leads with what needs HIM and points every
 * actionable line at the exact surface to act on it, so he never has to hunt:
 *   - Most "needs you" items resolve in the unified Approvals queue:
 *     https://day14.us/admin/inbox  (locally: localhost:3000/admin/inbox)
 *   - Other items link to the relevant admin page (/admin/health, /finance, ...).
 *
 * It reads the SAME sources the Approvals queue aggregates — open operator
 * to-dos (operator-todos.json), queued social posts, skill drafts, pending
 * expansion requests, pitched opportunities — so the briefing's "needs you"
 * count matches what Jack sees when he opens the queue. It also separates
 * routine / quick items from items that need a genuine decision.
 *
 * Reads from operator-todos, drafts, social queues, expansion requests,
 * opportunities, growth-log, meta-gaps, heartbeats, telegram outbox, and energy
 * log. Emits a single action-ranked markdown doc + queues a Telegram P1 ping.
 *
 * Run: node ~/Documents/studio/scripts/morning-briefing.mjs
 * Run (no Telegram queued): node ~/Documents/studio/scripts/morning-briefing.mjs --dry-run
 * Scheduled: 8:30 AM ET via scheduled-tasks MCP
 *
 * NOTE: all text read from data files is untrusted — it is only ever embedded
 * as plain markdown text, never executed or interpolated into commands.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { invokeSkill } from "./lib/skill-bridge.mjs";

// ---- dry-run flag (does NOT queue a Telegram ping) ----
const DRY_RUN =
  process.argv.includes("--dry-run") || process.argv.includes("--no-send");

// ---- paths ----
const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const BIZ = path.join(HOME, "Documents/businesses");
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
// Approvals-queue sources — same files /admin/inbox aggregates.
const OPERATOR_TODOS = path.join(SHARED, "operator-todos.json");
const EXPANSION_INBOX = path.join(SHARED, "expansion-requests");

const HEARTBEAT_STALE_MIN = 10;

// ---- action surfaces (where Jack goes to act) ----
// The unified Approvals queue is the single place most "needs you" items
// resolve. Other items link to the relevant admin page.
const INBOX_URL = "https://day14.us/admin/inbox";
const ADMIN = {
  inbox: INBOX_URL,
  overview: "https://day14.us/admin",
  health: "https://day14.us/admin/health",
  realty: "https://day14.us/admin/realty",
  finance: "https://day14.us/admin/finance",
  activity: "https://day14.us/admin/activity",
  opportunities: "https://day14.us/admin/opportunities",
};

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
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity; // unparseable timestamp -> treat as stale
  return Math.round((Date.now() - t) / 60000);
}

// Human-readable heartbeat age that never prints "NaN".
function ageText(ageMin) {
  if (!Number.isFinite(ageMin)) return "unknown";
  return `${ageMin} min ago`;
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

// ---- gather: open operator to-dos ----------------------------------------
// These are the human_todos /admin/inbox surfaces. Reading the file directly
// keeps the briefing's "needs you" count in sync with the Approvals queue.
async function gatherOperatorTodos() {
  try {
    const data = JSON.parse(await fs.readFile(OPERATOR_TODOS, "utf8"));
    const todos = Array.isArray(data) ? data : data.todos || [];
    return todos
      .filter((t) => t && t.status === "open")
      .map((t) => ({
        id: t.id,
        seq: t.seq,
        tenant: t.tenant || "empire",
        title: String(t.title || "(untitled to-do)"),
        category: String(t.category || "task"),
        priority: t.priority === "high" ? "high" : t.priority === "low" ? "low" : "medium",
        createdAt: t.created_at || null,
      }));
  } catch {
    return [];
  }
}

// ---- gather: queued social posts awaiting sign-off -----------------------
async function gatherQueuedSocial() {
  const items = [];
  for (const t of await ls(BIZ)) {
    if (!t.isDirectory() || t.name.startsWith("_")) continue;
    const sqRoot = path.join(BIZ, t.name, "social-queue");
    if (!existsSync(sqRoot)) continue;
    for (const platform of await ls(sqRoot)) {
      if (!platform.isDirectory()) continue;
      const platformDir = path.join(sqRoot, platform.name);
      for (const f of await ls(platformDir)) {
        if (!f.isFile() || !f.name.endsWith(".json")) continue;
        try {
          const data = JSON.parse(
            await fs.readFile(path.join(platformDir, f.name), "utf8")
          );
          if (data?.status !== "queued") continue;
          items.push({
            tenant: t.name,
            platform: platform.name,
            title: String(data.content?.slug || data.angle || f.name),
          });
        } catch {
          // skip unreadable queue file
        }
      }
    }
  }
  return items;
}

// ---- gather: pending expansion requests ----------------------------------
async function gatherExpansionRequests() {
  const items = [];
  if (!existsSync(EXPANSION_INBOX)) return items;
  for (const f of await ls(EXPANSION_INBOX)) {
    if (!f.isFile() || !f.name.endsWith(".json")) continue;
    try {
      const data = JSON.parse(
        await fs.readFile(path.join(EXPANSION_INBOX, f.name), "utf8")
      );
      if (data?.status !== "pending") continue;
      const isBusiness = data.type === "new-business";
      items.push({
        isBusiness,
        title: isBusiness
          ? "Bootstrap a new business"
          : String(data.skill_name || "New skill request"),
      });
    } catch {
      // skip unreadable request file
    }
  }
  return items;
}

// ---- gather: pitched opportunities awaiting a launch call ----------------
async function gatherPitchedOpportunities() {
  try {
    const statePath = path.join(
      HOME,
      "Documents/studio/public/data/empire-state.json"
    );
    const state = JSON.parse(await fs.readFile(statePath, "utf8"));
    return (state.opportunities || [])
      .filter((o) => o && o.pitched && o.status === "open")
      .map((o) => ({
        id: o.id,
        niche: String(o.niche || "(unnamed opportunity)"),
        score: o.total_score,
      }));
  } catch {
    return [];
  }
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

// ---- classify a "needs you" item: routine (quick) vs decision (needs thought)
// Routine = mechanical / low-stakes: paste a key, drop a file, run a migration,
// approve a draft. Decision = needs genuine judgement: a launch call, a content
// sign-off, a meta-skill that changes how the empire behaves.
const ROUTINE_TODO_CATEGORIES = new Set([
  "credentials",
  "data",
  "database",
  "deploy",
  "publish",
  "fix",
  "realty", // county-record drops — supply a file, no judgement call
]);

function classifyTodo(todo) {
  // A high-priority "review" to-do still needs a real decision.
  if (todo.category === "review") return "decision";
  return ROUTINE_TODO_CATEGORIES.has(todo.category) ? "routine" : "decision";
}

// One actionable line: headline + where to act. `surface` is a label/URL pair.
function actionLine(headline, surface) {
  return `- ${headline}\n  → Act: [${surface.label}](${surface.url})`;
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

  // Approvals-queue sources — the same things /admin/inbox aggregates.
  const todos = await gatherOperatorTodos();
  const queuedSocial = await gatherQueuedSocial();
  const expansionReqs = await gatherExpansionRequests();
  const pitchedOpps = await gatherPitchedOpportunities();

  const staleHeartbeats = heartbeats.filter((h) => h.stale);
  const p0Cards = unsentTg.filter((c) => c.urgency === "P0");
  const p1Cards = unsentTg.filter((c) => c.urgency === "P1");

  // ---- build the "needs you" model -----------------------------------------
  // Every item carries: a headline, the surface to act on, whether it is a
  // genuine decision or routine, and whether it is urgent (drives the lead).
  const needs = [];

  // Stale pollers / open circuit breaker — operational, act first, /admin/health.
  if (circuit.open) {
    needs.push({
      kind: "system",
      urgent: true,
      decision: true,
      headline: `Meta-growth circuit breaker is OPEN${
        circuit.since ? ` (since ${circuit.since})` : ""
      }${circuit.reason ? ` — ${circuit.reason}` : ""}`,
      surface: { label: "Admin · Health", url: ADMIN.health },
    });
  }
  for (const h of staleHeartbeats) {
    needs.push({
      kind: "system",
      urgent: true,
      decision: false,
      headline: `Poller stale: \`${h.name}\` — ${
        Number.isFinite(h.ageMin) ? `${h.ageMin} min ago` : "no recent heartbeat"
      }`,
      surface: { label: "Admin · Health", url: ADMIN.health },
    });
  }
  for (const c of p0Cards) {
    needs.push({
      kind: "system",
      urgent: true,
      decision: true,
      headline: `P0 outbox card unsent: ${c.text_preview}…`,
      surface: { label: "Approvals queue", url: ADMIN.inbox },
    });
  }

  // Open operator to-dos — surfaced in /admin/inbox as "Operator to-do".
  for (const t of todos) {
    const isDecision = classifyTodo(t) === "decision";
    // Realty intake / county-record to-dos have a dedicated admin page.
    const surface =
      t.tenant === "day14-realty" &&
      (t.category === "realty" || t.category === "data")
        ? { label: "Admin · Realty", url: ADMIN.realty }
        : { label: "Approvals queue", url: ADMIN.inbox };
    needs.push({
      kind: "todo",
      urgent: t.priority === "high",
      decision: isDecision,
      headline: `[${t.tenant}] ${t.title}${t.seq ? ` _(to-do #${t.seq})_` : ""}`,
      surface,
    });
  }

  // Queued social posts — sign-off in the Approvals queue.
  for (const s of queuedSocial) {
    needs.push({
      kind: "social",
      urgent: false,
      decision: true, // publishing content is a real call
      headline: `[${s.tenant}] ${s.platform} post queued: ${s.title}`,
      surface: { label: "Approvals queue", url: ADMIN.inbox },
    });
  }

  // Skill drafts — quick approve/skip in the Approvals queue.
  for (const d of domain) {
    needs.push({
      kind: "skill",
      urgent: false,
      decision: false,
      headline: `Skill draft awaiting sign-off: \`${d.name}\``,
      surface: { label: "Approvals queue", url: ADMIN.inbox },
    });
  }
  // Meta drafts change empire behaviour — always a genuine decision.
  for (const m of meta) {
    const tag = m.risk > 0.7 ? " 🔴 HIGH RISK" : m.risk > 0.5 ? " 🟠" : "";
    needs.push({
      kind: "skill",
      urgent: m.risk > 0.7,
      decision: true,
      headline: `Meta-skill draft \`${m.name}\`${tag} (risk ${m.risk.toFixed(
        2
      )})`,
      surface: { label: "Approvals queue", url: ADMIN.inbox },
    });
  }

  // Pending expansion requests — a launch/go-ahead call.
  for (const e of expansionReqs) {
    needs.push({
      kind: "expansion",
      urgent: e.isBusiness,
      decision: true,
      headline: e.isBusiness
        ? `New-business request awaiting go-ahead: ${e.title}`
        : `Expansion request awaiting your call: ${e.title}`,
      surface: { label: "Approvals queue", url: ADMIN.inbox },
    });
  }

  // Pitched opportunities — launch decision; also browsable on /admin/opportunities.
  for (const o of pitchedOpps) {
    needs.push({
      kind: "opportunity",
      urgent: false,
      decision: true,
      headline: `Opportunity pitch: ${o.niche}${
        o.score != null ? ` (score ${o.score})` : ""
      }`,
      surface: { label: "Approvals queue", url: ADMIN.inbox },
    });
  }

  // ---- split routine vs decision; pick the single most important item ------
  const urgentItems = needs.filter((n) => n.urgent);
  const decisionItems = needs.filter((n) => n.decision && !n.urgent);
  const routineItems = needs.filter((n) => !n.decision && !n.urgent);
  const needsCount = needs.length;

  // Most important = first urgent item, else first decision, else first routine.
  const topItem = urgentItems[0] || decisionItems[0] || routineItems[0] || null;

  const systemColor =
    staleHeartbeats.length > 0 || p0Cards.length > 0 || circuit.open
      ? "🔴"
      : urgentItems.length > 0 || decisionItems.length > 3
        ? "🟡"
        : "🟢";

  const estMin = Math.min(40, Math.round(needsCount * 1.2 + 3));

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const dayName = now.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "America/New_York",
  });

  const out = [];
  out.push(`# Morning briefing — ${dayName} ${dateStr}, 8:30 AM ET`);
  out.push("");

  // ── LEAD: what needs Jack, before any empire chatter ──────────────────────
  out.push(`## ☀️ What needs you today`);
  if (needsCount === 0) {
    out.push(`**Nothing is waiting on you.** Every approvals source is clear.`);
    out.push("");
    out.push(
      `Check anytime: [Approvals queue → ${ADMIN.inbox}](${ADMIN.inbox})`
    );
  } else {
    out.push(
      `**${needsCount} ${
        needsCount === 1 ? "item needs" : "items need"
      } you** — ${urgentItems.length} urgent, ${
        decisionItems.length
      } real ${decisionItems.length === 1 ? "decision" : "decisions"}, ${
        routineItems.length
      } quick.`
    );
    if (topItem) {
      out.push("");
      out.push(`**Start here →** ${topItem.headline}`);
      out.push(
        `Act on it: [${topItem.surface.label} → ${topItem.surface.url}](${topItem.surface.url})`
      );
    }
    out.push("");
    out.push(
      `Everything below links to where you act. Most resolve in the unified ` +
        `**[Approvals queue](${ADMIN.inbox})** — one surface for to-dos, ` +
        `drafts, queued posts, requests and pitches. Est. ${estMin} min total.`
    );
  }
  out.push("");

  // ── At a glance ───────────────────────────────────────────────────────────
  out.push(`## At a glance`);
  out.push(`- Needs you: **${needsCount}** (${urgentItems.length} urgent)`);
  out.push(`- Systems: ${systemColor}`);
  out.push(`- Empire size: ${empireSize} skills`);
  out.push(
    `- Yesterday's energy: ${
      energy.length > 0 ? `${energy[energy.length - 1].energy}/10` : "no entry"
    }`
  );
  out.push("");

  // ── ACT FIRST — urgent / operational ──────────────────────────────────────
  if (urgentItems.length) {
    out.push(`## 🚨 Act first — urgent (${urgentItems.length})`);
    out.push(
      `_Operational or high-priority. Clear these before anything else._`
    );
    for (const n of urgentItems) {
      out.push(actionLine(n.headline, n.surface));
    }
    out.push("");
  }

  // ── REAL DECISIONS — needs genuine thought ────────────────────────────────
  if (decisionItems.length) {
    out.push(`## 🧠 Real decisions (${decisionItems.length}) — needs thought`);
    out.push(
      `_Launch calls, content sign-offs, meta-skills. Give these your attention._`
    );
    for (const n of decisionItems) {
      out.push(actionLine(n.headline, n.surface));
    }
    out.push("");
  }

  // ── ROUTINE — quick / low-stakes ──────────────────────────────────────────
  if (routineItems.length) {
    out.push(`## ✅ Routine (${routineItems.length}) — ~2 min each`);
    out.push(
      `_Mechanical: paste a key, drop a file, approve a draft. Batch them._`
    );
    for (const n of routineItems) {
      out.push(actionLine(n.headline, n.surface));
    }
    out.push("");
  }

  // TODO(telegram-bridge): once the Telegram bridge is restored, each line in
  // the three sections above should also render as a Telegram message with
  // inline-keyboard buttons (Approve / Dismiss / Snooze) wired to the bot API,
  // so Jack can act without leaving Telegram. That needs bot-API
  // inline-keyboard work + the bridge up; build it then. For now the briefing
  // is actionable by structure + linking to the Approvals queue.

  // Skill audit — operational follow-up, not a queue item.
  if (skillAudit) {
    out.push(`## ⚠️ Skill merge proposals`);
    out.push(
      `Audit found merge candidates — review [\`${skillAudit.filename}\`](computer://${skillAudit.path}).`
    );
    out.push("");
  }

  // E2E results.
  if (e2e) {
    out.push(`## 🧪 E2E pipeline test results`);
    out.push(
      `See [\`${e2e.filename}\`](computer://${e2e.path}) for full output.`
    );
    out.push("");
  }

  // ── Trends — read only, no action ─────────────────────────────────────────
  out.push(`## 📊 Trends (read, no action)`);
  out.push(
    `- Poller health (full status: [Admin · Health](${ADMIN.health})):`
  );
  for (const h of heartbeats) {
    const tag = h.stale ? "🔴" : "✓";
    out.push(`  - ${tag} ${h.name}: ${ageText(h.ageMin)}`);
  }
  if (growthRecent.length > 0) {
    out.push(
      `- Recent growth detections: ${growthRecent.length} in last few cycles`
    );
  }
  if (metaGaps.length > 0) {
    out.push(`- Recent meta-gap detections: ${metaGaps.length}`);
  }
  if (energy.length >= 2) {
    const vals = energy.map((e) => e.energy);
    out.push(`- Energy trend (last ${energy.length}): ${vals.join(", ")}`);
  }
  out.push(`- Empire activity feed: [Admin · Activity](${ADMIN.activity})`);
  out.push(`- Finances: [Admin · Finance](${ADMIN.finance})`);
  out.push("");

  // What was auto-parked — nothing here needs Jack.
  out.push(`## 💤 Parked (no action needed)`);
  out.push(`- P3 outbox cards (visible in outbox; tap when convenient)`);
  out.push(`- Skill firings logged but not requiring review`);
  out.push(`- Routine automations (webhooks, retries)`);
  if (p1Cards.length) {
    out.push(
      `- ${p1Cards.length} P1 outbox card${
        p1Cards.length === 1 ? "" : "s"
      } — already mirrored into the Approvals queue; act there, not here`
    );
  }
  out.push("");
  out.push(`---`);
  out.push(`_Briefing generated: ${fmt()}_`);
  out.push(``);

  return {
    briefing: out.join("\n"),
    needsCount,
    urgentCount: urgentItems.length,
    decisionCount: decisionItems.length,
    routineCount: routineItems.length,
    topItem,
    systemColor,
    estMin,
  };
}

// ---- queue Telegram ping ----
// The ping leads with what needs Jack and points him at the Approvals queue.
async function queueTelegramPing(briefingPath, summary) {
  const env = await loadEnv();
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!chatId) return false;

  const filename = `${Date.now()}-morning-briefing.json`;
  const filepath = path.join(TG_OUTBOX, filename);

  const { needsCount, urgentCount, topItem, systemColor, estMin } = summary;

  // Lead with the action summary, not empire chatter.
  const lead =
    needsCount === 0
      ? `✅ *Nothing needs you today*`
      : `☀️ *${needsCount} item${needsCount === 1 ? "" : "s"} need you* ` +
        `\\(${urgentCount} urgent\\)`;
  const topLine = topItem
    ? `\n\n🎯 *Start here:* ${escapeMd(topItem.headline)}`
    : "";

  const text =
    `${lead}\n` +
    `${escapeMd(systemColor)} Systems · est ${estMin} min` +
    `${topLine}\n\n` +
    `👉 Act in the Approvals queue: ${escapeMd(ADMIN.inbox)}\n` +
    `📄 [Full briefing](computer://${escapeMd(briefingPath)})`;

  // TODO(telegram-bridge): when the Telegram bridge is back, attach an
  // inline-keyboard `reply_markup` here (and one per actionable item) so Jack
  // can Approve / Dismiss straight from the message via the bot API. Requires
  // the bridge up + inline-keyboard callback handling — out of scope for A3.

  await fs.mkdir(TG_OUTBOX, { recursive: true });
  await fs.writeFile(
    filepath,
    JSON.stringify(
      {
        chat_id: chatId,
        text,
        parse_mode: "MarkdownV2",
        urgency: urgentCount > 0 ? "P0" : "P1",
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

  const summary = await compose();

  // Run the briefing prose through the stop-slop skill bridge before we
  // write or ping. The bridge routes to a deterministic Node port — no API
  // call — so this is safe in autonomous contexts. Failures degrade silently
  // (we use the raw briefing) and we log the strip count either way.
  let slopStripped = 0;
  let slopRules = 0;
  try {
    const result = await invokeSkill("stop-slop", summary.briefing);
    if (result.ok) {
      summary.briefing = result.output;
      slopStripped = result.meta?.totalStripped || 0;
      slopRules = result.meta?.ruleCount || 0;
    }
  } catch (err) {
    console.warn("[morning-briefing] stop-slop bridge failed:", err.message);
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const briefingPath = path.join(FOUNDER, `briefing-${dateStr}.md`);
  await fs.writeFile(briefingPath, summary.briefing, "utf8");
  console.log(
    `[morning-briefing] stop-slop: stripped=${slopStripped} rules=${slopRules}`
  );

  // --dry-run: write the briefing file but never queue a Telegram message.
  const queued = DRY_RUN
    ? false
    : await queueTelegramPing(briefingPath, summary);

  console.log(`[morning-briefing] briefing written: ${briefingPath}`);
  console.log(
    `[morning-briefing] needs_you=${summary.needsCount} ` +
      `urgent=${summary.urgentCount} decisions=${summary.decisionCount} ` +
      `routine=${summary.routineCount} systems=${summary.systemColor} ` +
      `est_min=${summary.estMin}`
  );
  console.log(
    `[morning-briefing] telegram_queued=${queued}${
      DRY_RUN ? " (--dry-run: ping suppressed)" : ""
    }`
  );

  return briefingPath;
}

main().catch((err) => {
  console.error("[morning-briefing] FATAL:", err);
  process.exit(1);
});
