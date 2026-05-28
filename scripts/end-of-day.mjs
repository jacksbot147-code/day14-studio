#!/usr/bin/env node
/**
 * end-of-day.mjs
 *
 * Counterpart to scripts/morning-briefing.mjs. Where the morning briefing
 * leads with what needs Jack TODAY, this script looks BACKWARDS at the day
 * that just ran: per-business reconciliation of what the agents got done,
 * what they drafted, what failed, and what is still pending.
 *
 * Sources (read-only; everything inside the data files is treated as
 * untrusted text and only ever rendered as markdown — never executed):
 *
 *   1. Per-tenant audit logs
 *        ~/Documents/businesses/<slug>/audit-log.jsonl
 *      (the JSONL feed that sync-empire-state's `empire_battle_log` aggregates)
 *      filtered to today's date.
 *
 *   2. Empire-wide battle log (already aggregated)
 *        ~/Documents/studio/public/data/empire-state.json -> empire_battle_log
 *      filtered to today's date. Used as a back-stop for tenants that don't
 *      keep their own audit-log.jsonl.
 *
 *   3. Operator to-dos
 *        ~/Documents/businesses/_shared/operator-todos.json
 *      grouped per tenant; only `status === "open"` items count as pending.
 *
 * Output:
 *   ~/Documents/businesses/_shared/ops/daily/<YYYY-MM-DD>.md
 *
 * Flags:
 *   --dry-run    Print to stdout; write nothing. No side effects.
 *
 * Default behavior writes the markdown file but sends NOTHING — no Telegram,
 * no webhook, no commit. This is intentional: the briefing is a quiet desk
 * report Jack reads in the morning, not a ping that wakes him up.
 *
 * Usage:
 *   node ~/Documents/studio/scripts/end-of-day.mjs
 *   node ~/Documents/studio/scripts/end-of-day.mjs --dry-run
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { invokeSkill } from "./lib/skill-bridge.mjs";

// ---- args ----------------------------------------------------------------
const DRY_RUN =
  process.argv.includes("--dry-run") || process.argv.includes("--no-write");

// ---- paths ---------------------------------------------------------------
const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const BIZ = path.join(HOME, "Documents/businesses");
const DAILY_DIR = path.join(SHARED, "ops/daily");
const OPERATOR_TODOS = path.join(SHARED, "operator-todos.json");
const EMPIRE_STATE = path.join(
  HOME,
  "Documents/studio/public/data/empire-state.json"
);

// ---- helpers -------------------------------------------------------------
async function ls(dir) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function readJsonSafe(p) {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch {
    return null;
  }
}

/** Today as a YYYY-MM-DD string in UTC — audit-log timestamps are ISO UTC. */
function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/**
 * Read a tenant's audit-log.jsonl and return today's entries (any line whose
 * `ts` starts with today's YYYY-MM-DD). Malformed lines are dropped silently.
 */
async function readAuditToday(slug, today) {
  const f = path.join(BIZ, slug, "audit-log.jsonl");
  if (!existsSync(f)) return [];
  let text = "";
  try {
    text = await fs.readFile(f, "utf8");
  } catch {
    return [];
  }
  const out = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let ev;
    try {
      ev = JSON.parse(line);
    } catch {
      continue;
    }
    if (typeof ev?.ts !== "string") continue;
    if (!ev.ts.startsWith(today)) continue;
    out.push(ev);
  }
  return out;
}

/** Open operator to-dos, grouped per tenant slug. */
async function loadOpenTodos() {
  const data = await readJsonSafe(OPERATOR_TODOS);
  if (!data) return new Map();
  const todos = Array.isArray(data) ? data : data.todos || [];
  const byTenant = new Map();
  for (const t of todos) {
    if (!t || t.status !== "open") continue;
    const tenant = String(t.tenant || "empire");
    if (!byTenant.has(tenant)) byTenant.set(tenant, []);
    byTenant.get(tenant).push({
      seq: t.seq,
      title: String(t.title || "(untitled to-do)"),
      category: String(t.category || "task"),
      priority: t.priority === "high" ? "high" : t.priority === "low" ? "low" : "medium",
      createdAt: t.created_at || null,
    });
  }
  return byTenant;
}

/**
 * Read empire-state.json's empire_battle_log filtered to today. This is
 * already aggregated across tenants by sync-empire-state.mjs and is the
 * read-path Day14 uses for /admin/activity, so it's a sanity-check source
 * for tenants whose audit-log.jsonl files aren't present.
 */
async function loadEmpireBattleToday(today) {
  const state = await readJsonSafe(EMPIRE_STATE);
  if (!state) return [];
  const log = Array.isArray(state.empire_battle_log)
    ? state.empire_battle_log
    : [];
  return log.filter(
    (ev) => typeof ev?.ts === "string" && ev.ts.startsWith(today)
  );
}

// ---- classification ------------------------------------------------------
// Bucket each entry into ONE of: failed | drafted | done | other.
// Heuristics are tuned to the action vocabulary used by the existing agents
// (see scripts/_generic/* and src/lib/activity-summary.ts).

const FAILURE_ACTIONS = new Set([
  "fatal_error",
  "error",
  "failed",
  "fail",
  "circuit_breaker_open",
  "circuit_tripped",
  "enrichment_skipped_no_key",
]);

function isFailureEvent(ev) {
  const action = String(ev.action || "");
  if (FAILURE_ACTIONS.has(action)) return true;
  if (/(_error|_failed|_failure)$/.test(action)) return true;
  if (typeof ev.error === "string" && ev.error.trim().length > 0) return true;
  if (Array.isArray(ev.errors) && ev.errors.length > 0) return true;
  if (ev.circuit_tripped === true) return true;
  return false;
}

const DRAFT_ACTION_HINTS = [
  "draft",
  "queued",
  "queue_built",
  "scaffold",
  "pitched",
  "proposed",
  "candidate",
];

function isDraftEvent(ev) {
  const action = String(ev.action || "");
  if (DRAFT_ACTION_HINTS.some((h) => action.includes(h))) return true;
  // scaffolded:N>0 in a cluster_run counts as drafted work.
  if (
    typeof ev.scaffolded === "number" &&
    ev.scaffolded > 0 &&
    !isFailureEvent(ev)
  ) {
    return true;
  }
  return false;
}

/**
 * Plain-English line for one event. Mirrors the spirit of
 * src/lib/activity-summary.ts but lives in this script so we don't pull a
 * TS module from a Node-ESM script. Only known numeric/string keys are
 * interpolated; everything else is dropped.
 */
function summarizeEntry(ev) {
  const actor = String(ev.actor || "agent");
  const action = String(ev.action || "did_something").replace(/[_-]+/g, " ");
  const bits = [];
  for (const key of [
    "added",
    "count",
    "created",
    "scaffolded",
    "processed",
    "updated",
    "fetched",
    "queued",
    "scheduled",
    "ingested",
    "evaluated",
    "scanned",
    "alerted",
    "new_alerts",
    "a_tier",
    "tier_a",
    "hot_leads",
  ]) {
    const v = ev[key];
    if (typeof v === "number" && Number.isFinite(v) && v !== 0) {
      bits.push(`${key.replace(/_/g, " ")}=${v}`);
    }
  }
  const tail = bits.length > 0 ? ` (${bits.slice(0, 3).join(", ")})` : "";
  return `\`${actor}\` ${action}${tail}`;
}

function failureReason(ev) {
  if (typeof ev.error === "string" && ev.error.trim()) return ev.error.trim();
  if (Array.isArray(ev.errors) && ev.errors.length > 0) {
    return ev.errors
      .map((e) => (typeof e === "string" ? e : JSON.stringify(e)))
      .slice(0, 3)
      .join("; ");
  }
  if (ev.circuit_tripped === true) {
    return "circuit breaker tripped";
  }
  return String(ev.action || "unknown failure").replace(/[_-]+/g, " ");
}

// ---- compose -------------------------------------------------------------
async function compose() {
  const today = todayKey();
  const tenants = (await ls(BIZ))
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
    .map((e) => e.name)
    .sort();

  // Operator to-dos (pending work).
  const todosByTenant = await loadOpenTodos();

  // Per-tenant audit events for today.
  const auditByTenant = new Map();
  for (const slug of tenants) {
    auditByTenant.set(slug, await readAuditToday(slug, today));
  }
  // The "empire" pseudo-tenant — operator todos with tenant="day14"/"empire"
  // and any non-tenant todos. We surface them under an "Empire-wide" section.

  // Fallback: empire-state battle log for any today entries whose tenant
  // wasn't covered by a per-tenant audit-log file (e.g. life-loophole sometimes
  // logs through a different path).
  const empireLog = await loadEmpireBattleToday(today);
  for (const ev of empireLog) {
    const slug = String(ev.tenant || "");
    if (!slug) continue;
    if (!auditByTenant.has(slug)) auditByTenant.set(slug, []);
    const list = auditByTenant.get(slug);
    // De-dupe by ts+actor+action — sync-empire-state may have copied the same
    // entry we already read from the per-tenant audit file.
    const seen = list.some(
      (e) => e.ts === ev.ts && e.actor === ev.actor && e.action === ev.action
    );
    if (!seen) list.push(ev);
  }

  // Bucketize per tenant.
  const perTenant = new Map();
  for (const [slug, events] of auditByTenant.entries()) {
    const done = [];
    const drafted = [];
    const failed = [];
    for (const ev of events) {
      if (isFailureEvent(ev)) failed.push(ev);
      else if (isDraftEvent(ev)) drafted.push(ev);
      else done.push(ev);
    }
    perTenant.set(slug, { events, done, drafted, failed });
  }

  // ---- build markdown ---------------------------------------------------
  const out = [];
  out.push(`# End-of-day reconciliation — ${today}`);
  out.push("");
  out.push(
    `Read-only summary of today's empire activity. Built from per-tenant ` +
      `audit logs, the empire battle log, and the operator to-do list. No ` +
      `Telegram ping, no commits — this file is the report.`
  );
  out.push("");

  // ---- top-line numbers --------------------------------------------------
  const totals = { events: 0, done: 0, drafted: 0, failed: 0, pending: 0 };
  for (const slug of perTenant.keys()) {
    const t = perTenant.get(slug);
    totals.events += t.events.length;
    totals.done += t.done.length;
    totals.drafted += t.drafted.length;
    totals.failed += t.failed.length;
  }
  for (const list of todosByTenant.values()) totals.pending += list.length;

  out.push(`## At a glance`);
  out.push(`- Tenants tracked: **${perTenant.size}**`);
  out.push(`- Events today: **${totals.events}**`);
  out.push(
    `- Done: **${totals.done}** · Drafted: **${totals.drafted}** · Failed: **${totals.failed}**`
  );
  out.push(`- Open operator to-dos: **${totals.pending}**`);
  out.push("");

  // ---- per-business sections --------------------------------------------
  // Sorted by activity volume so the busy businesses lead.
  const orderedTenants = [...perTenant.entries()]
    .filter(
      ([slug, t]) =>
        t.events.length > 0 ||
        (todosByTenant.get(slug) && todosByTenant.get(slug).length > 0)
    )
    .sort((a, b) => b[1].events.length - a[1].events.length)
    .map(([slug]) => slug);

  // Silent tenants — no events AND no pending todos — listed at the bottom.
  const silentTenants = [...perTenant.keys()]
    .filter((slug) => !orderedTenants.includes(slug))
    .sort();

  for (const slug of orderedTenants) {
    const { events, done, drafted, failed } = perTenant.get(slug);
    const pending = todosByTenant.get(slug) || [];

    out.push(`## ${slug}`);
    out.push(
      `_${events.length} events · ${done.length} done · ${drafted.length} drafted · ${failed.length} failed · ${pending.length} pending_`
    );
    out.push("");

    // Done — collapse to top actors so we don't drown the reader in
    // repetitive per-cycle entries.
    if (done.length > 0) {
      const byActor = new Map();
      for (const ev of done) {
        const k = String(ev.actor || "?");
        byActor.set(k, (byActor.get(k) || 0) + 1);
      }
      const topActors = [...byActor.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
      out.push(`### ✅ Done (${done.length})`);
      for (const [actor, count] of topActors) {
        // Find the most-recent successful entry for this actor so we can
        // surface a representative line with real numbers.
        const sample = [...done]
          .reverse()
          .find((e) => String(e.actor) === actor);
        if (sample) {
          out.push(`- ${summarizeEntry(sample)} — **${count}×** today`);
        } else {
          out.push(`- \`${actor}\` — ${count}× today`);
        }
      }
      if (byActor.size > topActors.length) {
        out.push(
          `- …plus ${byActor.size - topActors.length} more actor${
            byActor.size - topActors.length === 1 ? "" : "s"
          }.`
        );
      }
      out.push("");
    }

    // Drafted — itemise; these tend to be lower-volume than "done".
    if (drafted.length > 0) {
      out.push(`### 📝 Drafted (${drafted.length})`);
      for (const ev of drafted.slice(0, 10)) {
        out.push(`- ${summarizeEntry(ev)}`);
      }
      if (drafted.length > 10) {
        out.push(`- …and ${drafted.length - 10} more drafts.`);
      }
      out.push("");
    }

    // Failed — itemise EVERY one; failures are the reason this report exists.
    if (failed.length > 0) {
      // Collapse identical (actor + action + first reason) failures so a
      // poller that flapped 30 times shows up as one line with a count.
      const groups = new Map();
      for (const ev of failed) {
        const key = `${ev.actor}|${ev.action}|${failureReason(ev).slice(0, 80)}`;
        if (!groups.has(key)) groups.set(key, { ev, count: 0 });
        groups.get(key).count += 1;
      }
      out.push(`### 🔴 Failed (${failed.length})`);
      for (const { ev, count } of groups.values()) {
        const reason = failureReason(ev);
        const tag = count > 1 ? ` _(×${count})_` : "";
        out.push(
          `- \`${ev.actor}\` · ${String(ev.action).replace(/[_-]+/g, " ")}${tag} — ${reason}`
        );
      }
      out.push("");
    }

    // Pending — open operator to-dos for this tenant.
    if (pending.length > 0) {
      out.push(`### ⏳ Pending — needs you (${pending.length})`);
      for (const t of pending) {
        const seqTag = t.seq ? `#${t.seq} ` : "";
        const prio = t.priority === "high" ? " 🔴" : t.priority === "low" ? "" : " 🟡";
        out.push(`- ${seqTag}**${t.title}**${prio} _(${t.category})_`);
      }
      out.push("");
    }
  }

  // Empire-wide pending todos (tenant === "day14" / "empire" / unknown).
  const empirePending = [];
  for (const [tenant, list] of todosByTenant.entries()) {
    if (!perTenant.has(tenant)) {
      for (const t of list) empirePending.push({ ...t, tenant });
    }
  }
  if (empirePending.length > 0) {
    out.push(`## Empire-wide — needs you (${empirePending.length})`);
    out.push(
      `Operator to-dos not tied to a tenant directory (or tied to a tenant ` +
        `without an audit log yet).`
    );
    out.push("");
    for (const t of empirePending) {
      const seqTag = t.seq ? `#${t.seq} ` : "";
      const prio = t.priority === "high" ? " 🔴" : t.priority === "low" ? "" : " 🟡";
      out.push(
        `- ${seqTag}[${t.tenant}] **${t.title}**${prio} _(${t.category})_`
      );
    }
    out.push("");
  }

  if (silentTenants.length > 0) {
    out.push(`## Silent today`);
    out.push(
      `No audit events and no open to-dos for: ${silentTenants
        .map((s) => `\`${s}\``)
        .join(", ")}.`
    );
    out.push("");
  }

  out.push(`---`);
  out.push(`_End-of-day report generated: ${new Date().toISOString()}_`);
  out.push("");

  return {
    markdown: out.join("\n"),
    today,
    totals,
    tenantsActive: orderedTenants.length,
  };
}

// ---- main ----------------------------------------------------------------
async function main() {
  const composed = await compose();
  const { today, totals, tenantsActive } = composed;
  let { markdown } = composed;
  const outPath = path.join(DAILY_DIR, `${today}.md`);

  // Run the report prose through the stop-slop skill bridge before we write
  // or print. Deterministic Node port — no API call. Failures degrade to the
  // unfiltered report; either way we log the strip count for the heartbeat.
  let slopStripped = 0;
  let slopRules = 0;
  try {
    const result = await invokeSkill("stop-slop", markdown);
    if (result.ok) {
      markdown = result.output;
      slopStripped = result.meta?.totalStripped || 0;
      slopRules = result.meta?.ruleCount || 0;
    }
  } catch (err) {
    console.warn("[end-of-day] stop-slop bridge failed:", err.message);
  }
  console.log(
    `[end-of-day] stop-slop: stripped=${slopStripped} rules=${slopRules}`
  );

  if (DRY_RUN) {
    console.log(`[end-of-day] DRY RUN — would write ${outPath}`);
    console.log(
      `[end-of-day] tenants_active=${tenantsActive} events=${totals.events} ` +
        `done=${totals.done} drafted=${totals.drafted} failed=${totals.failed} ` +
        `pending=${totals.pending}`
    );
    process.stdout.write("\n----- BEGIN report -----\n");
    process.stdout.write(markdown);
    process.stdout.write("----- END report -----\n");
    return;
  }

  await fs.mkdir(DAILY_DIR, { recursive: true });
  await fs.writeFile(outPath, markdown, "utf8");

  console.log(`[end-of-day] wrote ${outPath}`);
  console.log(
    `[end-of-day] tenants_active=${tenantsActive} events=${totals.events} ` +
      `done=${totals.done} drafted=${totals.drafted} failed=${totals.failed} ` +
      `pending=${totals.pending}`
  );
  // Default: send NOTHING. No Telegram, no webhook, no commit. The report
  // is the artefact.
}

main().catch((err) => {
  console.error("[end-of-day] FATAL:", err);
  process.exit(1);
});
