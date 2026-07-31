#!/usr/bin/env -S npx tsx
/**
 * pain-index CLI — compute "where does it hurt", write one json, overwrite it.
 *
 * NOTE ON THE EXTENSION: this is .mts, not .mjs, on purpose. The rule engine
 * lives in src/lib/pain-index.ts and tsconfig sets allowJs:false, so a .mjs
 * script could not import it without duplicating the logic — and duplicated
 * scoring logic is how two answers to the same question start disagreeing.
 * Run it with tsx (already a dependency):
 *
 *     npx tsx scripts/pain-index.mts --selftest
 *     npx tsx scripts/pain-index.mts --check     read + print, write nothing
 *     npx tsx scripts/pain-index.mts --write     write public/data/ops/pain-index.json
 *
 * No network. No model calls. No deletes.
 */

import { computePainIndex, mergeWithPrevious, SEVERITY_FLOOR, type PainInputs } from "../src/lib/pain-index";
import { gatherPainInputs, readPainIndex, writePainIndex, PAIN_INDEX_PATH } from "../src/lib/pain-index-store";

function baseInputs(now: Date): PainInputs {
  return {
    now,
    ledger: null,
    loopGateConfig: null,
    loopGateState: null,
    loopGateWiredInto: 0,
    workRegister: null,
    heartbeats: null,
    sync: null,
    radar: null,
    unreadSources: [],
  };
}

function selftest(): number {
  const now = new Date("2026-07-31T02:30:00.000Z");
  let failures = 0;
  const check = (name: string, pass: boolean, detail = "") => {
    if (!pass) failures++;
    console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  };

  // 1. Healthy system produces NOTHING. This is the case that matters most:
  //    an index that always has something to say has stopped discriminating.
  const healthy = computePainIndex({
    ...baseInputs(now),
    ledger: { consecutive_failures: 0, last_success_at: "2026-07-31T02:00:00.000Z", days: {} },
    loopGateConfig: { loops: { a: {} } },
    loopGateState: { loops: { a: { runs: 4, noop_streak: 0 } } },
    workRegister: { count: 10, last_timestamp: "2026-07-31T01:00:00.000Z" },
    heartbeats: [{ name: "p1", age_min: 1 }],
    sync: { consecutive_failures: 0 },
    radar: { rings: { adopt: [{ item: "x", in_production_since: "2026-07-01" }] } },
  });
  check("healthy system yields zero entries", healthy.entries.length === 0, healthy.statement);

  // 2. Severity is derived, not assigned: more failures must score higher.
  const mild = computePainIndex({ ...baseInputs(now), ledger: { consecutive_failures: 2, days: { d: { calls: 2, ok: 0 } } } });
  const severe = computePainIndex({ ...baseInputs(now), ledger: { consecutive_failures: 92, days: { d: { calls: 92, ok: 0 } } } });
  check(
    "severity rises with the evidence",
    (severe.entries[0]?.severity ?? 0) > (mild.entries[0]?.severity ?? 0),
    `${mild.entries[0]?.severity} -> ${severe.entries[0]?.severity}`
  );

  // 3. Same inputs, same score — twice.
  const a = computePainIndex({ ...baseInputs(now), ledger: { consecutive_failures: 40, days: {} } });
  const b = computePainIndex({ ...baseInputs(now), ledger: { consecutive_failures: 40, days: {} } });
  check("deterministic", JSON.stringify(a.entries) === JSON.stringify(b.entries));

  // 4. The composite absorbs the narrower entry rather than double-reporting.
  const composite = computePainIndex({
    ...baseInputs(now),
    ledger: { consecutive_failures: 92, days: { d: { calls: 92, ok: 0 } } },
    heartbeats: Array.from({ length: 22 }, (_, n) => ({ name: `p${n}`, age_min: 0 })),
    workRegister: { count: 85, last_timestamp: "2026-06-25T23:41:11.522Z" },
  });
  check(
    "fleet composite supersedes work-register-stale",
    composite.entries.some((e) => e.id === "fleet-running-producing-nothing") &&
      !composite.entries.some((e) => e.id === "work-register-stale")
  );

  // 5. An absent gate state file is a finding, not a gap.
  const gate = computePainIndex({
    ...baseInputs(now),
    loopGateConfig: { loops: { a: {}, b: {}, c: {}, d: {}, e: {}, f: {}, g: {} } },
    loopGateState: null,
    loopGateWiredInto: 5,
  });
  check("unexercised gate is detected", gate.entries.some((e) => e.id === "loop-gate-never-exercised"));

  // 6. Entries below the floor are dropped.
  const low = computePainIndex({
    ...baseInputs(now),
    radar: { rings: { assess: [{ item: "one", blocked_by: "x" }] } },
  });
  check(`sub-floor entries dropped (floor ${SEVERITY_FLOOR})`, low.entries.length === 0, low.statement);

  // 7. first_observed carries forward instead of resetting every run.
  const first = computePainIndex({ ...baseInputs(now), ledger: { consecutive_failures: 92, days: {} } });
  const merged1 = mergeWithPrevious(first, null, new Date("2026-07-29T00:00:00.000Z"));
  const merged2 = mergeWithPrevious(first, merged1, now);
  check(
    "first_observed is carried forward",
    merged2.entries[0]?.first_observed === "2026-07-29T00:00:00.000Z",
    String(merged2.entries[0]?.first_observed)
  );

  // 8. Unread sources are surfaced, never mistaken for health.
  const blind = computePainIndex({ ...baseInputs(now), unreadSources: ["tech-radar.json"] });
  check("unread sources reported in the empty statement", /unreadable/.test(blind.statement), blind.statement);

  console.log(failures === 0 ? "selftest: all passed" : `selftest: ${failures} FAILED`);
  return failures === 0 ? 0 : 1;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--selftest")) {
    process.exit(selftest());
  }

  const now = new Date();
  const inputs = await gatherPainInputs(now);
  const previous = await readPainIndex();
  const index = mergeWithPrevious(computePainIndex(inputs), previous, now);

  if (args.includes("--write")) {
    await writePainIndex(index);
    console.error(`wrote ${PAIN_INDEX_PATH}`);
  }
  console.log(JSON.stringify(index, null, 2));
}

main().catch((err) => {
  console.error("pain-index FATAL:", err && err.message);
  process.exit(1);
});
