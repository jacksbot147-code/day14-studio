/**
 * daily-eod — hand-coded impl.
 *
 * The 5 PM end-of-day report. Honest accounting: what shipped,
 * what slipped, what's blocking tomorrow.
 *
 * Spec: docs/seeds/skills/daily-eod/SKILL.md
 *
 * Inputs (read in order):
 *   1. docs/overnight/kickoff-YYYY-MM-DD.md  → what was planned today
 *   2. docs/overnight/MASTER_LOG.md          → completions logged
 *   3. File mtimes under studio/ + businesses/ in last ~8h
 *   4. git log since 9am today (if git available)
 *   5. _shared/growth/work-register.jsonl    → today's invocations
 *
 * Output: docs/overnight/eod-YYYY-MM-DD.md  — concise, ~50 lines.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

const execFileP = promisify(execFile);

const HOME = homedir();
const STUDIO = path.join(HOME, "Documents/studio");
const OVERNIGHT = path.join(STUDIO, "docs/overnight");
const BUSINESSES = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BUSINESSES, "_shared");
const REGISTER = path.join(SHARED, "growth/work-register.jsonl");
const OUTBOX = path.join(SHARED, "telegram/outbox");

const WINDOW_HOURS = 8;
const MAX_BLOCKERS = 3;
const MAX_SHIPPED_BULLETS = 8;

interface PlannedItem {
  raw: string;
  isPriorityOne: boolean;
}

interface EODInputs {
  date: string; // YYYY-MM-DD
  kickoffPath: string | null;
  plannedItems: PlannedItem[];
  masterLogEntriesToday: string[];
  recentFileChanges: string[];
  gitCommits: string[];
  registerCountToday: number;
  registerSkillsToday: Map<string, number>;
}

interface EODReport {
  date: string;
  shipped: string[];
  slipped: Array<{ item: string; reason: string }>;
  blockers: Array<{ item: string; unblock: string }>;
  tomorrowFirst: string;
  confidence: number;
  confidenceReason: string;
}

function todayDateString(date = new Date()): string {
  // America/New_York for consistency with the kickoff convention.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date); // YYYY-MM-DD
}

async function readMaybe(p: string): Promise<string | null> {
  if (!existsSync(p)) return null;
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

function parsePlanned(kickoffText: string | null): PlannedItem[] {
  if (!kickoffText) return [];
  const items: PlannedItem[] = [];
  let inPlanSection = false;
  let seenFirstItem = false;
  for (const line of kickoffText.split("\n")) {
    if (/^#+\s*(today's\s*plan|today|priorities|focus)\b/i.test(line)) {
      inPlanSection = true;
      continue;
    }
    if (inPlanSection && /^#+\s/.test(line)) {
      inPlanSection = false;
      continue;
    }
    if (!inPlanSection) continue;
    const m = line.match(/^\s*(?:[-*]|\d+\.)\s+(.+?)\s*$/);
    if (m && m[1]) {
      const raw = m[1].replace(/^\[[ x]\]\s*/i, "").trim();
      if (!raw) continue;
      items.push({ raw, isPriorityOne: !seenFirstItem });
      seenFirstItem = true;
    }
  }
  return items;
}

function masterLogTodayEntries(masterLog: string | null, date: string): string[] {
  if (!masterLog) return [];
  const entries: string[] = [];
  for (const line of masterLog.split("\n")) {
    if (line.includes(date)) {
      const trimmed = line.replace(/^[-*]\s*/, "").trim();
      if (trimmed) entries.push(trimmed);
    }
  }
  return entries.slice(0, 20);
}

async function recentFileChanges(): Promise<string[]> {
  const since = Date.now() - WINDOW_HOURS * 3600 * 1000;
  const results: string[] = [];
  const roots = [STUDIO, BUSINESSES];
  const SKIP = new Set([
    "node_modules",
    ".next",
    ".git",
    ".turbo",
    "dist",
    "build",
    ".DS_Store",
  ]);

  async function walk(dir: string, depth = 0) {
    if (depth > 5 || results.length >= 200) return;
    let entries: import("node:fs").Dirent[] = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (SKIP.has(e.name) || e.name.startsWith(".")) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full, depth + 1);
      } else if (e.isFile()) {
        try {
          const st = await fs.stat(full);
          if (st.mtimeMs >= since) results.push(full);
        } catch {
          // skip
        }
      }
    }
  }

  for (const r of roots) {
    if (existsSync(r)) await walk(r);
  }
  return results;
}

async function gitCommitsToday(): Promise<string[]> {
  try {
    const { stdout } = await execFileP(
      "git",
      ["log", "--since=9am", "--pretty=format:%h %s", "--no-merges"],
      { cwd: STUDIO, timeout: 5000 }
    );
    return stdout.split("\n").filter(Boolean).slice(0, 15);
  } catch {
    return [];
  }
}

async function registerToday(): Promise<{
  total: number;
  bySkill: Map<string, number>;
}> {
  const bySkill = new Map<string, number>();
  if (!existsSync(REGISTER)) return { total: 0, bySkill };
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const cutoff = today0.getTime();
  let total = 0;
  const text = await fs.readFile(REGISTER, "utf8");
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as {
        timestamp?: string;
        invoked_skill?: string;
      };
      const ts = e.timestamp ? new Date(e.timestamp).getTime() : 0;
      if (ts < cutoff) continue;
      total += 1;
      const s = e.invoked_skill ?? "ad-hoc";
      bySkill.set(s, (bySkill.get(s) ?? 0) + 1);
    } catch {
      // skip
    }
  }
  return { total, bySkill };
}

export async function gatherInputs(date = todayDateString()): Promise<EODInputs> {
  const kickoffPath = path.join(OVERNIGHT, `kickoff-${date}.md`);
  const masterPath = path.join(OVERNIGHT, "MASTER_LOG.md");
  const [kickoffText, masterText, fileChanges, commits, register] = await Promise.all([
    readMaybe(kickoffPath),
    readMaybe(masterPath),
    recentFileChanges(),
    gitCommitsToday(),
    registerToday(),
  ]);

  return {
    date,
    kickoffPath: existsSync(kickoffPath) ? kickoffPath : null,
    plannedItems: parsePlanned(kickoffText),
    masterLogEntriesToday: masterLogTodayEntries(masterText, date),
    recentFileChanges: fileChanges,
    gitCommits: commits,
    registerCountToday: register.total,
    registerSkillsToday: register.bySkill,
  };
}

/** Bucket touched files into "feature areas" we can report as shipped lines. */
function buildShippedBullets(inputs: EODInputs): string[] {
  const bullets: string[] = [];
  // Git commits are the strongest signal — they're durably committed.
  for (const c of inputs.gitCommits.slice(0, 5)) {
    bullets.push(`commit \`${c}\``);
  }
  // Master-log entries that already say a thing shipped.
  for (const e of inputs.masterLogEntriesToday.slice(0, 5)) {
    bullets.push(e);
  }
  // Skill-coverage rolled up.
  if (inputs.registerCountToday > 0) {
    const topSkills = [...inputs.registerSkillsToday.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s, n]) => `${s}×${n}`);
    bullets.push(
      `${inputs.registerCountToday} skill invocations${
        topSkills.length ? ` (${topSkills.join(", ")})` : ""
      }`
    );
  }
  // Touched files: group by top-level area, only mention areas not already
  // covered above to avoid double-counting.
  const areas = new Map<string, number>();
  for (const f of inputs.recentFileChanges) {
    const rel = f.replace(HOME + "/", "");
    const parts = rel.split("/");
    // Documents/{studio|businesses}/{area}/...
    const area = parts.slice(0, 4).join("/");
    areas.set(area, (areas.get(area) ?? 0) + 1);
  }
  for (const [area, n] of [...areas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)) {
    bullets.push(`${n} files touched under \`${area}\``);
  }
  return bullets.slice(0, MAX_SHIPPED_BULLETS);
}

function buildSlipped(
  inputs: EODInputs,
  shipped: string[]
): Array<{ item: string; reason: string }> {
  if (inputs.plannedItems.length === 0) return [];
  const shippedHay = shipped.join("\n").toLowerCase();
  const slipped: Array<{ item: string; reason: string }> = [];
  for (const item of inputs.plannedItems) {
    // Crude match: any 5+ char word from the planned item present in shipped lines?
    const words = item.raw
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 5);
    const matched = words.some((w) => shippedHay.includes(w));
    if (!matched) {
      slipped.push({
        item: item.raw,
        reason: item.isPriorityOne ? "TODAY'S #1 PRIORITY DID NOT SHIP" : "no matching activity in today's log",
      });
    }
  }
  return slipped.slice(0, 5);
}

function deriveBlockers(
  slipped: Array<{ item: string; reason: string }>,
  inputs: EODInputs
): Array<{ item: string; unblock: string }> {
  const blockers: Array<{ item: string; unblock: string }> = [];
  // First blocker is whatever was today's #1 if it slipped.
  const p1 = slipped.find((s) => /#1 PRIORITY/.test(s.reason));
  if (p1) {
    blockers.push({
      item: p1.item,
      unblock: "Move to tomorrow's kickoff as #1; identify what stopped it.",
    });
  }
  // If we had zero shipping signal, that itself is a blocker.
  if (inputs.gitCommits.length === 0 && inputs.masterLogEntriesToday.length === 0) {
    blockers.push({
      item: "No commits and no master-log entries today",
      unblock: "Reinstate the 'log one ship per day' rule; check if pollers are alive.",
    });
  }
  // If register is empty too → the bot loop is silent.
  if (inputs.registerCountToday === 0) {
    blockers.push({
      item: "Zero skill invocations registered today",
      unblock: "Check growth-watcher and telegram-poller heartbeats; reboot if dead.",
    });
  }
  return blockers.slice(0, MAX_BLOCKERS);
}

function pickTomorrowFirst(
  blockers: Array<{ item: string; unblock: string }>,
  slipped: Array<{ item: string; reason: string }>,
  inputs: EODInputs
): string {
  if (blockers[0]) return blockers[0].unblock;
  if (slipped[0]) return `Pick back up: ${slipped[0].item}`;
  if (inputs.plannedItems[0]) return `Continue: ${inputs.plannedItems[0].raw}`;
  return "Write tomorrow's kickoff with one specific, shippable thing.";
}

function scoreConfidence(
  inputs: EODInputs,
  shipped: string[],
  slipped: Array<{ item: string; reason: string }>
): { score: number; reason: string } {
  const planned = inputs.plannedItems.length;
  const shippedCount = shipped.length;
  const slippedP1 = slipped.find((s) => /#1 PRIORITY/.test(s.reason));

  if (planned === 0 && shippedCount === 0) {
    return {
      score: 0.5,
      reason: "no kickoff today and nothing visibly shipped — can't score",
    };
  }
  if (slippedP1 && shippedCount === 0) {
    return {
      score: 0.35,
      reason: "0-ship day AND today's #1 slipped — structural problem",
    };
  }
  if (slippedP1) {
    return {
      score: 0.6,
      reason: "today's #1 priority slipped but other work landed",
    };
  }
  if (planned > 0 && slipped.length / planned > 0.5) {
    return {
      score: 0.55,
      reason: ">50% of planned items have no shipping signal",
    };
  }
  if (shippedCount > 0 && slipped.length === 0) {
    return { score: 0.92, reason: "everything planned shows up in shipped signals" };
  }
  return { score: 0.78, reason: "minor slip but the week's plan is recoverable" };
}

export function composeReport(inputs: EODInputs): EODReport {
  const shipped = buildShippedBullets(inputs);
  const slipped = buildSlipped(inputs, shipped);
  const blockers = deriveBlockers(slipped, inputs);
  const tomorrowFirst = pickTomorrowFirst(blockers, slipped, inputs);
  const { score, reason } = scoreConfidence(inputs, shipped, slipped);

  return {
    date: inputs.date,
    shipped: shipped.length > 0 ? shipped : ["(nothing visibly shipped today)"],
    slipped,
    blockers,
    tomorrowFirst,
    confidence: score,
    confidenceReason: reason,
  };
}

export function renderMarkdown(report: EODReport): string {
  const lines: string[] = [];
  lines.push(`# End-of-day — ${report.date}`);
  lines.push("");
  lines.push(`## What shipped today`);
  for (const s of report.shipped) lines.push(`- ${s}`);
  lines.push("");
  lines.push(`## What was planned but didn't ship`);
  if (report.slipped.length === 0) {
    lines.push(`- (nothing — clean day)`);
  } else {
    for (const s of report.slipped) lines.push(`- **${s.item}** — ${s.reason}`);
  }
  lines.push("");
  lines.push(`## Blockers for tomorrow`);
  if (report.blockers.length === 0) {
    lines.push(`- (none)`);
  } else {
    for (const b of report.blockers) lines.push(`- **${b.item}** → ${b.unblock}`);
  }
  lines.push("");
  lines.push(`## Tomorrow's first action`);
  lines.push(report.tomorrowFirst);
  lines.push("");
  lines.push(`## Confidence in this week's plan`);
  lines.push(`${report.confidence.toFixed(2)} — ${report.confidenceReason}`);
  lines.push("");
  return lines.join("\n");
}

async function queueTelegramSummary(report: EODReport): Promise<string | null> {
  // Read TELEGRAM_CHAT_ID from .env.local.
  const envPath = path.join(STUDIO, ".env.local");
  if (!existsSync(envPath)) return null;
  const envText = await fs.readFile(envPath, "utf8");
  const chatMatch = envText.match(/^\s*TELEGRAM_CHAT_ID\s*=\s*"?([^"\n\r]+)"?/m);
  const chatId = chatMatch?.[1];
  if (!chatId) return null;

  await fs.mkdir(OUTBOX, { recursive: true });
  const summary = [
    `🌙 *EOD ${report.date}*`,
    "",
    `Shipped: ${report.shipped.length} ${report.shipped.length === 1 && report.shipped[0]?.startsWith("(nothing") ? "(zero-ship day)" : "items"}`,
    `Slipped: ${report.slipped.length}`,
    `Blockers: ${report.blockers.length}`,
    `Confidence: ${report.confidence.toFixed(2)}`,
    "",
    `Tomorrow first: ${report.tomorrowFirst}`,
  ].join("\n");

  const filename = `${Date.now()}-daily-eod.json`;
  const filepath = path.join(OUTBOX, filename);
  await fs.writeFile(
    filepath,
    JSON.stringify(
      {
        chat_id: chatId,
        text: summary,
        parse_mode: "Markdown",
        urgency: report.confidence < 0.5 ? "P2" : "P3",
        queued_at: new Date().toISOString(),
        sent_at: null,
      },
      null,
      2
    )
  );
  return filepath;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const dateOverride = (ctx.inputs as { date?: string } | undefined)?.date;
  const date = dateOverride ?? todayDateString();

  const inputs = await gatherInputs(date);
  const report = composeReport(inputs);
  const md = renderMarkdown(report);

  await fs.mkdir(OVERNIGHT, { recursive: true });
  const reportPath = path.join(OVERNIGHT, `eod-${date}.md`);
  await fs.writeFile(reportPath, md, "utf8");

  let telegramPath: string | null = null;
  try {
    telegramPath = await queueTelegramSummary(report);
  } catch {
    // Telegram is non-critical; the file is the source of truth.
  }

  await auditLog({
    action: "daily_eod_written",
    actor: "automated:daily-eod",
    details: {
      date,
      shipped_count: report.shipped.length,
      slipped_count: report.slipped.length,
      blockers_count: report.blockers.length,
      confidence: report.confidence,
    },
    skill_invoked: "daily-eod",
    actor_source: "skill-runner",
  });

  const artifacts = [reportPath];
  if (telegramPath) artifacts.push(telegramPath);

  return {
    ok: true,
    skill: "daily-eod",
    path: "hand-coded",
    result: {
      date,
      shipped: report.shipped.length,
      slipped: report.slipped.length,
      blockers: report.blockers.length,
      confidence: report.confidence,
    },
    artifacts,
    next_actions:
      report.confidence < 0.5
        ? ["Trigger a Council on what to cut or change — see kickoff for tomorrow"]
        : [`Read ${reportPath} before tomorrow's kickoff`],
  };
}
