/**
 * skill-coverage-auditor — hand-coded impl.
 *
 * Reads the work-register JSONL log and the SKILL registry, then
 * computes coverage stats: how many skills exist, how many fired in
 * the last 30/90 days, which are dormant, which are overloaded.
 *
 * Writes the audit report to ~/Documents/studio/docs/skill-coverage-{date}.md.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { getSkills } from "../registry-loader";

const HOME = homedir();
const REGISTER = path.join(HOME, "Documents/businesses/_shared/growth/work-register.jsonl");
const REPORT_DIR = path.join(HOME, "Documents/studio/docs");

const DAY_MS = 86400000;

interface InvocationCounts {
  total: number;
  last_30d: number;
  last_90d: number;
  last_fired_at: string | null;
}

export interface CoverageReport {
  empire_size: number;
  active_30d: number;
  active_90d: number;
  dormant_90d: string[];
  overloaded: Array<{ skill: string; last_7d: number }>;
  per_pack: Record<string, { count: number; active_30d: number }>;
  ad_hoc_count_30d: number;
  generated_at: string;
}

async function readInvocations(): Promise<{
  perSkill: Map<string, InvocationCounts>;
  adHoc30: number;
  weeklyCounts: Map<string, number>;
}> {
  const perSkill = new Map<string, InvocationCounts>();
  const weekly = new Map<string, number>();
  let adHoc30 = 0;
  if (!existsSync(REGISTER)) {
    return { perSkill, adHoc30, weeklyCounts: weekly };
  }
  const now = Date.now();
  const cutoff7 = now - 7 * DAY_MS;
  const cutoff30 = now - 30 * DAY_MS;
  const cutoff90 = now - 90 * DAY_MS;
  let text: string;
  try {
    text = await fs.readFile(REGISTER, "utf8");
  } catch {
    return { perSkill, adHoc30, weeklyCounts: weekly };
  }
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as {
        timestamp?: string;
        invoked_skill?: string;
        is_ad_hoc?: boolean;
      };
      const ts = e.timestamp ? new Date(e.timestamp).getTime() : NaN;
      if (Number.isNaN(ts)) continue;
      if (e.is_ad_hoc && ts > cutoff30) adHoc30 += 1;
      if (!e.invoked_skill) continue;
      const name = e.invoked_skill;
      let row = perSkill.get(name);
      if (!row) {
        row = { total: 0, last_30d: 0, last_90d: 0, last_fired_at: null };
        perSkill.set(name, row);
      }
      row.total += 1;
      if (ts > cutoff30) row.last_30d += 1;
      if (ts > cutoff90) row.last_90d += 1;
      if (!row.last_fired_at || new Date(row.last_fired_at).getTime() < ts) {
        row.last_fired_at = e.timestamp ?? null;
      }
      if (ts > cutoff7) weekly.set(name, (weekly.get(name) ?? 0) + 1);
    } catch {
      // skip malformed lines
    }
  }
  return { perSkill, adHoc30, weeklyCounts: weekly };
}

export async function computeCoverage(): Promise<CoverageReport> {
  const SKILLS = await getSkills();
  const { perSkill, adHoc30, weeklyCounts } = await readInvocations();
  const empireSize = SKILLS.length;
  let active30 = 0;
  let active90 = 0;
  const dormant: string[] = [];

  for (const s of SKILLS) {
    const row = perSkill.get(s.name);
    if (row?.last_30d) active30 += 1;
    if (row?.last_90d) active90 += 1;
    if (!row || row.last_90d === 0) dormant.push(s.name);
  }

  const overloaded: Array<{ skill: string; last_7d: number }> = [];
  for (const [skill, count] of weeklyCounts) {
    if (count > 50) overloaded.push({ skill, last_7d: count });
  }
  overloaded.sort((a, b) => b.last_7d - a.last_7d);

  const perPack: Record<string, { count: number; active_30d: number }> = {};
  for (const s of SKILLS) {
    const pack = s.pack || "unpacked";
    if (!perPack[pack]) perPack[pack] = { count: 0, active_30d: 0 };
    perPack[pack].count += 1;
    if ((perSkill.get(s.name)?.last_30d ?? 0) > 0) perPack[pack].active_30d += 1;
  }

  return {
    empire_size: empireSize,
    active_30d: active30,
    active_90d: active90,
    dormant_90d: dormant,
    overloaded,
    per_pack: perPack,
    ad_hoc_count_30d: adHoc30,
    generated_at: new Date().toISOString(),
  };
}

export async function writeCoverageReport(): Promise<string> {
  const report = await computeCoverage();
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const out = path.join(REPORT_DIR, `skill-coverage-${date}.md`);

  const lines: string[] = [];
  lines.push(`# Skill coverage audit — ${date}`);
  lines.push("");
  lines.push(`## Headline`);
  lines.push(`- Empire size: **${report.empire_size}** skills`);
  lines.push(
    `- Active in last 30 days: **${report.active_30d}** (${Math.round((report.active_30d / Math.max(1, report.empire_size)) * 100)}%)`
  );
  lines.push(`- Dormant in last 90 days: **${report.dormant_90d.length}**`);
  lines.push(`- Ad-hoc actions in last 30 days: **${report.ad_hoc_count_30d}**`);
  lines.push("");

  if (report.overloaded.length > 0) {
    lines.push(`## Overloaded skills (>50 firings / 7d)`);
    lines.push("| Skill | Last 7d |");
    lines.push("|---|---:|");
    for (const o of report.overloaded.slice(0, 20)) {
      lines.push(`| \`${o.skill}\` | ${o.last_7d} |`);
    }
    lines.push("");
  }

  lines.push(`## Pack distribution`);
  lines.push("| Pack | Total | Active 30d |");
  lines.push("|---|---:|---:|");
  for (const [pack, row] of Object.entries(report.per_pack).sort((a, b) => b[1].count - a[1].count)) {
    lines.push(`| ${pack} | ${row.count} | ${row.active_30d} |`);
  }
  lines.push("");

  if (report.dormant_90d.length > 0) {
    lines.push(`## Dormant 90d (consider archive — see skill-deprecation-flagger)`);
    for (const d of report.dormant_90d.slice(0, 50)) {
      lines.push(`- \`${d}\``);
    }
    if (report.dormant_90d.length > 50) {
      lines.push(`- _…and ${report.dormant_90d.length - 50} more_`);
    }
    lines.push("");
  }

  lines.push(`_Generated: ${report.generated_at}_`);
  await fs.writeFile(out, lines.join("\n"), "utf8");
  return out;
}

export async function run(_ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const reportPath = await writeCoverageReport();
  const report = await computeCoverage();
  return {
    ok: true,
    skill: "skill-coverage-auditor",
    path: "hand-coded",
    result: report,
    artifacts: [reportPath],
  };
}
