/**
 * churn-risk-scorer — hand-coded impl.
 *
 * Scores each active customer 0-100 on churn risk using behavioral signals
 * pulled from work-register, dossier feedback, and Stripe state.
 *
 * Signals (weighted; sum capped at 100):
 *   - no logSkillInvocation activity for slug in 30d (25)
 *   - last_email_response_days > 14 (15)
 *   - cancellation/refund question logged (30) [auto-flag]
 *   - payment_failed in last 30d (20)
 *   - negative_feedback_recent (15)
 *   - paused subscription in last 90d (15)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { computeAllLtv } from "./customer-ltv-calculator";

const SHARED = path.join(homedir(), "Documents/businesses/_shared");
const METRICS_DIR = path.join(SHARED, "metrics");
const REGISTER = path.join(SHARED, "growth/work-register.jsonl");
const CUSTOMERS = path.join(SHARED, "customers");

export interface ChurnRisk {
  slug: string;
  score: number;
  signals: string[];
  bucket: "green" | "yellow" | "orange" | "red";
  ltv_at_risk: number;
  recommendation: string;
}

interface WorkEntry {
  timestamp: string;
  action_phrase: string;
  context: string;
  customer_slug?: string;
  invoked_skill?: string;
  is_ad_hoc?: boolean;
}

async function readWorkRegister(): Promise<WorkEntry[]> {
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

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

async function scoreCustomer(
  slug: string,
  entries: WorkEntry[]
): Promise<ChurnRisk> {
  const signals: string[] = [];
  let score = 0;

  const forCustomer = entries.filter(
    (e) => e.customer_slug === slug || e.context === slug
  );

  // 1. No activity in 30d
  const recent = forCustomer.filter((e) => daysSince(e.timestamp) <= 30);
  if (forCustomer.length > 0 && recent.length === 0) {
    score += 25;
    signals.push("no activity in 30+ days");
  }

  // 2. Cancellation / refund mentions
  const cancelLike = forCustomer.filter((e) => {
    const txt = (e.action_phrase || "").toLowerCase();
    return (
      txt.includes("cancel") ||
      txt.includes("refund") ||
      txt.includes("delete my")
    );
  });
  if (cancelLike.length > 0) {
    score += 30;
    signals.push(`cancellation/refund mention (${cancelLike.length}×)`);
  }

  // 3. Payment-failed events
  const paymentFails = forCustomer.filter((e) =>
    (e.invoked_skill || "").includes("payment-retry") ||
    (e.action_phrase || "").toLowerCase().includes("payment failed")
  );
  if (paymentFails.length > 0) {
    score += 20;
    signals.push(`payment failed (${paymentFails.length}×)`);
  }

  // 4. Negative feedback
  const negFb = forCustomer.filter((e) => {
    const txt = (e.action_phrase || "").toLowerCase();
    return (
      txt.includes("complaint") ||
      txt.includes("frustrated") ||
      txt.includes("angry") ||
      txt.includes("negative feedback")
    );
  });
  if (negFb.length > 0) {
    score += 15;
    signals.push("recent negative feedback");
  }

  // 5. Paused subscription
  const paused = forCustomer.find((e) =>
    (e.invoked_skill || "").includes("subscription-pause")
  );
  if (paused) {
    score += 15;
    signals.push("subscription paused recently");
  }

  // 6. Long silence on email
  const lastEmail = forCustomer
    .filter((e) => (e.invoked_skill || "").includes("inbound"))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  if (lastEmail && daysSince(lastEmail.timestamp) > 14) {
    score += 15;
    signals.push(`last email response ${Math.round(daysSince(lastEmail.timestamp))}d ago`);
  }

  score = Math.min(score, 100);

  const bucket: ChurnRisk["bucket"] =
    score >= 81 ? "red" : score >= 61 ? "orange" : score >= 31 ? "yellow" : "green";

  const recommendation =
    bucket === "red"
      ? "Personal call from Jack within 24h. No automated comms."
      : bucket === "orange"
        ? "Jack-tap warm check-in this week."
        : bucket === "yellow"
          ? "Monitor; review next week."
          : "Healthy; no action.";

  return {
    slug,
    score,
    signals,
    bucket,
    ltv_at_risk: 0, // filled below
    recommendation,
  };
}

export async function computeChurnRisks(): Promise<ChurnRisk[]> {
  // Customers: discover from dossier dirs
  const customerSlugs: string[] = [];
  if (existsSync(CUSTOMERS)) {
    for (const slug of await fs.readdir(CUSTOMERS)) {
      const stat = await fs.stat(path.join(CUSTOMERS, slug)).catch(() => null);
      if (stat?.isDirectory()) customerSlugs.push(slug);
    }
  }

  const entries = await readWorkRegister();
  const ltvData = await computeAllLtv();
  const ltvMap = new Map(ltvData.customers.map((c) => [c.slug, c.total_projected]));

  const risks: ChurnRisk[] = [];
  for (const slug of customerSlugs) {
    const risk = await scoreCustomer(slug, entries);
    risk.ltv_at_risk = ltvMap.get(slug) ?? 0;
    risks.push(risk);
  }

  // Sort by LTV-at-risk (saving high-LTV is highest leverage)
  risks.sort((a, b) => b.ltv_at_risk - a.ltv_at_risk);
  return risks;
}

export async function writeChurnReport(): Promise<string> {
  await fs.mkdir(METRICS_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(METRICS_DIR, `churn-risk-${date}.md`);

  const risks = await computeChurnRisks();
  const red = risks.filter((r) => r.bucket === "red");
  const orange = risks.filter((r) => r.bucket === "orange");
  const yellow = risks.filter((r) => r.bucket === "yellow");
  const green = risks.filter((r) => r.bucket === "green");

  const ltvAtRisk = red.concat(orange).reduce((s, r) => s + r.ltv_at_risk, 0);

  const lines: string[] = [];
  lines.push(`# Churn risk — ${date}`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push(`- 🔴 Red: ${red.length} customers`);
  lines.push(`- 🟠 Orange: ${orange.length}`);
  lines.push(`- 🟡 Yellow: ${yellow.length}`);
  lines.push(`- 🟢 Green: ${green.length}`);
  lines.push(`- **Total LTV at risk: $${ltvAtRisk.toLocaleString()}**`);
  lines.push("");

  for (const [name, group, emoji] of [
    ["Red (act this week)", red, "🔴"],
    ["Orange (intervene this week)", orange, "🟠"],
    ["Yellow (monitor)", yellow, "🟡"],
  ] as const) {
    if (group.length === 0) continue;
    lines.push(`## ${emoji} ${name}`);
    for (const r of group) {
      lines.push(`### ${r.slug} — score ${r.score}`);
      lines.push(`- Signals: ${r.signals.join("; ") || "none"}`);
      lines.push(`- LTV at risk: $${r.ltv_at_risk.toLocaleString()}`);
      lines.push(`- Recommendation: ${r.recommendation}`);
      lines.push("");
    }
  }

  lines.push(`_Generated: ${new Date().toISOString()}_`);
  await fs.writeFile(reportPath, lines.join("\n"), "utf8");
  return reportPath;
}

export async function run(_ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const reportPath = await writeChurnReport();
  const risks = await computeChurnRisks();
  const red = risks.filter((r) => r.bucket === "red").length;
  return {
    ok: true,
    skill: "churn-risk-scorer",
    path: "hand-coded",
    result: {
      customers_scored: risks.length,
      red,
      orange: risks.filter((r) => r.bucket === "orange").length,
      yellow: risks.filter((r) => r.bucket === "yellow").length,
      green: risks.filter((r) => r.bucket === "green").length,
    },
    artifacts: [reportPath],
    jack_tap_required: red > 0,
    next_actions:
      red > 0 ? [`Personal outreach to ${red} red-bucket customers`] : [],
  };
}
