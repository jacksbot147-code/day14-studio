/**
 * Tests for work-register — append + read roundtrip in a temp HOME.
 *
 * The module captures homedir() at import time, so each test swaps
 * process.env.HOME to a temp dir and freshly re-imports the module.
 * Nothing is ever written to the real ~/Documents/businesses.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

let TMP_HOME: string;

async function freshImport() {
  vi.resetModules();
  return import("../src/lib/work-register");
}

function registerPath(): string {
  return path.join(
    TMP_HOME,
    "Documents/businesses/_shared/growth/work-register.jsonl"
  );
}

async function readEntries(): Promise<Array<Record<string, unknown>>> {
  const text = await fs.readFile(registerPath(), "utf8");
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

beforeEach(async () => {
  TMP_HOME = await fs.mkdtemp(path.join(os.tmpdir(), "work-register-test-"));
  process.env.HOME = TMP_HOME;
});

afterEach(async () => {
  await fs.rm(TMP_HOME, { recursive: true, force: true });
});

describe("work-register roundtrip", () => {
  test("logAction appends a timestamped JSONL entry", async () => {
    const mod = await freshImport();
    await mod.logAction({
      action_phrase: "did a substantive thing",
      context: "session-1",
      customer_slug: "alpha",
      agent: "test-agent",
    });

    const entries = await readEntries();
    expect(entries.length).toBe(1);
    expect(entries[0]!.action_phrase).toBe("did a substantive thing");
    expect(entries[0]!.context).toBe("session-1");
    expect(entries[0]!.customer_slug).toBe("alpha");
    expect(entries[0]!.agent).toBe("test-agent");
    expect(typeof entries[0]!.timestamp).toBe("string");
    expect(Number.isNaN(new Date(entries[0]!.timestamp as string).getTime())).toBe(false);
  });

  test("multiple appends preserve order (append-only)", async () => {
    const mod = await freshImport();
    await mod.logAction({ action_phrase: "first", context: "c1" });
    await mod.logAction({ action_phrase: "second", context: "c2" });
    await mod.logSkillInvocation("uptime-monitor", "c3", "beta");

    const entries = await readEntries();
    expect(entries.map((e) => e.action_phrase)).toEqual([
      "first",
      "second",
      "invoked uptime-monitor",
    ]);
    expect(entries[2]!.invoked_skill).toBe("uptime-monitor");
    expect(entries[2]!.customer_slug).toBe("beta");
  });

  test("logAdHoc marks entries ad-hoc; meta contexts flagged", async () => {
    const mod = await freshImport();
    await mod.logAdHoc("patched a customer site by hand", "customer-alpha");
    await mod.logAdHoc("tweaked watcher thresholds", "growth-watcher");

    const entries = await readEntries();
    expect(entries[0]!.is_ad_hoc).toBe(true);
    expect(entries[0]!.is_meta).toBe(false);
    expect(entries[1]!.is_meta).toBe(true);
  });

  test("logError appends a type:error entry for /dashboard/system", async () => {
    const mod = await freshImport();
    await mod.logError("webhook-stripe", new Error("boom"), "stripe-evt_1", "handler threw");

    const entries = await readEntries();
    expect(entries.length).toBe(1);
    expect(entries[0]!.type).toBe("error");
    expect(entries[0]!.source).toBe("webhook-stripe");
    expect(entries[0]!.action_phrase).toContain("boom");
    expect(entries[0]!.context).toBe("stripe-evt_1");
    expect(entries[0]!.notes).toBe("handler threw");
  });

  test("logError never throws (fire-and-forget)", async () => {
    const mod = await freshImport();
    // Non-Error values must serialize without throwing
    await expect(mod.logError("x", { weird: true })).resolves.toBeUndefined();
    await expect(mod.logError("x", "plain string")).resolves.toBeUndefined();
  });
});
