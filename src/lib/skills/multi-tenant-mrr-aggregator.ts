/**
 * multi-tenant-mrr-aggregator — hand-coded impl.
 *
 * Sums MRR across all active tenants. Computes ARR projection,
 * per-tenant 30d delta (from work-register), best/worst performer.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { getActiveTenants, getTotalMonthlyRevenue } from "../tenants";

const HOME = homedir();
const SHARED = path.join(HOME, "Documents/businesses/_shared");
const REGISTER = path.join(SHARED, "growth/work-register.jsonl");

export interface AggregateSnapshot {
  total_mrr: number;
  total_arr: number;
  active_tenants: number;
  per_tenant: Array<{
    slug: string;
    name: string;
    type: string;
    mrr: number;
    direction: "up" | "down" | "flat";
    activity_count_30d: number;
  }>;
  best_performer: string | null;
  worst_performer: string | null;
}

async function countTenantActivity(slug: string): Promise<number> {
  if (!existsSync(REGISTER)) return 0;
  const text = await fs.readFile(REGISTER, "utf8");
  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  let count = 0;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      const ts = new Date(e.timestamp).getTime();
      if (
        ts > thirtyDaysAgo &&
        (e.customer_slug === slug || e.context === slug)
      ) {
        count += 1;
      }
    } catch {
      // skip
    }
  }
  return count;
}

export async function computeAggregate(): Promise<AggregateSnapshot> {
  const tenants = getActiveTenants();
  const totalMrr = getTotalMonthlyRevenue();

  const perTenant = await Promise.all(
    tenants.map(async (t) => ({
      slug: t.slug,
      name: t.name,
      type: t.type,
      mrr: t.billing?.monthly_amount ?? 0,
      direction: "flat" as const, // TODO: compute from history
      activity_count_30d: await countTenantActivity(t.slug),
    }))
  );

  perTenant.sort((a, b) => b.mrr - a.mrr);

  const bestPerformer = perTenant[0]?.slug ?? null;
  const worstPerformer =
    perTenant.length > 1 ? perTenant[perTenant.length - 1]!.slug : null;

  return {
    total_mrr: totalMrr,
    total_arr: totalMrr * 12,
    active_tenants: tenants.length,
    per_tenant: perTenant,
    best_performer: bestPerformer,
    worst_performer: worstPerformer,
  };
}

export async function writeAggregateReport(): Promise<string> {
  const snap = await computeAggregate();
  const date = new Date().toISOString().slice(0, 10);
  const reportDir = path.join(SHARED, "metrics");
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `aggregate-mrr-${date}.md`);

  const lines: string[] = [];
  lines.push(`# Empire aggregate MRR — ${date}`);
  lines.push("");
  lines.push(`## Headlines`);
  lines.push(`- **MRR: $${snap.total_mrr.toLocaleString()}**`);
  lines.push(`- **ARR projection: $${snap.total_arr.toLocaleString()}**`);
  lines.push(`- Active tenants: ${snap.active_tenants}`);
  lines.push("");
  if (snap.per_tenant.length > 0) {
    lines.push(`## Per tenant`);
    lines.push("");
    lines.push("| Slug | Name | Type | MRR | Activity 30d |");
    lines.push("|------|------|------|----:|------------:|");
    for (const t of snap.per_tenant) {
      lines.push(`| \`${t.slug}\` | ${t.name} | ${t.type} | $${t.mrr.toLocaleString()} | ${t.activity_count_30d} |`);
    }
    lines.push("");
  }
  lines.push(`_Generated: ${new Date().toISOString()}_`);

  await fs.writeFile(reportPath, lines.join("\n"), "utf8");
  return reportPath;
}

export async function run(_ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const reportPath = await writeAggregateReport();
  const snap = await computeAggregate();
  return {
    ok: true,
    skill: "multi-tenant-mrr-aggregator",
    path: "hand-coded",
    result: snap,
    artifacts: [reportPath],
  };
}
