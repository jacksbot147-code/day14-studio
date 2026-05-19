/**
 * growth-metrics-dashboard — hand-coded impl.
 *
 * Empire-size + velocity report. Reads from:
 *   - seeds/skills/ (current skill count)
 *   - seeds/skills/_drafts/ (pending review)
 *   - seeds/skills/_archived/ (archived this period)
 *   - growth/work-register.jsonl (invocation counts)
 *   - growth/growth-log.md (detection history)
 *   - poller heartbeats (system health)
 *
 * Writes a weekly snapshot to ~/Documents/studio/docs/growth-metrics-{date}.md.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";

const HOME = homedir();
const STUDIO_DOCS = path.join(HOME, "Documents/studio/docs");
const SEEDS = path.join(HOME, "Documents/studio/docs/seeds/skills");
const DRAFTS = path.join(SEEDS, "_drafts");
const ARCHIVED = path.join(SEEDS, "_archived");
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const REGISTER = path.join(SHARED, "growth/work-register.jsonl");
const GROWTH_LOG = path.join(SHARED, "growth/growth-log.md");
const POLLER_DIR = path.join(SHARED, "poller");

async function lsCount(dir: string): Promise<number> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory() && !e.name.startsWith("_")).length;
  } catch {
    return 0;
  }
}

async function readRegister(): Promise<
  Array<{ timestamp: string; invoked_skill?: string; is_ad_hoc?: boolean }>
> {
  if (!existsSync(REGISTER)) return [];
  const text = await fs.readFile(REGISTER, "utf8");
  return text
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter((x) => x !== null);
}

export interface GrowthMetrics {
  empire_size: number;
  drafts_pending: number;
  archived_total: number;
  invocations_7d: number;
  ad_hoc_7d: number;
  most_invoked_7d: Array<{ skill: string; count: number }>;
  poller_health: Record<string, { age_min: number; stale: boolean }>;
  growth_detections_7d: number;
}

export async function computeGrowthMetrics(): Promise<GrowthMetrics> {
  const empireSize = await lsCount(SEEDS);
  const draftsPending = await lsCount(DRAFTS);
  const archivedTotal = await lsCount(ARCHIVED);

  const entries = await readRegister();
  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const recent = entries.filter(
    (e) => new Date(e.timestamp).getTime() > sevenDaysAgo
  );
  const invocations7d = recent.filter((e) => e.invoked_skill).length;
  const adHoc7d = recent.filter((e) => e.is_ad_hoc).length;

  const invocationCounts = new Map<string, number>();
  for (const e of recent) {
    if (e.invoked_skill) {
      invocationCounts.set(e.invoked_skill, (invocationCounts.get(e.invoked_skill) ?? 0) + 1);
    }
  }
  const mostInvoked = [...invocationCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill, count]) => ({ skill, count }));

  // Poller health
  const pollerHealth: Record<string, { age_min: number; stale: boolean }> = {};
  if (existsSync(POLLER_DIR)) {
    const files = await fs.readdir(POLLER_DIR);
    for (const f of files) {
      if (!f.endsWith("-heartbeat.log")) continue;
      try {
        const text = await fs.readFile(path.join(POLLER_DIR, f), "utf8");
        const lines = text.trim().split("\n").filter(Boolean);
        const last = lines[lines.length - 1];
        if (last) {
          const m = last.match(/^(\S+)/);
          if (m && m[1]) {
            const ageMin = Math.round((Date.now() - new Date(m[1]).getTime()) / 60000);
            pollerHealth[f.replace("-heartbeat.log", "")] = {
              age_min: ageMin,
              stale: ageMin > 10,
            };
          }
        }
      } catch {
        // skip
      }
    }
  }

  // Growth detections from growth-log.md
  let growthDetections = 0;
  if (existsSync(GROWTH_LOG)) {
    const text = await fs.readFile(GROWTH_LOG, "utf8");
    const matches = text.match(/^## /gm) ?? [];
    growthDetections = matches.length;
  }

  return {
    empire_size: empireSize,
    drafts_pending: draftsPending,
    archived_total: archivedTotal,
    invocations_7d: invocations7d,
    ad_hoc_7d: adHoc7d,
    most_invoked_7d: mostInvoked,
    poller_health: pollerHealth,
    growth_detections_7d: growthDetections,
  };
}

export async function writeGrowthReport(): Promise<string> {
  await fs.mkdir(STUDIO_DOCS, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(STUDIO_DOCS, `growth-metrics-${date}.md`);
  const m = await computeGrowthMetrics();

  const lines: string[] = [];
  lines.push(`# Growth metrics — ${date}`);
  lines.push("");
  lines.push(`## Empire`);
  lines.push(`- Skills: **${m.empire_size}**`);
  lines.push(`- Drafts pending: ${m.drafts_pending}`);
  lines.push(`- Archived (cumulative): ${m.archived_total}`);
  lines.push("");
  lines.push(`## Velocity (last 7 days)`);
  lines.push(`- Skill invocations: ${m.invocations_7d}`);
  lines.push(`- Ad-hoc actions: ${m.ad_hoc_7d}`);
  lines.push(`- Growth detections cumulative: ${m.growth_detections_7d}`);
  lines.push("");
  if (m.most_invoked_7d.length > 0) {
    lines.push(`## Most invoked (7d)`);
    for (const { skill, count } of m.most_invoked_7d) {
      lines.push(`- \`${skill}\` — ${count} fires`);
    }
    lines.push("");
  }
  lines.push(`## Poller health`);
  if (Object.keys(m.poller_health).length === 0) {
    lines.push(`- 🔴 No pollers heartbeating — system is dormant`);
  } else {
    for (const [name, { age_min, stale }] of Object.entries(m.poller_health)) {
      lines.push(`- ${stale ? "🔴" : "🟢"} ${name}: ${age_min}m ago`);
    }
  }
  lines.push("");
  lines.push(`_Generated: ${new Date().toISOString()}_`);

  await fs.writeFile(reportPath, lines.join("\n"), "utf8");
  return reportPath;
}

export async function run(_ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const reportPath = await writeGrowthReport();
  const m = await computeGrowthMetrics();
  return {
    ok: true,
    skill: "growth-metrics-dashboard",
    path: "hand-coded",
    result: m,
    artifacts: [reportPath],
  };
}
