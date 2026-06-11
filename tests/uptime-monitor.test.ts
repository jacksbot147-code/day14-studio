/**
 * Tests for uptime-monitor.
 *
 * Verifies (against docs/seeds/skills/uptime-monitor/SKILL.md):
 *   - URL discovery from 01-brand.json and the 02-status.md fallback
 *   - Healthy check → jsonl appended, no alert
 *   - Alert fires only when the streak crosses ALERT_AFTER_CHECKS (2),
 *     and is suppressed on later cycles while still down (hard rule 4)
 *   - Recovery after an alerted outage writes uptime_recovered
 *   - Network errors / timeouts produce ok:false with an error message
 *   - One customer's failure doesn't kill the rest of the cycle
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// Re-import fresh so module-level homedir() captures see the swapped-in
// TMP_HOME (same pattern as churn-risk-scorer.test.ts).
async function freshImport() {
  vi.resetModules();
  return import("../src/lib/skills/uptime-monitor");
}

let TMP_HOME: string;
const SHARED = () => path.join(TMP_HOME, "Documents/businesses/_shared");

beforeEach(async () => {
  TMP_HOME = await fs.mkdtemp(path.join(os.tmpdir(), "uptime-test-"));
  await fs.mkdir(path.join(SHARED(), "customers"), { recursive: true });
  process.env.HOME = TMP_HOME;
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await fs.rm(TMP_HOME, { recursive: true, force: true });
});

async function makeCustomer(
  slug: string,
  brand: Record<string, unknown> | null,
  statusMd?: string
) {
  const dir = path.join(SHARED(), `customers/${slug}`);
  await fs.mkdir(dir, { recursive: true });
  if (brand) {
    await fs.writeFile(path.join(dir, "01-brand.json"), JSON.stringify(brand), "utf8");
  }
  if (statusMd) {
    await fs.writeFile(path.join(dir, "02-status.md"), statusMd, "utf8");
  }
}

function stubFetch(handler: (url: string) => { status: number } | Error) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL) => {
      const out = handler(String(url));
      if (out instanceof Error) throw out;
      return { status: out.status } as Response;
    })
  );
}

async function readAuditEntries(): Promise<Array<Record<string, unknown>>> {
  const month = new Date().toISOString().slice(0, 7);
  const file = path.join(SHARED(), `audit/audit-${month}.jsonl`);
  const text = await fs.readFile(file, "utf8").catch(() => "");
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

describe("url discovery", () => {
  test("reads url from 01-brand.json, builds https from bare domain", async () => {
    await makeCustomer("alpha", { domain: "alpha.com" });
    stubFetch(() => ({ status: 200 }));
    const mod = await freshImport();
    const { checks } = await mod.runUptimeCycle();
    expect(checks.length).toBe(1);
    expect(checks[0]!.url).toBe("https://alpha.com");
    expect(checks[0]!.customer_slug).toBe("alpha");
  });

  test("falls back to 02-status.md frontmatter when brand.json has no url", async () => {
    await makeCustomer("beta", { status: "active" }, "---\ndomain: beta.io\n---\n");
    stubFetch(() => ({ status: 200 }));
    const mod = await freshImport();
    const { checks } = await mod.runUptimeCycle();
    expect(checks.length).toBe(1);
    expect(checks[0]!.url).toBe("https://beta.io");
  });
});

describe("check + alert lifecycle", () => {
  test("healthy site: jsonl appended, no alert", async () => {
    await makeCustomer("alpha", { url: "https://alpha.com" });
    stubFetch(() => ({ status: 200 }));
    const mod = await freshImport();
    const { checks, alerts } = await mod.runUptimeCycle();
    expect(checks[0]!.ok).toBe(true);
    expect(alerts.length).toBe(0);

    const date = new Date().toISOString().slice(0, 10);
    const log = await fs.readFile(
      path.join(SHARED(), `uptime/alpha-${date}.jsonl`),
      "utf8"
    );
    expect(log.trim().split("\n").length).toBe(1);
  });

  test("redirect (3xx) counts as up, 5xx counts as down", async () => {
    await makeCustomer("alpha", { url: "https://alpha.com" });
    stubFetch(() => ({ status: 302 }));
    let mod = await freshImport();
    let res = await mod.runUptimeCycle();
    expect(res.checks[0]!.ok).toBe(true);

    stubFetch(() => ({ status: 503 }));
    mod = await freshImport();
    res = await mod.runUptimeCycle();
    expect(res.checks[0]!.ok).toBe(false);
  });

  test("alerts on 2nd consecutive failure, suppresses on 3rd, logs recovery", async () => {
    await makeCustomer("alpha", { url: "https://alpha.com" });
    stubFetch(() => ({ status: 503 }));
    const mod = await freshImport();

    // Cycle 1: first failure — no alert yet (could be a blip)
    let res = await mod.runUptimeCycle();
    expect(res.alerts.length).toBe(0);

    // Cycle 2: streak crosses threshold — alert exactly once
    res = await mod.runUptimeCycle();
    expect(res.alerts.length).toBe(1);
    expect(res.alerts[0]!.customer_slug).toBe("alpha");

    // Cycle 3: still down — suppressed (spec hard rule 4)
    res = await mod.runUptimeCycle();
    expect(res.alerts.length).toBe(0);

    let audit = await readAuditEntries();
    expect(audit.filter((e) => e.action === "uptime_alert").length).toBe(1);

    // Cycle 4: back up — recovery follow-up logged
    stubFetch(() => ({ status: 200 }));
    res = await mod.runUptimeCycle();
    expect(res.alerts.length).toBe(0);
    audit = await readAuditEntries();
    const recoveries = audit.filter((e) => e.action === "uptime_recovered");
    expect(recoveries.length).toBe(1);
    expect((recoveries[0]!.details as Record<string, unknown>).url).toBe(
      "https://alpha.com"
    );
  });

  test("single failure then recovery: no alert, no recovery entry", async () => {
    await makeCustomer("alpha", { url: "https://alpha.com" });
    stubFetch(() => ({ status: 500 }));
    const mod = await freshImport();
    await mod.runUptimeCycle();

    stubFetch(() => ({ status: 200 }));
    await mod.runUptimeCycle();

    const audit = await readAuditEntries();
    expect(audit.filter((e) => e.action === "uptime_alert").length).toBe(0);
    expect(audit.filter((e) => e.action === "uptime_recovered").length).toBe(0);
  });
});

describe("resilience", () => {
  test("network error: ok=false with error message, cycle completes", async () => {
    await makeCustomer("alpha", { url: "https://alpha.com" });
    stubFetch(() => new Error("getaddrinfo ENOTFOUND alpha.com"));
    const mod = await freshImport();
    const { checks } = await mod.runUptimeCycle();
    expect(checks[0]!.ok).toBe(false);
    expect(checks[0]!.error).toContain("ENOTFOUND");
  });

  test("one customer erroring does not stop the others", async () => {
    await makeCustomer("alpha", { url: "https://alpha.com" });
    await makeCustomer("beta", { url: "https://beta.com" });
    stubFetch((url) =>
      url.includes("alpha") ? new Error("connection reset") : { status: 200 }
    );
    const mod = await freshImport();
    const { checks } = await mod.runUptimeCycle();
    expect(checks.length).toBe(2);
    expect(checks.some((c) => c.ok)).toBe(true);
    expect(checks.some((c) => !c.ok)).toBe(true);
  });

  test("run() returns SkillOutcome with jack_tap_required only when alerting", async () => {
    await makeCustomer("alpha", { url: "https://alpha.com" });
    stubFetch(() => ({ status: 200 }));
    const mod = await freshImport();
    const outcome = await mod.run({
      context: "test",
      customer_slug: "alpha",
    } as Parameters<typeof mod.run>[0]);
    expect(outcome.ok).toBe(true);
    expect(outcome.jack_tap_required).toBe(false);
  });
});
