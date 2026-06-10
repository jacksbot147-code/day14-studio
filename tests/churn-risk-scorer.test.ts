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
});
