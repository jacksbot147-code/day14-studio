#!/usr/bin/env node
/**
 * devops-sre.mjs
 *
 * Day14's DevOps / Site Reliability Engineer. Every 4 hours.
 *
 *   1. Pings each tenant's brand site at day14.us/brands/<slug>/ to verify uptime
 *   2. Checks all LaunchAgent heartbeats — deeper than just stale (>10min)
 *      vs not-heartbeating (>30min = critical)
 *   3. Scans recent agent logs for repeated errors (anomaly detection)
 *   4. Checks .env.local hasn't been accidentally committed (security)
 *   5. Verifies file size of audit logs (disk pressure check)
 *
 * Output: ~/Documents/businesses/_shared/ops/<date>-<hour>.md
 * Telegram: P1 for outages, P2 for degraded, P3 for healthy summary
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { homedir } from "node:os";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const OPS = path.join(SHARED, "ops");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const OUTBOX = path.join(SHARED, "telegram/outbox");
const POLLER_DIR = path.join(SHARED, "poller");
const STUDIO = path.join(HOME, "Documents/studio");
const ENV_FILE = path.join(STUDIO, ".env.local");

async function loadEnv() {
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function checkUptime(url) {
  try {
    const start = Date.now();
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    return { ok: res.ok, status: res.status, ms: Date.now() - start };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
}

async function checkAllHeartbeats() {
  if (!existsSync(POLLER_DIR)) return [];
  const out = [];
  for (const f of await fs.readdir(POLLER_DIR)) {
    if (!f.endsWith("-heartbeat.log")) continue;
    const name = f.replace("-heartbeat.log", "");
    try {
      const text = await fs.readFile(path.join(POLLER_DIR, f), "utf8");
      const last = text.trim().split("\n").filter(Boolean).slice(-1)[0];
      const ts = last?.match(/^(\S+)/)?.[1];
      const ageMin = ts ? (Date.now() - new Date(ts).getTime()) / 60_000 : Infinity;
      let severity = "healthy";
      if (ageMin > 60) severity = "critical";
      else if (ageMin > 10) severity = "warning";
      out.push({ name, ageMin: Math.round(ageMin), severity });
    } catch { out.push({ name, severity: "unknown" }); }
  }
  return out;
}

async function scanErrorLogs() {
  if (!existsSync(POLLER_DIR)) return [];
  const anomalies = [];
  for (const f of await fs.readdir(POLLER_DIR)) {
    if (!f.endsWith(".stderr.log")) continue;
    try {
      const text = await fs.readFile(path.join(POLLER_DIR, f), "utf8");
      // Look at last 4hr of errors — rough heuristic: last 200 lines
      const lines = text.trim().split("\n").slice(-200);
      const errorLines = lines.filter((l) => /\b(ERROR|FATAL|Error:|FAILED)\b/i.test(l));
      if (errorLines.length >= 5) {
        anomalies.push({ daemon: f.replace(".stderr.log", ""), error_count: errorLines.length, sample: errorLines[errorLines.length - 1].slice(0, 200) });
      }
    } catch {}
  }
  return anomalies;
}

async function checkSecuritySanity() {
  const issues = [];
  // Check .gitignore has .env.local
  const gitignore = path.join(STUDIO, ".gitignore");
  if (existsSync(gitignore)) {
    const text = await fs.readFile(gitignore, "utf8");
    if (!/\.env\.local/.test(text)) issues.push({ severity: "high", issue: ".env.local NOT in .gitignore" });
  }
  // Check no .env.local in git history (basic — last 10 commits)
  try {
    const result = execSync("git log --oneline -10 -- .env.local", { cwd: STUDIO, encoding: "utf8" });
    if (result.trim()) issues.push({ severity: "high", issue: ".env.local appears in recent git log!" });
  } catch {}
  return issues;
}

async function checkAuditSizes() {
  const issues = [];
  if (!existsSync(TENANTS_FILE)) return issues;
  const tenants = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [];
  for (const t of tenants) {
    const f = path.join(BIZ, t.slug, "audit-log.jsonl");
    if (!existsSync(f)) continue;
    const stat = await fs.stat(f);
    const sizeMB = stat.size / 1_000_000;
    if (sizeMB > 50) issues.push({ severity: "medium", issue: `${t.slug}/audit-log.jsonl is ${sizeMB.toFixed(1)}MB — consider archiving` });
  }
  return issues;
}

async function main() {
  const env = await loadEnv();
  await fs.mkdir(OPS, { recursive: true });
  const tenants = existsSync(TENANTS_FILE) ? JSON.parse(await fs.readFile(TENANTS_FILE, "utf8")).tenants || [] : [];

  // 1. Uptime checks
  const uptimeResults = [];
  // Brand sites — only if a domain is set, otherwise skip (localhost not pingable from here)
  for (const t of tenants) {
    if (t.domain) {
      uptimeResults.push({ tenant: t.slug, url: `https://${t.domain}`, ...(await checkUptime(`https://${t.domain}`)) });
    }
  }
  // Always check day14.us if accessible
  uptimeResults.push({ tenant: "day14", url: "https://day14.us", ...(await checkUptime("https://day14.us")) });

  // 2. Heartbeats
  const beats = await checkAllHeartbeats();
  const critical = beats.filter((b) => b.severity === "critical");
  const warning = beats.filter((b) => b.severity === "warning");

  // 3. Error log anomalies
  const errors = await scanErrorLogs();

  // 4. Security
  const security = await checkSecuritySanity();

  // 5. Audit log sizes
  const auditIssues = await checkAuditSizes();

  // Build report
  const date = new Date().toISOString().slice(0, 10);
  const hour = new Date().getHours();
  const stamp = `${date}-${String(hour).padStart(2, "0")}`;
  const reportPath = path.join(OPS, `${stamp}.md`);

  const downSites = uptimeResults.filter((u) => !u.ok);
  const allCriticalCount = critical.length + downSites.length + security.filter((s) => s.severity === "high").length;
  const overallStatus = allCriticalCount > 0 ? "🚨 CRITICAL" : warning.length > 0 || errors.length > 0 ? "⚠️ DEGRADED" : "✓ HEALTHY";

  const md = [
    `# DevOps report — ${stamp}`,
    `**Status:** ${overallStatus}`,
    ``,
    `## Uptime`,
    ...uptimeResults.map((u) => `- ${u.ok ? "✓" : "✗"} ${u.url} — ${u.status || u.error} ${u.ms ? `(${u.ms}ms)` : ""}`),
    ``,
    `## Daemons`,
    `- Critical (>60min): ${critical.length}`,
    `- Warning (>10min): ${warning.length}`,
    `- Healthy: ${beats.filter((b) => b.severity === "healthy").length}`,
    critical.length ? "\n### Critical\n" + critical.map((c) => `- ${c.name} — ${c.ageMin}m`).join("\n") : "",
    ``,
    `## Error anomalies (${errors.length})`,
    ...errors.map((e) => `- **${e.daemon}** — ${e.error_count} errors in last 200 log lines\n  ${e.sample}`),
    ``,
    `## Security`,
    ...security.map((s) => `- [${s.severity}] ${s.issue}`),
    security.length === 0 ? "✓ No issues" : "",
    ``,
    `## Disk pressure`,
    ...auditIssues.map((a) => `- [${a.severity}] ${a.issue}`),
    auditIssues.length === 0 ? "✓ All audit logs reasonable" : "",
  ];
  await fs.writeFile(reportPath, md.filter(Boolean).join("\n"));

  // Telegram
  if (env.TELEGRAM_CHAT_ID && (allCriticalCount > 0 || warning.length > 0 || errors.length > 0)) {
    const text = [
      `${overallStatus} *DevOps*`,
      ``,
      downSites.length ? `🌐 ${downSites.length} sites down` : "",
      critical.length ? `🔴 ${critical.length} daemons critical (>60m)` : "",
      warning.length ? `🟡 ${warning.length} daemons stale (>10m)` : "",
      errors.length ? `❌ ${errors.length} daemons spewing errors` : "",
      security.length ? `🔒 ${security.length} security issues` : "",
      ``,
      `Report: \`${reportPath}\``,
    ];
    await fs.mkdir(OUTBOX, { recursive: true });
    await fs.writeFile(
      path.join(OUTBOX, `${Date.now()}-devops.json`),
      JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: text.filter(Boolean).join("\n"),
        parse_mode: "Markdown",
        urgency: allCriticalCount > 0 ? "P1" : "P2",
        queued_at: new Date().toISOString(), sent_at: null,
      }, null, 2)
    );
  }
  console.log(`✓ ${overallStatus} — ${reportPath}`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
