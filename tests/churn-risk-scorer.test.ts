/**
 * Tests for churn-risk-scorer.
 *
 * Verifies:
 *   - Empty register → low scores
 *   - Cancellation mention → score >= 30 → orange or red
 *   - Multiple signals stack
 *   - Bucket boundaries (green/yellow/orange/red)
 *   - Sort by LTV-at-risk
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
  return import("../src/lib/skills/churn-risk-scorer");
}

let TMP_HOME: string;

beforeEach(async () => {
  TMP_HOME = await fs.mkdtemp(path.join(os.tmpdir(), "churn-test-"));
  await fs.mkdir(
    path.join(TMP_HOME, "Documents/businesses/_shared/customers"),
    { recursive: true }
  );
  await fs.mkdir(
    path.join(TMP_HOME, "Documents/businesses/_shared/growth"),
    { recursive: true }
  );
  process.env.HOME = TMP_HOME;
});

afterEach(async () => {
  await fs.rm(TMP_HOME, { recursive: true, force: true });
});

async function makeCustomer(slug: string) {
  const dir = path.join(TMP_HOME, `Documents/businesses/_shared/customers/${slug}`);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "01-brand.json"),
    JSON.stringify({
      signup_date: new Date(Date.now() - 90 * 86400000).toISOString(),
      total_paid: 1491,
      monthly_amount: 497,
      status: "active",
    }),
    "utf8"
  );
}

async function writeRegister(entries: object[]) {
  const regPath = path.join(
    TMP_HOME,
    "Documents/businesses/_shared/growth/work-register.jsonl"
  );
  await fs.writeFile(
    regPath,
    entries.map((e) => JSON.stringify(e)).join("\n") + "\n",
    "utf8"
  );
}

describe("churn risk scoring", () => {
  test("empty register: customer scores 0-25 (green or yellow)", async () => {
    await makeCustomer("alpha");
    await writeRegister([]);
    const mod = await freshImport();
    const risks = await mod.computeChurnRisks();
    expect(risks.length).toBe(1);
    expect(risks[0]!.slug).toBe("alpha");
    expect(["green", "yellow"]).toContain(risks[0]!.bucket);
  });

  // Spec (docs/seeds/skills/churn-risk-scorer/SKILL.md): cancellation
  // mention is worth 30 points; buckets are 0-30 green / 31-60 yellow /
  // 61-80 orange / 81-100 red.
  test("cancellation mention adds 30 points + cancel signal", async () => {
    await makeCustomer("beta");
    await writeRegister([
      {
        timestamp: new Date().toISOString(),
        action_phrase: "customer asked to cancel subscription",
        context: "beta",
        customer_slug: "beta",
        is_ad_hoc: true,
      },
    ]);
    const mod = await freshImport();
    const risks = await mod.computeChurnRisks();
    expect(risks[0]!.score).toBeGreaterThanOrEqual(30);
    expect(risks[0]!.signals.some((s: string) => s.includes("cancel"))).toBe(true);
  });

  test("multiple signals stack to red", async () => {
    await makeCustomer("gamma");
    const twentyDaysAgo = new Date(Date.now() - 20 * 86400000).toISOString();
    await writeRegister([
      {
        timestamp: new Date().toISOString(),
        action_phrase: "customer wants to cancel",
        context: "gamma",
        customer_slug: "gamma",
        is_ad_hoc: true,
      },
      {
        timestamp: new Date().toISOString(),
        action_phrase: "payment failed",
        context: "gamma",
        customer_slug: "gamma",
        invoked_skill: "failed-payment-retry",
      },
      {
        timestamp: new Date().toISOString(),
        action_phrase: "complaint received",
        context: "gamma",
        customer_slug: "gamma",
      },
      {
        timestamp: new Date().toISOString(),
        action_phrase: "subscription paused",
        context: "gamma",
        customer_slug: "gamma",
        invoked_skill: "subscription-pause-handler",
      },
      {
        // stale email response (>14d) — pushes the stack past the
        // spec's red threshold (81+)
        timestamp: twentyDaysAgo,
        action_phrase: "replied to customer email",
        context: "gamma",
        customer_slug: "gamma",
        invoked_skill: "inbound-classifier",
      },
    ]);
    const mod = await freshImport();
    const risks = await mod.computeChurnRisks();
    expect(risks[0]!.score).toBeGreaterThanOrEqual(81);
    expect(risks[0]!.bucket).toBe("red");
  });

  test("sort by LTV-at-risk descending", async () => {
    await makeCustomer("low-ltv");
    await makeCustomer("high-ltv");
    await fs.writeFile(
      path.join(TMP_HOME, "Documents/businesses/_shared/customers/high-ltv/01-brand.json"),
      JSON.stringify({
        signup_date: new Date(Date.now() - 90 * 86400000).toISOString(),
        total_paid: 5000,
        monthly_amount: 1997,
        status: "active",
      }),
      "utf8"
    );
    await writeRegister([
      {
        timestamp: new Date().toISOString(),
        action_phrase: "customer wants to cancel",
        context: "low-ltv",
        customer_slug: "low-ltv",
        is_ad_hoc: true,
      },
      {
        timestamp: new Date().toISOString(),
        action_phrase: "customer wants to cancel",
        context: "high-ltv",
        customer_slug: "high-ltv",
        is_ad_hoc: true,
      },
    ]);
    const mod = await freshImport();
    const risks = await mod.computeChurnRisks();
    expect(risks[0]!.slug).toBe("high-ltv");
    expect(risks[0]!.ltv_at_risk).toBeGreaterThan(risks[1]!.ltv_at_risk);
  });

  // Spec failure mode: "New customer (<7d): insufficient data → baseline 20."
  test("new customer (<7d) with no signals gets baseline 20 / green", async () => {
    const dir = path.join(
      TMP_HOME,
      "Documents/businesses/_shared/customers/fresh"
    );
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "01-brand.json"),
      JSON.stringify({
        signup_date: new Date(Date.now() - 3 * 86400000).toISOString(),
        total_paid: 497,
        monthly_amount: 497,
        status: "active",
      }),
      "utf8"
    );
    await writeRegister([]);
    const mod = await freshImport();
    const risks = await mod.computeChurnRisks();
    expect(risks[0]!.score).toBe(20);
    expect(risks[0]!.bucket).toBe("green");
    expect(risks[0]!.signals.some((s: string) => s.includes("new customer"))).toBe(
      true
    );
  });

  // The baseline must NOT mask a real first-week danger signal.
  test("new customer (<7d) with a cancel signal keeps the real score", async () => {
    const dir = path.join(
      TMP_HOME,
      "Documents/businesses/_shared/customers/fresh-angry"
    );
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, "01-brand.json"),
      JSON.stringify({
        signup_date: new Date(Date.now() - 2 * 86400000).toISOString(),
        total_paid: 497,
        monthly_amount: 497,
        status: "active",
      }),
      "utf8"
    );
    await writeRegister([
      {
        timestamp: new Date().toISOString(),
        action_phrase: "customer asked to cancel already",
        context: "fresh-angry",
        customer_slug: "fresh-angry",
        is_ad_hoc: true,
      },
    ]);
    const mod = await freshImport();
    const risks = await mod.computeChurnRisks();
    expect(risks[0]!.score).toBeGreaterThanOrEqual(30);
    expect(risks[0]!.signals.some((s: string) => s.includes("cancel"))).toBe(true);
  });

  // Spec failure mode: "cap at 80 unless 3+ signals present." With fewer
  // than 3 signals a customer can never land in the red bucket.
  test("fewer than 3 signals cannot reach red (capped at 80)", async () => {
    await makeCustomer("two-signal");
    await writeRegister([
      {
        timestamp: new Date().toISOString(),
        action_phrase: "customer wants to cancel",
        context: "two-signal",
        customer_slug: "two-signal",
      },
      {
        timestamp: new Date().toISOString(),
        action_phrase: "payment failed",
        context: "two-signal",
        customer_slug: "two-signal",
        invoked_skill: "failed-payment-retry",
      },
    ]);
    const mod = await freshImport();
    const risks = await mod.computeChurnRisks();
    expect(risks[0]!.signals.length).toBeLessThan(3);
    expect(risks[0]!.score).toBeLessThanOrEqual(80);
    expect(risks[0]!.bucket).not.toBe("red");
  });

  // run(): single compute, audit entry, report artifact, single-customer mode.
  test("run() writes report + audit entry and supports single-customer mode", async () => {
    await fs.mkdir(
      path.join(TMP_HOME, "Documents/businesses/_shared/audit"),
      { recursive: true }
    );
    await makeCustomer("solo");
    await writeRegister([
      {
        timestamp: new Date().toISOString(),
        action_phrase: "customer wants to cancel",
        context: "solo",
        customer_slug: "solo",
      },
    ]);
    const mod = await freshImport();
    const outcome = await mod.run({
      context: "solo",
      customer_slug: "solo",
      caller: "telegram",
    });
    expect(outcome.ok).toBe(true);
    expect(outcome.artifacts && outcome.artifacts.length).toBeGreaterThan(0);
    const result = outcome.result as {
      customer_found: boolean;
      customers_scored: number;
    };
    expect(result.customer_found).toBe(true);
    const auditFiles = await fs.readdir(
      path.join(TMP_HOME, "Documents/businesses/_shared/audit")
    );
    expect(auditFiles.some((f) => f.startsWith("audit-"))).toBe(true);
  });
});
