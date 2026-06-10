/**
 * skill-deprecation-flagger — hand-coded impl.
 *
 * Monthly audit: surfaces skills with zero invocations in 90+ days
 * for Jack's review. Respects expected-dormant allowlist (storm/seasonal
 * skills) and skips skills created in the last 30 days (too young).
 *
 * Writes a flag report to ~/Documents/studio/docs/skill-deprecation-{YYYY-MM}.md.
 * NEVER deletes or moves anything — flag-only.
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
const SKILLS_ROOT = path.join(HOME, "Documents/studio/docs/seeds/skills");
const REPORT_DIR = path.join(HOME, "Documents/studio/docs");
const DAY_MS = 86400000;

// Skills that may legitimately go dormant (storm season, etc.).
// Keep in sync with skill-invocation-monitor's allowlist.
const EXPECTED_DORMANT = new Set<string>([
  "hurricane-watch-poller",
  "post-storm-damage-assessor",
  "storm-week-comms",
  "evacuation-zone-mapper",
  "power-outage-detector",
]);

export interface DeprecationCandidate {
  skill: string;
  last_fired_at: string | null;
  days_dormant: number;
  recommendation: "Keep" | "Amend" | "Archive";
  reason: string;
}

async function readLastFired(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!existsSync(REGISTER)) return out;
  let text: string;
  try {
    text = await fs.readFile(REGISTER, "utf8");
  } catch {
    return out;
  }
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as { timestamp?: string; invoked_skill?: string };
      if (!e.invoked_skill || !e.timestamp) continue;
      const prev = out.get(e.invoked_skill);
      if (!prev || new Date(prev).getTime() < new Date(e.timestamp).getTime()) {
        out.set(e.invoked_skill, e.timestamp);
      }
    } catch {
      // skip
    }
  }
  return out;
}

async function getSkillAgeDays(name: string): Promise<number> {
  // Use the SKILL.md file's birthtime as a proxy for skill age
  const skillPath = path.join(SKILLS_ROOT, name, "SKILL.md");
  try {
    const stat = await fs.stat(skillPath);
    const created = stat.birthtime || stat.ctime;
    return Math.floor((Date.now() - created.getTime()) / DAY_MS);
  } catch {
    return Number.POSITIVE_INFINITY; // assume old if we can't tell
  }
}

export async function computeDeprecationFlags(): Promise<DeprecationCandidate[]> {
  const SKILLS = await getSkills();
  const lastFired = await readLastFired();
  const candidates: DeprecationCandidate[] = [];
  const now = Date.now();

  for (const s of SKILLS) {
    if (EXPECTED_DORMANT.has(s.name)) continue;
    const ageDays = await getSkillAgeDays(s.name);
    if (ageDays < 30) continue;

    const last = lastFired.get(s.name) ?? null;
    const dormantDays = last ? Math.floor((now - new Date(last).getTime()) / DAY_MS) : ageDays;
    if (dormantDays < 90) continue;

    // Recommendation heuristics
    let recommendation: DeprecationCandidate["recommendation"] = "Keep";
    let reason = "Zero invocations in 90+ days — surface for Jack's review";
    if (!last && ageDays > 120) {
      recommendation = "Amend";
      reason = "Never fired in 120+ days — triggers may be wrong";
    } else if (last && dormantDays > 180) {
      recommendation = "Archive";
      reason = "Dormant 180+ days — likely superseded";
    }

    candidates.push({
      skill: s.name,
      last_fired_at: last,
      days_dormant: dormantDays,
      recommendation,
      reason,
    });
  }

  candidates.sort((a, b) => b.days_dormant - a.days_dormant);
  return candidates;
}

export async function writeDeprecationReport(): Promise<string> {
  const candidates = await computeDeprecationFlags();
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const month = new Date().toISOString().slice(0, 7);
  const out = path.join(REPORT_DIR, `skill-deprecation-${month}.md`);

  const lines: string[] = [];
  lines.push(`# Skill deprecation flag — ${month}`);
  lines.push("");
  lines.push(`## Candidates flagged: ${candidates.length}`);
  lines.push("");
  if (candidates.length === 0) {
    lines.push("_No skills meet the 90-day dormant criteria. Empire is being used._");
  } else {
    lines.push("| Skill | Last fired | Days dormant | Recommendation | Reason |");
    lines.push("|---|---|---:|---|---|");
    for (const c of candidates.slice(0, 100)) {
      lines.push(
        `| \`${c.skill}\` | ${c.last_fired_at?.slice(0, 10) ?? "never"} | ${c.days_dormant} | ${c.recommendation} | ${c.reason} |`
      );
    }
  }
  lines.push("");
  lines.push("_Generated: " + new Date().toISOString() + "_");
  lines.push("");
  lines.push("> **Flag-only.** This skill never deletes or moves anything — Jack reviews and decides.");

  await fs.writeFile(out, lines.join("\n"), "utf8");
  return out;
}

export async function run(_ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const reportPath = await writeDeprecationReport();
  const candidates = await computeDeprecationFlags();
  return {
    ok: true,
    skill: "skill-deprecation-flagger",
    path: "hand-coded",
    result: { candidate_count: candidates.length, candidates: candidates.slice(0, 25) },
    artifacts: [reportPath],
    jack_tap_required: candidates.length > 0,
  };
}
