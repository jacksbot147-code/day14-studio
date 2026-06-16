/**
 * Tests for refund-handler.
 *
 * Verifies decision tree:
 *   - 0-7 days: auto-issue if < $500, else queue Jack-tap
 *   - 7-30 days: queue Jack-tap
 *   - 30+ days: decline + credit
 *   - override_window flag: treats as day 0
 *   - Missing customer: error
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
  return import("../src/lib/skills/refund-handler");
}

let TMP_HOME: string;

beforeEach(async () => {
  TMP_HOME = await fs.mkdtemp(path.join(os.tmpdir(), "refund-test-"));
  await fs.mkdir(
    path.join(TMP_HOME, "Documents/businesses/_shared/customers"),
    { recursive: true }
  );
  await fs.mkdir(
    path.join(TMP_HOME, "Documents/businesses/_shared/telegram/outbox"),
    { recursive: true }
  );
  await fs.mkdir(
    path.join(TMP_HOME, "Documents/businesses/_shared/audit"),
    { recursive: true }
  );
  process.env.HOME = TMP_HOME;
});

afterEach(async () => {
  await fs.rm(TMP_HOME, { recursive: true, force: true });
});

async function makeCustomer(
  slug: string,
  fields: { signup_date?: string; total_paid?: number; last_charge_amount?: number; status?: string }
) {
  const dir = path.join(TMP_HOME, `Documents/businesses/_shared/customers/${slug}`);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "01-brand.json"),
    JSON.stringify(fields),
    "utf8"
  );
}

describe("refund decision", () => {
  test("within 7 days + small amount → auto_issue", async () => {
    const recent = new Date(Date.now() - 3 * 86400000).toISOString();
    await makeCustomer("alpha", {
      signup_date: recent,
      last_charge_amount: 49700, // $497
    });
    const mod = await freshImport();
    const result = await mod.processRefund({
      customer_slug: "alpha",
      reason: "test",
    });
    expect(result.ok).toBe(true);
    expect(result.decision!.action).toBe("auto_issue");
    expect(result.decision!.window).toBe("7d");
  });

  test("within 7 days + large amount → queue_for_tap", async () => {
    const recent = new Date(Date.now() - 1 * 86400000).toISOString();
    await makeCustomer("beta", {
      signup_date: recent,
      last_charge_amount: 100000, // $1000
    });
    const mod = await freshImport();
    const result = await mod.processRefund({
      customer_slug: "beta",
      reason: "test",
    });
    expect(result.decision!.action).toBe("queue_for_tap");
    expect(result.decision!.window).toBe("7d");
  });

  test("7-30 day window → queue_for_tap", async () => {
    const midRange = new Date(Date.now() - 15 * 86400000).toISOString();
    await makeCustomer("gamma", {
      signup_date: midRange,
      last_charge_amount: 49700,
    });
    const mod = await freshImport();
    const result = await mod.processRefund({
      customer_slug: "gamma",
      reason: "found cheaper",
    });
    expect(result.decision!.action).toBe("queue_for_tap");
    expect(result.decision!.window).toBe("30d");
  });

  test("outside 30 days → decline_with_credit", async () => {
    const old = new Date(Date.now() - 60 * 86400000).toISOString();
    await makeCustomer("delta", {
      signup_date: old,
      last_charge_amount: 49700,
    });
    const mod = await freshImport();
    const result = await mod.processRefund({
      customer_slug: "delta",
      reason: "changed mind",
    });
    expect(result.decision!.action).toBe("decline_with_credit");
    expect(result.decision!.window).toBe("outside");
  });

  test("missing customer → error", async () => {
    const mod = await freshImport();
    const result = await mod.processRefund({
      customer_slug: "does-not-exist",
      reason: "test",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("not found");
  });

  test("dossier 03-refunds.md is created", async () => {
    const recent = new Date(Date.now() - 3 * 86400000).toISOString();
    await makeCustomer("epsilon", {
      signup_date: recent,
      last_charge_amount: 49700,
    });
    const mod = await freshImport();
    await mod.processRefund({
      customer_slug: "epsilon",
      reason: "test",
    });
    const dossierPath = path.join(
      TMP_HOME,
      "Documents/businesses/_shared/customers/epsilon/03-refunds.md"
    );
    const text = await fs.readFile(dossierPath, "utf8");
    expect(text).toContain("refund request");
    expect(text).toContain("$497.00");
  });
});

// Helper: read every queued Telegram outbox card for a slug.
async function readOutboxCards(slug: string) {
  const dir = path.join(TMP_HOME, "Documents/businesses/_shared/telegram/outbox");
  const files = (await fs.readdir(dir)).filter((f) => f.includes(slug));
  return Promise.all(
    files.map(async (f) => ({
      file: f,
      json: JSON.parse(await fs.readFile(path.join(dir, f), "utf8")),
    }))
  );
}

describe("hard rules + spec compliance", () => {
  test("hard rule 1: empty/whitespace reason is rejected", async () => {
    await makeCustomer("alpha", {
      signup_date: new Date(Date.now() - 3 * 86400000).toISOString(),
      last_charge_amount: 49700,
    });
    const mod = await freshImport();
    const result = await mod.processRefund({ customer_slug: "alpha", reason: "   " });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("reason required");
  });

  test("hard rule 2: refund_amount above last charge is clamped", async () => {
    await makeCustomer("alpha", {
      signup_date: new Date(Date.now() - 3 * 86400000).toISOString(),
      last_charge_amount: 49700,
    });
    const mod = await freshImport();
    const result = await mod.processRefund({
      customer_slug: "alpha",
      reason: "overcharge claim",
      refund_amount: 100000, // $1000 requested, only $497 charged
    });
    expect(result.decision!.amount_cents).toBe(49700);
    expect(result.decision!.reason).toContain("clamped");
    // still inside the 7d guarantee and now under $500 → auto_issue
    expect(result.decision!.action).toBe("auto_issue");
  });

  test("spec rule 6: 7-30d card is P2; spec rule 7 large-7d card is P1", async () => {
    await makeCustomer("gamma", {
      signup_date: new Date(Date.now() - 15 * 86400000).toISOString(),
      last_charge_amount: 49700,
    });
    await makeCustomer("beta", {
      signup_date: new Date(Date.now() - 1 * 86400000).toISOString(),
      last_charge_amount: 100000,
    });
    const mod = await freshImport();
    await mod.processRefund({ customer_slug: "gamma", reason: "found cheaper" });
    await mod.processRefund({ customer_slug: "beta", reason: "too pricey" });

    const [gammaCard] = await readOutboxCards("gamma");
    const [betaCard] = await readOutboxCards("beta");
    expect(gammaCard!.json.urgency).toBe("P2");
    expect(gammaCard!.json.action).toBe("issue_refund");
    expect(betaCard!.json.urgency).toBe("P1");
  });

  test("spec rule 7: 30d+ queues a credit-offer card, taps Jack, schedules win-back", async () => {
    await makeCustomer("delta", {
      signup_date: new Date(Date.now() - 60 * 86400000).toISOString(),
      last_charge_amount: 49700,
    });
    const mod = await freshImport();
    const result = await mod.processRefund({
      customer_slug: "delta",
      reason: "changed mind",
    });
    expect(result.decision!.action).toBe("decline_with_credit");
    expect(result.jack_tap_required).toBe(true);
    expect(result.next_actions?.some((a) => a.includes("win-back"))).toBe(true);

    const cards = await readOutboxCards("delta");
    expect(cards).toHaveLength(1);
    expect(cards[0]!.json.action).toBe("offer_credit");
    expect(cards[0]!.json.urgency).toBe("P2");
    expect(cards[0]!.file).toContain("credit-offer");
  });

  test("unknown signup date escalates to Jack instead of declining", async () => {
    await makeCustomer("eta", { last_charge_amount: 49700 }); // no signup_date
    const mod = await freshImport();
    const result = await mod.processRefund({ customer_slug: "eta", reason: "test" });
    expect(result.decision!.action).toBe("queue_for_tap");
    expect(result.decision!.reason).toContain("signup date unknown");
    expect(result.jack_tap_required).toBe(true);
  });

  test("override_window forces day-0 auto_issue even for an old customer", async () => {
    await makeCustomer("theta", {
      signup_date: new Date(Date.now() - 200 * 86400000).toISOString(),
      last_charge_amount: 30000,
    });
    const mod = await freshImport();
    const result = await mod.processRefund({
      customer_slug: "theta",
      reason: "jack override",
      override_window: true,
    });
    expect(result.decision!.action).toBe("auto_issue");
    expect(result.decision!.window).toBe("7d");
  });
});
