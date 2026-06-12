/**
 * Tests for customer-ltv-calculator.
 *
 * Verifies:
 *   - Realized = total_paid
 *   - Projected = mrr * 1/churn_rate for the tenure bucket
 *   - 0-3mo bucket has highest churn → lowest projected
 *   - 12mo+ bucket has lowest churn → highest projected
 *   - Churned customers: projected = 0
 *   - Paused customers: projected = 0
 *   - <30d customers: projection TBD (conservative 0, flagged)
 *   - Malformed dossier JSON doesn't kill the computation
 *   - Report shows churn assumptions + renders TBD
 *   - run(): outcome shape, single-customer mode, work-register + audit entries
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// Re-import the module fresh so module-level homedir() captures see the
// swapped-in TMP_HOME (replaces the old `?bust=` query-string trick, which
// vite's dynamic-import analysis rejects).
async function freshImport() {
  vi.resetModules();
  return import("../src/lib/skills/customer-ltv-calculator");
}

let TMP_HOME: string;

beforeEach(async () => {
  TMP_HOME = await fs.mkdtemp(path.join(os.tmpdir(), "ltv-test-"));
  await fs.mkdir(
    path.join(TMP_HOME, "Documents/businesses/_shared/customers"),
    { recursive: true }
  );
  process.env.HOME = TMP_HOME;
});

afterEach(async () => {
  await fs.rm(TMP_HOME, { recursive: true, force: true });
});

async function makeCustomer(
  slug: string,
  fields: {
    signup_date?: string;
    total_paid?: number;
    monthly_amount?: number;
    status?: string;
    vertical?: string;
  }
) {
  const dir = path.join(TMP_HOME, `Documents/businesses/_shared/customers/${slug}`);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "01-brand.json"),
    JSON.stringify(fields),
    "utf8"
  );
}

describe("LTV computation", () => {
  test("new customer (1mo): realized + small projected", async () => {
    await makeCustomer("alpha", {
      signup_date: new Date(Date.now() - 30 * 86400000).toISOString(),
      total_paid: 497,
      monthly_amount: 497,
      status: "active",
      vertical: "pool",
    });
    const mod = await freshImport();
    const data = await mod.computeAllLtv();
    expect(data.customers.length).toBe(1);
    expect(data.customers[0]!.realized).toBe(497);
    expect(data.customers[0]!.segment).toContain("0-3mo");
    // 0-3mo bucket: 8% monthly churn → ~12.5 months expected
    // Projected ~ 497 * 12.5 = ~6212
    expect(data.customers[0]!.projected_remaining).toBeGreaterThan(5000);
    expect(data.customers[0]!.projected_remaining).toBeLessThan(7000);
  });

  test("established customer (15mo): large projected", async () => {
    await makeCustomer("beta", {
      signup_date: new Date(Date.now() - 450 * 86400000).toISOString(),
      total_paid: 7455,
      monthly_amount: 497,
      status: "active",
      vertical: "pool",
    });
    const mod = await freshImport();
    const data = await mod.computeAllLtv();
    expect(data.customers[0]!.segment).toContain("12mo+");
    // 12mo+ bucket: 1.2% monthly churn → ~83 months expected
    // Projected ~ 497 * 83 = ~41,251
    expect(data.customers[0]!.projected_remaining).toBeGreaterThan(35000);
    expect(data.customers[0]!.projected_remaining).toBeLessThan(50000);
  });

  test("churned customer: projected = 0", async () => {
    await makeCustomer("gamma", {
      signup_date: new Date(Date.now() - 90 * 86400000).toISOString(),
      total_paid: 1491,
      monthly_amount: 497,
      status: "churned",
    });
    const mod = await freshImport();
    const data = await mod.computeAllLtv();
    expect(data.customers[0]!.projected_remaining).toBe(0);
    expect(data.customers[0]!.total_projected).toBe(1491);
  });

  test("paused customer: projected = 0", async () => {
    await makeCustomer("delta", {
      signup_date: new Date(Date.now() - 120 * 86400000).toISOString(),
      total_paid: 1988,
      monthly_amount: 497,
      status: "paused",
    });
    const mod = await freshImport();
    const data = await mod.computeAllLtv();
    expect(data.customers[0]!.projected_remaining).toBe(0);
    expect(data.customers[0]!.total_projected).toBe(1988);
    expect(data.customers[0]!.projection_tbd).toBe(false);
  });

  test("brand-new customer (<30d): projection TBD, conservative 0", async () => {
    await makeCustomer("epsilon", {
      signup_date: new Date(Date.now() - 10 * 86400000).toISOString(),
      total_paid: 497,
      monthly_amount: 497,
      status: "active",
    });
    const mod = await freshImport();
    const data = await mod.computeAllLtv();
    expect(data.customers[0]!.projection_tbd).toBe(true);
    expect(data.customers[0]!.projected_remaining).toBe(0);
    expect(data.customers[0]!.total_projected).toBe(497);
  });

  test("malformed 01-brand.json: zeroed entry, no throw", async () => {
    const dir = path.join(
      TMP_HOME,
      "Documents/businesses/_shared/customers/broken"
    );
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "01-brand.json"), "{not json!", "utf8");
    const mod = await freshImport();
    const data = await mod.computeAllLtv();
    expect(data.customers.length).toBe(1);
    expect(data.customers[0]!.realized).toBe(0);
    expect(data.total_projected).toBe(0);
  });

  test("aggregate metrics computed", async () => {
    await makeCustomer("alpha", {
      signup_date: new Date(Date.now() - 30 * 86400000).toISOString(),
      total_paid: 497,
      monthly_amount: 497,
      status: "active",
    });
    await makeCustomer("beta", {
      signup_date: new Date(Date.now() - 60 * 86400000).toISOString(),
      total_paid: 994,
      monthly_amount: 497,
      status: "active",
    });
    const mod = await freshImport();
    const data = await mod.computeAllLtv();
    expect(data.customers.length).toBe(2);
    expect(data.total_realized).toBe(497 + 994);
    expect(data.total_projected).toBeGreaterThan(data.total_realized);
    expect(data.avg_ltv).toBeGreaterThan(0);
  });
});

describe("report + run()", () => {
  test("report shows churn assumptions and renders TBD for <30d customers", async () => {
    await makeCustomer("fresh", {
      signup_date: new Date(Date.now() - 5 * 86400000).toISOString(),
      total_paid: 497,
      monthly_amount: 497,
      status: "active",
      vertical: "pool",
    });
    const mod = await freshImport();
    const reportPath = await mod.writeLtvReport();
    const text = await fs.readFile(reportPath, "utf8");
    expect(text).toContain("## Assumptions");
    expect(text).toContain("Churn assumption");
    expect(text).toContain("8.0%/mo"); // 0-3mo default rate surfaced
    expect(text).toContain("| TBD |"); // projected column for <30d customer
  });

  test("run(): ok outcome, artifact written, single-customer mode, logs land", async () => {
    await makeCustomer("alpha", {
      signup_date: new Date(Date.now() - 200 * 86400000).toISOString(),
      total_paid: 3479,
      monthly_amount: 497,
      status: "active",
      vertical: "pool",
    });
    const mod = await freshImport();
    const outcome = await mod.run({
      context: "test-session",
      customer_slug: "alpha",
      caller: "vitest",
    });
    expect(outcome.ok).toBe(true);
    expect(outcome.artifacts?.length).toBe(1);
    const result = outcome.result as {
      customers: number;
      customer_found: boolean;
      customer: { slug: string } | null;
    };
    expect(result.customer_found).toBe(true);
    expect(result.customer?.slug).toBe("alpha");

    // Growth hook landed in the work register
    const wr = await fs.readFile(
      path.join(
        TMP_HOME,
        "Documents/businesses/_shared/growth/work-register.jsonl"
      ),
      "utf8"
    );
    expect(wr).toContain("invoked customer-ltv-calculator");

    // Audit entry landed
    const month = new Date().toISOString().slice(0, 7);
    const audit = await fs.readFile(
      path.join(
        TMP_HOME,
        `Documents/businesses/_shared/audit/audit-${month}.jsonl`
      ),
      "utf8"
    );
    expect(audit).toContain("ltv_report_generated");
  });

  test("run(): unknown customer_slug → customer_found false, still ok", async () => {
    const mod = await freshImport();
    const outcome = await mod.run({
      context: "test-session",
      customer_slug: "nobody",
    });
    expect(outcome.ok).toBe(true);
    const result = outcome.result as { customer_found: boolean };
    expect(result.customer_found).toBe(false);
  });
});
