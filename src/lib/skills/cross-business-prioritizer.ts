/**
 * cross-business-prioritizer — hand-coded impl.
 *
 * Cross-tenant: find the single highest-leverage action for Jack today.
 * Scores each candidate by LTV-at-risk × urgency × reversibility.
 *
 * Inputs come from:
 *   - churn-risk-scorer (per-tenant churn risks)
 *   - work-register (recent ad-hoc / unresolved items)
 *   - tenants.json (per-tenant MRR/LTV)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { getActiveTenants } from "../tenants";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const REGISTER = path.join(SHARED, "growth/work-register.jsonl");
const METRICS = path.join(SHARED, "metrics");

interface Candidate {
  tenant_slug: string;
  action: string;
  reason: string;
  ltv_at_risk: number;
  urgency_multiplier: number;
  reversibility_factor: number;
  score: number;
}

interface WorkEntry {
  timestamp: string;
  action_phrase?: string;
  context?: string;
  customer_slug?: string;
  invoked_skill?: string;
  is_ad_hoc?: boolean;
  notes?: string;
}

async function readRegister(): Promise<WorkEntry[]> {
  if (!existsSync(REGISTER)) return [];
  const text = await fs.readFile(REGISTER, "utf8");
  return text
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l) as WorkEntry;
      } catch {
        return null;
      }
    })
    .filter((x): x is WorkEntry => x !== null);
}

function annualizeMrr(monthly: number): number {
  // Crude LTV at risk = 12 months of MRR (conservative)
  return monthly * 12;
}

async function computeCandidates(): Promise<Candidate[]> {
  const tenants = getActiveTenants();
  const entries = await readRegister();
  const candidates: Candidate[] = [];

  // 1. For each tenant, look for high-signal recent entries
  for (const t of tenants) {
    const tenantEntries = entries.filter(
      (e) => e.customer_slug === t.slug || e.context === t.slug
    );

    // Look for cancellation / refund mentions in last 7d
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const recent = tenantEntries.filter(
      (e) => new Date(e.timestamp).getTime() > sevenDaysAgo
    );

    const cancelMentions = recent.filter((e) => {
      const txt = (e.action_phrase || "").toLowerCase();
      return /cancel|refund|leave|quit|stop service/.test(txt);
    });
    if (cancelMentions.length > 0) {
      candidates.push({
        tenant_slug: t.slug,
        action: `Call ${t.name} about cancellation question`,
        reason: `${cancelMentions.length} cancel/refund mentions in last 7d`,
        ltv_at_risk: annualizeMrr(t.billing?.monthly_amount ?? 0),
        urgency_multiplier: 3.0,
        reversibility_factor: 1.5,
        score: 0,
      });
    }

    // Long silence + paying tenant
    if (t.billing?.monthly_amount && tenantEntries.length > 0) {
      const lastActivity = tenantEntries
        .map((e) => new Date(e.timestamp).getTime())
        .reduce((max, ts) => Math.max(max, ts), 0);
      const daysSilent = (Date.now() - lastActivity) / 86400000;
      if (daysSilent > 14) {
        candidates.push({
          tenant_slug: t.slug,
          action: `Reach out to ${t.name} — no activity in ${Math.round(daysSilent)} days`,
          reason: `Last activity ${Math.round(daysSilent)} days ago, still paying $${t.billing.monthly_amount}/mo`,
          ltv_at_risk: annualizeMrr(t.billing.monthly_amount) * 0.5, // half-weight: signal not certainty
          urgency_multiplier: 2.0,
          reversibility_factor: 1.0,
          score: 0,
        });
      }
    }
  }

  // 2. Failed payments / dunning across tenants (high priority)
  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const paymentFails = entries.filter(
    (e) =>
      new Date(e.timestamp).getTime() > sevenDaysAgo &&
      ((e.invoked_skill || "").includes("payment-retry") ||
        (e.action_phrase || "").toLowerCase().includes("payment failed"))
  );
  for (const pf of paymentFails) {
    const slug = pf.customer_slug || pf.context || "unknown";
    const tenant = tenants.find((t) => t.slug === slug);
    candidates.push({
      tenant_slug: slug,
      action: `Verify payment recovery for ${tenant?.name || slug}`,
      reason: `Payment failed event detected`,
      ltv_at_risk: annualizeMrr(tenant?.billing?.monthly_amount ?? 100),
      urgency_multiplier: 2.5,
      reversibility_factor: 1.3,
      score: 0,
    });
  }

  // 3. Compute final scores
  for (const c of candidates) {
    c.score =
      c.ltv_at_risk * c.urgency_multiplier * c.reversibility_factor;
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export async function pickOneThing(): Promise<{ top: Candidate | null; runners_up: Candidate[] }> {
  const candidates = await computeCandidates();
  return {
    top: candidates[0] ?? null,
    runners_up: candidates.slice(1, 4),
  };
}

export async function writePriorityReport(): Promise<string> {
  const { top, runners_up } = await pickOneThing();
  await fs.mkdir(METRICS, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(METRICS, `priorities-${date}.md`);

  const lines: string[] = [];
  lines.push(`# Cross-business priorities — ${date}`);
  lines.push("");
  if (top) {
    lines.push(`## 🎯 Today's one thing`);
    lines.push("");
    lines.push(`**${top.action}**`);
    lines.push("");
    lines.push(`- Tenant: \`${top.tenant_slug}\``);
    lines.push(`- Reason: ${top.reason}`);
    lines.push(`- LTV at risk: $${Math.round(top.ltv_at_risk).toLocaleString()}`);
    lines.push(`- Score: ${Math.round(top.score).toLocaleString()}`);
  } else {
    lines.push(`## 🎯 Today's one thing`);
    lines.push("");
    lines.push(`No fires. Ship one piece of work that compounds — outreach, content, or a new hand-coded skill.`);
  }
  lines.push("");
  if (runners_up.length > 0) {
    lines.push(`## Runners-up (handle after the first)`);
    lines.push("");
    for (const c of runners_up) {
      lines.push(`- ${c.action} (\`${c.tenant_slug}\`, score ${Math.round(c.score).toLocaleString()})`);
    }
  }
  lines.push("");
  lines.push(`_Generated: ${new Date().toISOString()}_`);

  await fs.writeFile(reportPath, lines.join("\n"), "utf8");
  return reportPath;
}

export async function run(_ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const reportPath = await writePriorityReport();
  const { top, runners_up } = await pickOneThing();
  return {
    ok: true,
    skill: "cross-business-prioritizer",
    path: "hand-coded",
    result: { top: top?.action ?? "no fires", runners_up: runners_up.length },
    artifacts: [reportPath],
    next_actions: top ? [top.action] : [],
  };
}
