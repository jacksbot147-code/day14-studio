/**
 * Tests for geo-visibility-monitor.
 *
 * Verifies (against docs/seeds/skills/geo-visibility-monitor/SKILL.md):
 *   - No runs → score null (unmeasured ≠ invisible), guidance surfaced
 *   - Rubric math: 0 / 1 / 2 points per cell, normalized to /20
 *   - Latest run per (prompt, engine) cell wins
 *   - Malformed lines skipped, counted, never fatal
 *   - Delta vs previous score-history entry; drop ≥3 surfaces next_action
 *   - run() writes report + appends history + audit entry
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// Fresh import so per-call homedir() reads the swapped-in TMP_HOME.
async function freshImport() {
  vi.resetModules();
  return import("../src/lib/skills/geo-visibility-monitor");
}

let TMP_HOME: string;

beforeEach(async () => {
  TMP_HOME = await fs.mkdtemp(path.join(os.tmpdir(), "geo-test-"));
  await fs.mkdir(
    path.join(TMP_HOME, "Documents/businesses/_shared/customers"),
    { recursive: true }
  );
  process.env.HOME = TMP_HOME;
});

afterEach(async () => {
  await fs.rm(TMP_HOME, { recursive: true, force: true });
});

function geoDir(slug: string) {
  return path.join(
    TMP_HOME,
    `Documents/businesses/_shared/customers/${slug}/07-geo`
  );
}

async function writeRuns(slug: string, lines: (object | string)[]) {
  await fs.mkdir(geoDir(slug), { recursive: true });
  await fs.writeFile(
    path.join(geoDir(slug), "prompt-runs.jsonl"),
    lines
      .map((l) => (typeof l === "string" ? l : JSON.stringify(l)))
      .join("\n") + "\n",
    "utf8"
  );
}

const T0 = "2026-07-01T12:00:00Z";
const T1 = "2026-07-08T12:00:00Z";

describe("geo visibility scoring", () => {
  test("no runs file → score null, not zero", async () => {
    await fs.mkdir(geoDir("empty"), { recursive: true });
    const mod = await freshImport();
    const result = await mod.computeGeoScore("empty");
    expect(result.score).toBeNull();
    expect(result.cells).toBe(0);
  });

  test("all cells mentioned top-3 → perfect 20", async () => {
    await writeRuns("ace", [
      { timestamp: T1, engine: "chatgpt", prompt: "best pool service naples", mentioned: true, position: 1 },
      { timestamp: T1, engine: "perplexity", prompt: "best pool service naples", mentioned: true, position: 2 },
      { timestamp: T1, engine: "google-ai", prompt: "best pool service naples", mentioned: true, position: 3 },
    ]);
    const mod = await freshImport();
    const result = await mod.computeGeoScore("ace");
    expect(result.cells).toBe(3);
    expect(result.score).toBe(20);
  });

  test("rubric math: mentioned-unranked = 1pt, not-mentioned = 0", async () => {
    // 2 cells: one mentioned pos 1 (2 pts), one not mentioned (0 pts)
    // → 2 / 4 × 20 = 10
    await writeRuns("mid", [
      { timestamp: T1, engine: "chatgpt", prompt: "p1", mentioned: true, position: 1 },
      { timestamp: T1, engine: "chatgpt", prompt: "p2", mentioned: false },
    ]);
    const mod = await freshImport();
    const result = await mod.computeGeoScore("mid");
    expect(result.score).toBe(10);
    expect(result.weakestCells).toEqual([{ prompt: "p2", engine: "chatgpt" }]);
  });

  test("mentioned without position scores 1pt not 2", async () => {
    // 1 cell, mentioned, no position → 1/2 × 20 = 10
    await writeRuns("unranked", [
      { timestamp: T1, engine: "perplexity", prompt: "p1", mentioned: true },
    ]);
    const mod = await freshImport();
    const result = await mod.computeGeoScore("unranked");
    expect(result.score).toBe(10);
  });

  test("latest run per (prompt, engine) cell wins", async () => {
    await writeRuns("churny", [
      { timestamp: T0, engine: "chatgpt", prompt: "p1", mentioned: true, position: 1 },
      { timestamp: T1, engine: "chatgpt", prompt: "p1", mentioned: false },
    ]);
    const mod = await freshImport();
    const result = await mod.computeGeoScore("churny");
    expect(result.cells).toBe(1);
    expect(result.score).toBe(0);
  });

  test("malformed lines are skipped and counted, never fatal", async () => {
    await writeRuns("messy", [
      "not json at all {{{",
      { timestamp: T1, engine: "fax-machine", prompt: "p1", mentioned: true },
      { timestamp: T1, engine: "chatgpt", prompt: "p1", mentioned: true, position: 1 },
    ]);
    const mod = await freshImport();
    const result = await mod.computeGeoScore("messy");
    expect(result.skippedLines).toBe(2);
    expect(result.cells).toBe(1);
    expect(result.score).toBe(20);
  });

  test("delta computed vs previous score-history entry", async () => {
    await writeRuns("trend", [
      { timestamp: T1, engine: "chatgpt", prompt: "p1", mentioned: true, position: 1 },
    ]);
    await fs.appendFile(
      path.join(geoDir("trend"), "score-history.jsonl"),
      JSON.stringify({ timestamp: T0, score: 8, cells: 1, delta: null }) + "\n",
      "utf8"
    );
    const mod = await freshImport();
    const result = await mod.computeGeoScore("trend");
    expect(result.score).toBe(20);
    expect(result.delta).toBe(12);
  });

  test("partial engine coverage is reported", async () => {
    await writeRuns("partial", [
      { timestamp: T1, engine: "chatgpt", prompt: "p1", mentioned: true },
    ]);
    const mod = await freshImport();
    const result = await mod.computeGeoScore("partial");
    expect(result.enginesMeasured).toBe(1);
  });
});

describe("run()", () => {
  test("no GEO customers → ok with prompt-pack guidance, no report", async () => {
    const mod = await freshImport();
    const outcome = await mod.run({ context: "test", caller: "vitest" });
    expect(outcome.ok).toBe(true);
    expect(
      (outcome.next_actions ?? []).some((a: string) => a.includes("prompt pack"))
    ).toBe(true);
  });

  test("writes report + appends history + audit entry", async () => {
    await writeRuns("sunny", [
      { timestamp: T1, engine: "chatgpt", prompt: "p1", mentioned: true, position: 1 },
      { timestamp: T1, engine: "perplexity", prompt: "p1", mentioned: false },
    ]);
    const mod = await freshImport();
    const outcome = await mod.run({
      context: "sunny",
      customer_slug: "sunny",
      caller: "vitest",
    });
    expect(outcome.ok).toBe(true);
    expect(outcome.artifacts?.length).toBe(1);

    const reportText = await fs.readFile(outcome.artifacts![0]!, "utf8");
    expect(reportText).toContain("/20");
    expect(reportText).toContain("first measurement");

    const history = await fs.readFile(
      path.join(geoDir("sunny"), "score-history.jsonl"),
      "utf8"
    );
    expect(history.trim().split("\n").length).toBe(1);

    const auditFiles = await fs.readdir(
      path.join(TMP_HOME, "Documents/businesses/_shared/audit")
    );
    expect(auditFiles.some((f) => f.startsWith("audit-"))).toBe(true);
  });

  test("score drop ≥3 surfaces a Jack review next_action", async () => {
    await writeRuns("slipping", [
      { timestamp: T1, engine: "chatgpt", prompt: "p1", mentioned: false },
      { timestamp: T1, engine: "chatgpt", prompt: "p2", mentioned: true },
    ]);
    // Previous score 15 → new score round(1/4×20)=5 → delta -10
    await fs.appendFile(
      path.join(geoDir("slipping"), "score-history.jsonl"),
      JSON.stringify({ timestamp: T0, score: 15, cells: 2, delta: null }) + "\n",
      "utf8"
    );
    const mod = await freshImport();
    const outcome = await mod.run({
      context: "slipping",
      customer_slug: "slipping",
      caller: "vitest",
    });
    expect(outcome.ok).toBe(true);
    expect(
      (outcome.next_actions ?? []).some(
        (a: string) => a.includes("dropped") && a.includes("No automated sends")
      )
    ).toBe(true);
  });

  test("customer with empty runs → unmeasured, no report written", async () => {
    await fs.mkdir(geoDir("blank"), { recursive: true });
    await fs.writeFile(path.join(geoDir("blank"), "prompt-runs.jsonl"), "", "utf8");
    const mod = await freshImport();
    const outcome = await mod.run({
      context: "blank",
      customer_slug: "blank",
      caller: "vitest",
    });
    expect(outcome.ok).toBe(true);
    expect(outcome.artifacts ?? []).toHaveLength(0);
    const result = outcome.result as { customers_unmeasured: number };
    expect(result.customers_unmeasured).toBe(1);
  });
});
