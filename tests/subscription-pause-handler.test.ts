/**
 * Tests for subscription-pause-handler.
 *
 * Verifies:
 *   - Successful pause writes status + queues card
 *   - Duration capped at 30 days
 *   - Default duration is 30 days
 *   - Already-paused customer → error
 *   - Missing customer → error
 *   - Dossier 02-status.md gets entry
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
  return import("../src/lib/skills/subscription-pause-handler");
}

let TMP_HOME: string;

beforeEach(async () => {
  TMP_HOME = await fs.mkdtemp(path.join(os.tmpdir(), "pause-test-"));
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

async function makeCustomer(slug: string, extras: object = {}) {
  const dir = path.join(TMP_HOME, `Documents/businesses/_shared/customers/${slug}`);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "01-brand.json"),
    JSON.stringify({
      status: "active",
      monthly_amount: 497,
      stripe_subscription_id: "sub_test",
      ...extras,
    }),
    "utf8"
  );
}

describe("subscription pause", () => {
  test("successful pause queues card + writes status", async () => {
    await makeCustomer("alpha");
    const mod = await freshImport();
    const result = await mod.processPause({
      customer_slug: "alpha",
      reason: "vacation",
    });
    expect(result.ok).toBe(true);
    expect(result.pause_until).toBeInstanceOf(Date);
    expect(result.jack_tap_required).toBe(true);
    expect(result.artifacts.length).toBeGreaterThan(0);
  });

  test("default duration is 30 days", async () => {
    await makeCustomer("beta");
    const mod = await freshImport();
    const result = await mod.processPause({
      customer_slug: "beta",
      reason: "test",
    });
    const diffDays = Math.round(
      (result.pause_until!.getTime() - Date.now()) / 86400000
    );
    expect(diffDays).toBe(30);
  });

  test("duration capped at 30 days", async () => {
    await makeCustomer("gamma");
    const mod = await freshImport();
    const result = await mod.processPause({
      customer_slug: "gamma",
      reason: "test",
      pause_duration_days: 90,
    });
    const diffDays = Math.round(
      (result.pause_until!.getTime() - Date.now()) / 86400000
    );
    expect(diffDays).toBe(30);
  });

  test("already-paused customer → error", async () => {
    await makeCustomer("delta", { status: "paused" });
    const mod = await freshImport();
    const result = await mod.processPause({
      customer_slug: "delta",
      reason: "test",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("already paused");
  });

  test("missing customer → error", async () => {
    const mod = await freshImport();
    const result = await mod.processPause({
      customer_slug: "ghost",
      reason: "test",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("not found");
  });

  test("dossier status file updated", async () => {
    await makeCustomer("epsilon");
    const mod = await freshImport();
    await mod.processPause({
      customer_slug: "epsilon",
      reason: "out of town",
    });
    const statusPath = path.join(
      TMP_HOME,
      "Documents/businesses/_shared/customers/epsilon/02-status.md"
    );
    const text = await fs.readFile(statusPath, "utf8");
    expect(text).toContain("Paused at");
    expect(text).toContain("$497");
  });

  test("third pause in 12 months → converted to cancel-with-win-back", async () => {
    await makeCustomer("zeta", {
      pause_history: [
        { paused_at: new Date(Date.now() - 90 * 86400000).toISOString() },
        { paused_at: new Date(Date.now() - 30 * 86400000).toISOString() },
      ],
    });
    const mod = await freshImport();
    const result = await mod.processPause({
      customer_slug: "zeta",
      reason: "test",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("cancel-with-win-back");
    // Spec failure mode: the conversion must actually happen — a real Jack-tap
    // card is queued and the win-back is scheduled (previously: nothing).
    expect(result.jack_tap_required).toBe(true);
    expect(result.artifacts.length).toBeGreaterThan(0);
    expect(result.artifacts[0]).toContain("pause-to-cancel-zeta");
    expect(result.next_actions?.[0]).toContain("win-back-campaign-trigger");
    // CLAUDE.md rule 5: the policy decision is audit-logged.
    const auditDir = path.join(
      TMP_HOME,
      "Documents/businesses/_shared/audit"
    );
    const files = await fs.readdir(auditDir);
    const auditFile = files.find((f) => f.startsWith("audit-"));
    expect(auditFile).toBeDefined();
    const auditText = await fs.readFile(
      path.join(auditDir, auditFile!),
      "utf8"
    );
    expect(auditText).toContain("pause_blocked_converted_to_cancel");
  });

  test("pauses older than 12 months don't count toward the limit", async () => {
    await makeCustomer("zeta-old", {
      pause_history: [
        { paused_at: new Date(Date.now() - 400 * 86400000).toISOString() },
        { paused_at: new Date(Date.now() - 380 * 86400000).toISOString() },
      ],
    });
    const mod = await freshImport();
    const result = await mod.processPause({
      customer_slug: "zeta-old",
      reason: "test",
    });
    expect(result.ok).toBe(true);
  });

  test("malformed pause dates count conservatively toward the limit", async () => {
    await makeCustomer("zeta-bad", {
      pause_history: [
        { paused_at: "not-a-date" },
        { paused_at: "" },
      ],
    });
    const mod = await freshImport();
    const result = await mod.processPause({
      customer_slug: "zeta-bad",
      reason: "test",
    });
    // Two unparseable dates are treated as two real pauses → blocked.
    expect(result.ok).toBe(false);
    expect(result.error).toContain("cancel-with-win-back");
  });

  test("non-finite duration falls back to 30 days (no Invalid Date)", async () => {
    await makeCustomer("eta");
    const mod = await freshImport();
    const result = await mod.processPause({
      customer_slug: "eta",
      reason: "test",
      pause_duration_days: Number.NaN,
    });
    expect(result.ok).toBe(true);
    expect(result.pause_until).toBeInstanceOf(Date);
    expect(Number.isNaN(result.pause_until!.getTime())).toBe(false);
    const diffDays = Math.round(
      (result.pause_until!.getTime() - Date.now()) / 86400000
    );
    expect(diffDays).toBe(30);
  });

  test("successful pause audit-logs pause_requested", async () => {
    await makeCustomer("theta");
    const mod = await freshImport();
    await mod.processPause({ customer_slug: "theta", reason: "vacation" });
    const auditDir = path.join(
      TMP_HOME,
      "Documents/businesses/_shared/audit"
    );
    const files = await fs.readdir(auditDir);
    const auditFile = files.find((f) => f.startsWith("audit-"));
    expect(auditFile).toBeDefined();
    const auditText = await fs.readFile(
      path.join(auditDir, auditFile!),
      "utf8"
    );
    expect(auditText).toContain("pause_requested");
  });

  test("confirmation card states the exact resume date and auto-resume", async () => {
    await makeCustomer("iota");
    const mod = await freshImport();
    const result = await mod.processPause({
      customer_slug: "iota",
      reason: "travel",
    });
    const cardPath = result.artifacts.find((a) => a.includes("pause-confirm"));
    expect(cardPath).toBeDefined();
    const card = JSON.parse(await fs.readFile(cardPath!, "utf8"));
    const resumeDate = result.pause_until!.toISOString().slice(0, 10);
    expect(card.text).toContain(resumeDate);
    expect(card.text).toContain("never auto-cancels");
  });
});
