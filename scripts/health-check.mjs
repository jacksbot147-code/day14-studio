#!/usr/bin/env node
/**
 * health-check.mjs
 *
 * Comprehensive empire health check. Returns structured JSON.
 * Used by:
 *   - /health Telegram command
 *   - /admin/health page (via API route)
 *   - Manual debugging
 *
 * CLI:
 *   node health-check.mjs              # plain text report to stdout
 *   node health-check.mjs --json       # machine-readable
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { homedir } from "node:os";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const BIZ = path.join(HOME, "Documents/businesses");
const POLLER_DIR = path.join(SHARED, "poller");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const STUDIO = path.join(HOME, "Documents/studio");

async function check() {
  const report = { generated_at: new Date().toISOString(), checks: {}, overall: "healthy" };

  // 1. Heartbeats
  const beats = [];
  if (existsSync(POLLER_DIR)) {
    for (const f of await fs.readdir(POLLER_DIR)) {
      if (!f.endsWith("-heartbeat.log")) continue;
      const name = f.replace("-heartbeat.log", "");
      try {
        const text = await fs.readFile(path.join(POLLER_DIR, f), "utf8");
        const last = text.trim().split("\n").filter(Boolean).slice(-1)[0];
        // Match an ISO-8601 timestamp anywhere on the line — heartbeat logs
        // use either a bare leading timestamp or a JSON {"ts":...} object.
        const ts = last?.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d\d:?\d\d)?/)?.[0];
        const ageMin = ts ? Math.round((Date.now() - new Date(ts).getTime()) / 60_000) : null;
        beats.push({ name, age_min: ageMin, status: ageMin === null ? "unknown" : ageMin < 10 ? "healthy" : ageMin < 60 ? "stale" : "critical" });
      } catch {}
    }
  }
  const critical = beats.filter((b) => b.status === "critical");
  const stale = beats.filter((b) => b.status === "stale");
  report.checks.daemons = { total: beats.length, healthy: beats.filter((b) => b.status === "healthy").length, stale: stale.length, critical: critical.length, stale_names: stale.map((b) => b.name), critical_names: critical.map((b) => b.name) };

  // 2. Outbox
  let outboxTotal = 0, outboxUnsent = 0, outboxStuck = 0, outboxDead = 0;
  if (existsSync(OUTBOX)) {
    for (const f of await fs.readdir(OUTBOX)) {
      if (!f.endsWith(".json")) continue;
      outboxTotal += 1;
      try {
        const data = JSON.parse(await fs.readFile(path.join(OUTBOX, f), "utf8"));
        if (!data.sent_at) {
          outboxUnsent += 1;
          const ageH = (Date.now() - new Date(data.queued_at || 0).getTime()) / 3_600_000;
          if (ageH > 1) outboxStuck += 1;
        }
      } catch {}
    }
    const deadDir = path.join(OUTBOX, "_dead");
    if (existsSync(deadDir)) outboxDead = (await fs.readdir(deadDir)).filter((f) => f.endsWith(".json")).length;
  }
  report.checks.outbox = { total: outboxTotal, unsent: outboxUnsent, stuck: outboxStuck, dead: outboxDead };

  // 3. Tenants
  let tenants = [];
  if (existsSync(TENANTS_FILE)) {
    tenants = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];
  }
  report.checks.tenants = { count: tenants.length, missing_stage: tenants.filter((t) => !t.stage || t.stage === "?").length };

  // 4. Recent agent activity (last hour)
  let recentActivity = 0;
  const cutoff = Date.now() - 3_600_000;
  for (const t of tenants) {
    const f = path.join(BIZ, t.slug, "audit-log.jsonl");
    if (!existsSync(f)) continue;
    const text = await fs.readFile(f, "utf8");
    for (const line of text.trim().split("\n").filter(Boolean).slice(-50)) {
      try {
        const ev = JSON.parse(line);
        if (new Date(ev.ts).getTime() > cutoff) recentActivity += 1;
      } catch {}
    }
  }
  report.checks.activity = { events_last_hour: recentActivity };

  // 5. Stderr log scan for recent errors
  const recentErrors = [];
  if (existsSync(POLLER_DIR)) {
    for (const f of await fs.readdir(POLLER_DIR)) {
      if (!f.endsWith(".stderr.log")) continue;
      try {
        const stat = await fs.stat(path.join(POLLER_DIR, f));
        if (stat.size > 100 && Date.now() - stat.mtime.getTime() < 3_600_000) {
          const text = await fs.readFile(path.join(POLLER_DIR, f), "utf8");
          const errLines = text.trim().split("\n").slice(-30).filter((l) => /\b(error|fatal|fail)\b/i.test(l));
          if (errLines.length > 0) recentErrors.push({ daemon: f.replace(".stderr.log", ""), count: errLines.length, last: errLines[errLines.length - 1].slice(0, 200) });
        }
      } catch {}
    }
  }
  report.checks.recent_errors = recentErrors;

  // 6. Git state
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: STUDIO, encoding: "utf8" }).trim();
    const uncommitted = execSync("git status --porcelain", { cwd: STUDIO, encoding: "utf8" }).trim().split("\n").filter(Boolean).length;
    const unpushed = parseInt(execSync("git log @{u}..HEAD --oneline 2>/dev/null | wc -l", { cwd: STUDIO, encoding: "utf8" }).trim() || "0", 10);
    report.checks.git = { branch, uncommitted, unpushed };
  } catch (e) {
    report.checks.git = { error: e.message.slice(0, 100) };
  }

  // Overall
  if (critical.length > 0 || outboxDead > 5) report.overall = "critical";
  else if (stale.length > 0 || outboxStuck > 5 || recentErrors.length > 0) report.overall = "degraded";
  else if (recentActivity === 0) report.overall = "quiet";

  return report;
}

async function main() {
  const r = await check();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(r, null, 2));
    return;
  }
  const icon = r.overall === "healthy" ? "✅" : r.overall === "quiet" ? "💤" : r.overall === "degraded" ? "⚠️" : "🚨";
  console.log(`${icon} Day14 health: ${r.overall.toUpperCase()}`);
  console.log("");
  console.log(`Daemons: ${r.checks.daemons.healthy}/${r.checks.daemons.total} healthy · ${r.checks.daemons.stale} stale · ${r.checks.daemons.critical} critical`);
  if (r.checks.daemons.stale_names.length) console.log(`  stale: ${r.checks.daemons.stale_names.join(", ")}`);
  if (r.checks.daemons.critical_names.length) console.log(`  critical: ${r.checks.daemons.critical_names.join(", ")}`);
  console.log(`Outbox: ${r.checks.outbox.unsent} unsent · ${r.checks.outbox.stuck} stuck >1h · ${r.checks.outbox.dead} dead-lettered`);
  console.log(`Tenants: ${r.checks.tenants.count} (${r.checks.tenants.missing_stage} missing stage)`);
  console.log(`Activity: ${r.checks.activity.events_last_hour} events in last hour`);
  if (r.checks.recent_errors.length) {
    console.log(`Recent errors:`);
    for (const e of r.checks.recent_errors) console.log(`  ${e.daemon} — ${e.count} errors, last: ${e.last}`);
  }
  if (r.checks.git) {
    console.log(`Git: ${r.checks.git.branch} · ${r.checks.git.uncommitted} uncommitted · ${r.checks.git.unpushed} unpushed`);
  }
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
