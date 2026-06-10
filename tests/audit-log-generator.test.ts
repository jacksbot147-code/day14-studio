/**
 * Tests for audit-log-generator.
 *
 * Verifies:
 *   - Single entry appends with valid hash
 *   - Multi-entry hash chain is intact
 *   - Tampered entry breaks chain verification
 *   - Search query filters correctly
 *
 * Tests use a temporary AUDIT_DIR via env override — see redirectHome().
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// We need to redirect HOME before importing the module under test,
// because it captures AUDIT_DIR at module load time. Use a sub-namespace.
// Re-import the module fresh so module-level homedir() captures see the
// swapped-in TMP_HOME (replaces the old `?bust=` query-string trick, which
// vite's dynamic-import analysis rejects).
async function freshImport() {
  vi.resetModules();
  return import("../src/lib/skills/audit-log-generator");
}

let TMP_HOME: string;

beforeEach(async () => {
  TMP_HOME = await fs.mkdtemp(path.join(os.tmpdir(), "audit-test-"));
  await fs.mkdir(path.join(TMP_HOME, "Documents/businesses/_shared/audit"), {
    recursive: true,
  });
  process.env.HOME = TMP_HOME;
});

afterEach(async () => {
  await fs.rm(TMP_HOME, { recursive: true, force: true });
});

describe("auditLog single entry", () => {
  test("appends entry with hash and prev_hash", async () => {
    // Re-import under the new HOME — use a fresh import for each test
    const mod = await freshImport();
    const result = await mod.auditLog({
      action: "test_action",
      actor: "test",
    });
    expect(result.ok).toBe(true);
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.path).toContain(".jsonl");
  });
});

describe("auditLog hash chain", () => {
  test("multiple entries chain prev_hash correctly", async () => {
    const mod = await freshImport();
    const r1 = await mod.auditLog({ action: "act1", actor: "test" });
    const r2 = await mod.auditLog({ action: "act2", actor: "test" });
    const r3 = await mod.auditLog({ action: "act3", actor: "test" });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(true);
    expect(r1.hash).not.toEqual(r2.hash);
    expect(r2.hash).not.toEqual(r3.hash);

    // Verify the chain
    const month = new Date().toISOString().slice(0, 7);
    const verification = await mod.verifyChain(month);
    expect(verification.ok).toBe(true);
    expect(verification.entries).toBe(3);
  });

  test("tampering with an entry breaks the chain", async () => {
    const mod = await freshImport();
    await mod.auditLog({ action: "act1", actor: "test" });
    await mod.auditLog({ action: "act2", actor: "test" });
    await mod.auditLog({ action: "act3", actor: "test" });

    const month = new Date().toISOString().slice(0, 7);
    const filePath = path.join(
      TMP_HOME,
      `Documents/businesses/_shared/audit/audit-${month}.jsonl`
    );
    let text = await fs.readFile(filePath, "utf8");
    // Tamper with entry 2: replace "act2" with "TAMPERED"
    text = text.replace('"action":"act2"', '"action":"TAMPERED"');
    await fs.writeFile(filePath, text, "utf8");

    const verification = await mod.verifyChain(month);
    expect(verification.ok).toBe(false);
    expect(verification.reason).toContain("tampering");
  });
});

describe("searchAudit", () => {
  test("filters by action", async () => {
    const mod = await freshImport();
    await mod.auditLog({ action: "refund_issued", actor: "jack" });
    await mod.auditLog({ action: "draft_promoted", actor: "jack" });
    await mod.auditLog({ action: "refund_issued", actor: "jack" });

    const refunds = await mod.searchAudit({ action: "refund_issued" });
    expect(refunds.length).toBe(2);
    refunds.forEach((r: any) => expect(r.action).toBe("refund_issued"));
  });

  test("filters by customer_slug", async () => {
    const mod = await freshImport();
    await mod.auditLog({ action: "act", actor: "j", customer_slug: "alpha" });
    await mod.auditLog({ action: "act", actor: "j", customer_slug: "beta" });
    await mod.auditLog({ action: "act", actor: "j", customer_slug: "alpha" });

    const alpha = await mod.searchAudit({ customer_slug: "alpha" });
    expect(alpha.length).toBe(2);
  });
});
