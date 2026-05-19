/**
 * mrr-calculator — hand-coded impl.
 *
 * Reads customer dossiers, computes:
 *   - Current MRR (sum of active customers' monthly_amount)
 *   - Net new MRR this month (signups - churn - downgrades + upgrades)
 *   - MRR by tier breakdown
 *   - ARR projection (MRR × 12)
 *
 * Writes a monthly snapshot to _shared/metrics/mrr-{YYYY-MM}.md.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";

const SHARED = path.join(homedir(), "Documents/businesses/_shared");
const CUSTOMERS = path.join(SHARED, "customers");
const METRICS = path.join(SHARED, "metrics");

interface CustomerSnapshot {
  slug: string;
  status: "active" | "paused" | "churned";
  monthly_amount: number;
  signup_date?: string;
  churn_date?: string;
  tier?: string;
}

async function loadCustomers(): Promise<CustomerSnapshot[]> {
  if (!existsSync(CUSTOMERS)) return [];
  const slugs = await fs.readdir(CUSTOMERS);
  const out: CustomerSnapshot[] = [];
  for (const slug of slugs) {
    const brandPath = path.join(CUSTOMERS, slug, "01-brand.json");
    if (!existsSync(brandPath)) continue;
    try {
      const brand = JSON.parse(await fs.readFile(brandPath, "utf8")) as Partial<CustomerSnapshot>;
      out.push({
        slug,
        status: brand.status ?? "active",
        monthly_amount: brand.monthly_amount ?? 0,
        signup_date: brand.signup_date,
        churn_date: brand.churn_date,
        tier: brand.tier,
      });
    } catch {
      // skip
    }
  }
  return out;
}

export interface MrrSnapshot {
  total_mrr: number;
  paying_customers: number;
  paused_customers: number;
  churned_customers_30d: number;
  net_new_30d: number;
  arr_projection: number;
  by_tier: Record<string, { customers: number; mrr: number }>;
}

export async function computeMrr(): Promise<MrrSnapshot> {
  const customers = await loadCustomers();
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86400000;

  const active = customers.filter((c) => c.status === "active");
  const paused = customers.filter((c) => c.status === "paused");
  const recentlyChurned = customers.filter(
    (c) =>
      c.status === "churned" &&
      c.churn_date &&
      new Date(c.churn_date).getTime() > thirtyDaysAgo
  );
  const recentSignups = active.filter(
    (c) => c.signup_date && new Date(c.signup_date).getTime() > thirtyDaysAgo
  );

  const totalMrr = active.reduce((sum, c) => sum + c.monthly_amount, 0);

  const byTier: Record<string, { customers: number; mrr: number }> = {};
  for (const c of active) {
    const key = c.tier ?? `$${c.monthly_amount}/mo`;
    if (!byTier[key]) byTier[key] = { customers: 0, mrr: 0 };
    byTier[key].customers += 1;
    byTier[key].mrr += c.monthly_amount;
  }

  const lostMrr = recentlyChurned.reduce((s, c) => s + c.monthly_amount, 0);
  const newMrr = recentSignups.reduce((s, c) => s + c.monthly_amount, 0);

  return {
    total_mrr: totalMrr,
    paying_customers: active.length,
    paused_customers: paused.length,
    churned_customers_30d: recentlyChurned.length,
    net_new_30d: newMrr - lostMrr,
    arr_projection: totalMrr * 12,
    by_tier: byTier,
  };
}

export async function writeMrrReport(): Promise<string> {
  await fs.mkdir(METRICS, { recursive: true });
  const month = new Date().toISOString().slice(0, 7);
  const reportPath = path.join(METRICS, `mrr-${month}.md`);
  const snap = await computeMrr();

  const lines: string[] = [];
  lines.push(`# MRR snapshot — ${month}`);
  lines.push("");
  lines.push(`## Headline`);
  lines.push(`- **MRR: $${snap.total_mrr.toLocaleString()}**`);
  lines.push(`- **ARR projection: $${snap.arr_projection.toLocaleString()}**`);
  lines.push(`- Paying customers: ${snap.paying_customers}`);
  lines.push(`- Paused (recoverable): ${snap.paused_customers}`);
  lines.push(`- Net new MRR (30d): ${snap.net_new_30d >= 0 ? "+" : ""}$${snap.net_new_30d.toLocaleString()}`);
  lines.push("");

  lines.push(`## By tier`);
  lines.push("");
  lines.push("| Tier | Customers | MRR |");
  lines.push("|------|-----------|----:|");
  for (const [tier, data] of Object.entries(snap.by_tier).sort(
    (a, b) => b[1].mrr - a[1].mrr
  )) {
    lines.push(`| ${tier} | ${data.customers} | $${data.mrr.toLocaleString()} |`);
  }
  lines.push("");
  lines.push(`_Generated: ${new Date().toISOString()}_`);

  await fs.writeFile(reportPath, lines.join("\n"), "utf8");
  return reportPath;
}

export async function run(_ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const reportPath = await writeMrrReport();
  const snap = await computeMrr();
  return {
    ok: true,
    skill: "mrr-calculator",
    path: "hand-coded",
    result: snap,
    artifacts: [reportPath],
  };
}
