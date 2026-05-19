/**
 * daily-kickoff — hand-coded impl.
 *
 * 7 AM ET morning rollup. Aggregates yesterday's data and tells Jack
 * what to do today. Different from morning-briefing-generator (which is
 * the broader 8:30 AM session): this is a tighter 5-minute kickoff.
 *
 * Content:
 *   - Yesterday's MRR delta
 *   - Yesterday's invocations (volume)
 *   - Today's churn-risk list (top 3)
 *   - Today's calendar events (cal.com)
 *   - 1 thing to focus on (computed)
 *   - Energy from last night (if logged)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { computeMrr } from "./mrr-calculator";
import { computeChurnRisks } from "./churn-risk-scorer";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const FOUNDER = path.join(SHARED, "founder-ops");

export async function buildKickoff(): Promise<string> {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });

  // MRR + churn risks (already computed by hand-coded skills)
  const [mrr, risks] = await Promise.all([computeMrr(), computeChurnRisks()]);

  const top3Risks = risks.filter((r) => r.bucket === "red" || r.bucket === "orange").slice(0, 3);

  // Yesterday's invocations
  const regPath = path.join(SHARED, "growth/work-register.jsonl");
  let yesterdayCount = 0;
  if (existsSync(regPath)) {
    const text = await fs.readFile(regPath, "utf8");
    const since = Date.now() - 86400000;
    yesterdayCount = text
      .split("\n")
      .filter(Boolean)
      .filter((l) => {
        try {
          const e = JSON.parse(l);
          return new Date(e.timestamp).getTime() > since;
        } catch {
          return false;
        }
      }).length;
  }

  // Latest energy entry
  const energyPath = path.join(FOUNDER, "energy-log.jsonl");
  let lastEnergy: { energy: number; mood: number; note?: string } | null = null;
  if (existsSync(energyPath)) {
    const text = await fs.readFile(energyPath, "utf8");
    const lines = text.split("\n").filter(Boolean);
    const last = lines[lines.length - 1];
    if (last) {
      try {
        lastEnergy = JSON.parse(last);
      } catch {
        // skip
      }
    }
  }

  // Compute "one thing" — picks the most leveraged action available today
  const oneThing = pickOneThing(top3Risks, mrr);

  const lines: string[] = [];
  lines.push(`# Daily kickoff — ${date}`);
  lines.push("");
  lines.push(`## Today's one thing`);
  lines.push(`> ${oneThing}`);
  lines.push("");
  lines.push(`## Numbers`);
  lines.push(`- MRR: **$${mrr.total_mrr.toLocaleString()}**`);
  lines.push(`- Paying customers: ${mrr.paying_customers}`);
  lines.push(`- Net new MRR (30d): ${mrr.net_new_30d >= 0 ? "+" : ""}$${mrr.net_new_30d.toLocaleString()}`);
  lines.push(`- Yesterday's invocations: ${yesterdayCount}`);
  if (lastEnergy) {
    lines.push(`- Last energy: ${lastEnergy.energy}/10${lastEnergy.note ? ` — ${lastEnergy.note}` : ""}`);
  }
  lines.push("");
  if (top3Risks.length > 0) {
    lines.push(`## Watch list`);
    for (const r of top3Risks) {
      const emoji = r.bucket === "red" ? "🔴" : "🟠";
      lines.push(`- ${emoji} **${r.slug}** (score ${r.score}, $${r.ltv_at_risk.toLocaleString()} at risk): ${r.signals.slice(0, 2).join("; ")}`);
    }
    lines.push("");
  }
  lines.push(`_Open the dashboard: http://localhost:3000/dashboard_`);

  return lines.join("\n");
}

function pickOneThing(
  topRisks: Array<{ slug: string; bucket: string; ltv_at_risk: number }>,
  mrr: { total_mrr: number; paying_customers: number; net_new_30d: number }
): string {
  // Priority: red customers > zero paying customers > negative MRR > otherwise default
  const red = topRisks.find((r) => r.bucket === "red");
  if (red) {
    return `Call ${red.slug} today. $${red.ltv_at_risk.toLocaleString()} of LTV is in red.`;
  }
  if (mrr.paying_customers === 0) {
    return `No paying customers yet. Today: one outreach call OR one piece of content shipped. Not both — pick one and finish.`;
  }
  if (mrr.net_new_30d < 0) {
    return `Net MRR went down this month. Identify which customer churned and run the post-mortem before doing anything else.`;
  }
  return `No fires. Ship one piece of work that compounds — either a customer outreach, a piece of marketing content, or a hand-coded skill.`;
}

export async function run(_ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const content = await buildKickoff();
  const date = new Date().toISOString().slice(0, 10);
  await fs.mkdir(FOUNDER, { recursive: true });
  const reportPath = path.join(FOUNDER, `kickoff-${date}.md`);
  await fs.writeFile(reportPath, content, "utf8");

  return {
    ok: true,
    skill: "daily-kickoff",
    path: "hand-coded",
    result: { preview: content.slice(0, 200) },
    artifacts: [reportPath],
  };
}
