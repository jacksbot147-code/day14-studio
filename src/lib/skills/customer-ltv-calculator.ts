/**
 * customer-ltv-calculator — hand-coded impl.
 *
 * Computes per-customer LTV from Stripe invoice data + dossier metadata.
 * Hands off realized LTV + projected (based on segment churn rate).
 *
 * Realized = sum(paid invoices).
 * Projected = realized + (current_mrr × expected_months_remaining).
 * Expected months remaining = 1 / monthly_churn_rate_for_segment.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";
import { logSkillInvocation } from "../work-register";

const SHARED = path.join(homedir(), "Documents/businesses/_shared");
const METRICS_DIR = path.join(SHARED, "metrics");
const CUSTOMERS_DIR = path.join(SHARED, "customers");

export interface CustomerLtv {
  slug: string;
  realized: number;
  projected_remaining: number;
  total_projected: number;
  current_mrr: number;
  tenure_months: number;
  expected_months_remaining: number;
  churn_rate_segment: number;
  segment: string;
  /**
   * Spec failure mode: customers under 30 days of tenure get no projection —
   * "show TBD rather than guess". projected_remaining is 0 (conservative)
   * and the report renders "TBD" instead of a number.
   */
  projection_tbd: boolean;
}

interface CustomerSummary {
  slug: string;
  tier?: string;
  vertical?: string;
  signup_date?: string;
  current_mrr: number;
  total_paid: number;
  status: "active" | "churned" | "paused";
}

// Conservative default churn rates by tenure bucket (per month)
// To be tuned with actual data over time.
const DEFAULT_CHURN_BY_TENURE: Record<string, number> = {
  "0-3mo": 0.08,
  "3-12mo": 0.025,
  "12mo+": 0.012,
};

function tenureBucket(months: number): string {
  if (months < 3) return "0-3mo";
  if (months < 12) return "3-12mo";
  return "12mo+";
}

/**
 * Read a customer's status from their dossier. For now this is mocked
 * out from dossier files — Stripe integration plugs in via stripe-client.
 */
async function loadCustomerSummaries(): Promise<CustomerSummary[]> {
  if (!existsSync(CUSTOMERS_DIR)) return [];
  const slugs = await fs.readdir(CUSTOMERS_DIR);
  const summaries: CustomerSummary[] = [];

  for (const slug of slugs) {
    const dossierDir = path.join(CUSTOMERS_DIR, slug);
    const stat = await fs.stat(dossierDir).catch(() => null);
    if (!stat || !stat.isDirectory()) continue;

    // Read 01-brand.json + 05-launch.md for status
    const summary: CustomerSummary = {
      slug,
      current_mrr: 0,
      total_paid: 0,
      status: "active",
    };

    const brandPath = path.join(dossierDir, "01-brand.json");
    if (existsSync(brandPath)) {
      try {
        const brand = JSON.parse(await fs.readFile(brandPath, "utf8")) as {
          tier?: string;
          vertical?: string;
          signup_date?: string;
          monthly_amount?: number;
          total_paid?: number;
          status?: string;
        };
        summary.tier = brand.tier;
        summary.vertical = brand.vertical;
        summary.signup_date = brand.signup_date;
        summary.current_mrr = brand.monthly_amount || 0;
        summary.total_paid = brand.total_paid || 0;
        if (brand.status === "churned" || brand.status === "paused") {
          summary.status = brand.status;
        }
      } catch {
        // skip
      }
    }

    summaries.push(summary);
  }
  return summaries;
}

function computeLtv(s: CustomerSummary): CustomerLtv {
  const tenureMonths = s.signup_date
    ? Math.max(
        0,
        (Date.now() - new Date(s.signup_date).getTime()) / (1000 * 60 * 60 * 24 * 30)
      )
    : 0;
  const bucket = tenureBucket(tenureMonths);
  const churnRate = DEFAULT_CHURN_BY_TENURE[bucket] ?? 0.05;
  // Spec failure mode: <30 days tenure → project conservatively (TBD).
  const projectionTbd = s.status === "active" && tenureMonths < 1;
  const projects = s.status === "active" && !projectionTbd;
  const expectedMonthsRemaining = projects ? 1 / churnRate : 0;
  const projectedRemaining = projects ? s.current_mrr * expectedMonthsRemaining : 0;

  return {
    slug: s.slug,
    realized: s.total_paid,
    projected_remaining: Math.round(projectedRemaining),
    total_projected: Math.round(s.total_paid + projectedRemaining),
    current_mrr: s.current_mrr,
    tenure_months: Math.round(tenureMonths * 10) / 10,
    expected_months_remaining: Math.round(expectedMonthsRemaining * 10) / 10,
    churn_rate_segment: churnRate,
    segment: `${s.vertical || "unknown"}-${bucket}`,
    projection_tbd: projectionTbd,
  };
}

export async function computeAllLtv(): Promise<{
  customers: CustomerLtv[];
  total_realized: number;
  total_projected: number;
  avg_ltv: number;
}> {
  const summaries = await loadCustomerSummaries();
  const customers = summaries.map(computeLtv);

  const totalRealized = customers.reduce((sum, c) => sum + c.realized, 0);
  const totalProjected = customers.reduce((sum, c) => sum + c.total_projected, 0);
  const avgLtv =
    customers.length > 0 ? Math.round(totalProjected / customers.length) : 0;

  return {
    customers,
    total_realized: totalRealized,
    total_projected: totalProjected,
    avg_ltv: avgLtv,
  };
}

export async function writeLtvReport(
  precomputed?: Awaited<ReturnType<typeof computeAllLtv>>
): Promise<string> {
  await fs.mkdir(METRICS_DIR, { recursive: true });
  const month = new Date().toISOString().slice(0, 7);
  const reportPath = path.join(METRICS_DIR, `ltv-${month}.md`);

  const data = precomputed ?? (await computeAllLtv());
  const sorted = [...data.customers].sort(
    (a, b) => b.total_projected - a.total_projected
  );
  const tbdCount = data.customers.filter((c) => c.projection_tbd).length;

  const lines: string[] = [];
  lines.push(`# Customer LTV — ${month}`);
  lines.push("");
  lines.push(`## Aggregate`);
  lines.push(`- Customers: ${data.customers.length}`);
  lines.push(`- Total realized: $${data.total_realized.toLocaleString()}`);
  lines.push(`- Total projected: $${data.total_projected.toLocaleString()}`);
  lines.push(`- Avg LTV: $${data.avg_ltv.toLocaleString()}`);
  if (tbdCount > 0) {
    lines.push(
      `- Projections TBD: ${tbdCount} customer${tbdCount === 1 ? "" : "s"} under 30 days tenure — realized only, no projection (spec: show TBD rather than guess)`
    );
  }
  lines.push("");
  lines.push(`## Top customers by LTV`);
  lines.push("");
  lines.push("| Rank | Slug | Realized | Projected remaining | Total | MRR | Tenure | Segment | Churn assumption |");
  lines.push("|------|------|---------:|---------------------:|------:|----:|--------|---------|------------------|");
  for (let i = 0; i < Math.min(20, sorted.length); i++) {
    const c = sorted[i];
    if (!c) break;
    const projected = c.projection_tbd
      ? "TBD"
      : `$${c.projected_remaining.toLocaleString()}`;
    const total = c.projection_tbd
      ? `$${c.realized.toLocaleString()} (TBD)`
      : `$${c.total_projected.toLocaleString()}`;
    lines.push(
      `| ${i + 1} | ${c.slug} | $${c.realized.toLocaleString()} | ${projected} | ${total} | $${c.current_mrr.toLocaleString()} | ${c.tenure_months}mo | ${c.segment} | ${(c.churn_rate_segment * 100).toFixed(1)}%/mo |`
    );
  }
  lines.push("");
  lines.push(`## Acquisition spend ceilings (LTV ÷ 3 rule)`);
  if (data.customers.length > 0) {
    const byTier: Record<string, number[]> = {};
    for (const c of data.customers) {
      const key = `$${c.current_mrr}/mo`;
      if (!byTier[key]) byTier[key] = [];
      byTier[key].push(c.total_projected);
    }
    for (const [tier, ltvs] of Object.entries(byTier)) {
      const avg = Math.round(ltvs.reduce((a, b) => a + b, 0) / ltvs.length);
      const ceiling = Math.round(avg / 3);
      lines.push(`- ${tier} tier: avg LTV $${avg.toLocaleString()} → max CAC $${ceiling.toLocaleString()}`);
    }
  }
  lines.push("");
  lines.push(`## Assumptions (spec rule 2: always show the assumption)`);
  lines.push("");
  lines.push(
    `Churn rates are conservative defaults by tenure bucket — not yet derived from actual cancellation history (known gap vs spec):`
  );
  for (const [bucket, rate] of Object.entries(DEFAULT_CHURN_BY_TENURE)) {
    lines.push(`- ${bucket}: ${(rate * 100).toFixed(1)}%/mo → ~${(1 / rate).toFixed(1)} expected months remaining`);
  }
  lines.push(
    `- Projected figures are directional only — weight realized over projected (spec rule 1).`
  );
  lines.push("");
  lines.push(`_Generated: ${new Date().toISOString()}_`);

  await fs.writeFile(reportPath, lines.join("\n"), "utf8");
  return reportPath;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  // Growth hook (CLAUDE.md rule 6): feeds growth-watcher + skill-coverage-auditor.
  await logSkillInvocation(
    "customer-ltv-calculator",
    ctx.context,
    ctx.customer_slug
  );

  try {
    const data = await computeAllLtv();
    const reportPath = await writeLtvReport(data);

    // Single-customer mode (spec input: customer_slug) — /ltv {slug} via Telegram.
    const single = ctx.customer_slug
      ? data.customers.find((c) => c.slug === ctx.customer_slug)
      : undefined;

    // Audit trail (CLAUDE.md rule 5): report generation is consequential —
    // it drives acquisition-spend decisions downstream.
    await auditLog({
      action: "ltv_report_generated",
      actor: "automated:customer-ltv-calculator",
      customer_slug: ctx.customer_slug,
      details: {
        report_path: reportPath,
        customers: data.customers.length,
        total_realized: data.total_realized,
        total_projected: data.total_projected,
        avg_ltv: data.avg_ltv,
      },
      skill_invoked: "customer-ltv-calculator",
      actor_source: ctx.caller ?? "scheduled",
    });

    return {
      ok: true,
      skill: "customer-ltv-calculator",
      path: "hand-coded",
      result: {
        customers: data.customers.length,
        total_realized: data.total_realized,
        total_projected: data.total_projected,
        avg_ltv: data.avg_ltv,
        ...(ctx.customer_slug
          ? { customer: single ?? null, customer_found: Boolean(single) }
          : {}),
      },
      artifacts: [reportPath],
    };
  } catch (err) {
    return {
      ok: false,
      skill: "customer-ltv-calculator",
      path: "hand-coded",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
