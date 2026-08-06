import { describe, expect, it } from "vitest";
import {
  SEVERITY_FLOOR,
  STALE_HEARTBEAT_MIN,
  STALE_REGISTER_DAYS,
  computePainIndex,
  mergeWithPrevious,
  type PainIndex,
  type PainInputs,
} from "@/lib/pain-index";

const NOW = new Date("2026-07-31T02:30:00.000Z");

function inputs(over: Partial<PainInputs> = {}): PainInputs {
  return {
    now: NOW,
    ledger: null,
    loopGateConfig: null,
    loopGateState: null,
    loopGateWiredInto: 0,
    workRegister: null,
    heartbeats: null,
    sync: null,
    radar: null,
    opsPulse: null,
    unreadSources: [],
    ...over,
  };
}

const ids = (i: PainIndex) => i.entries.map((e) => e.id);

describe("the empty case — the one that keeps this honest", () => {
  it("says nothing when nothing is wrong", () => {
    const r = computePainIndex(
      inputs({
        ledger: { consecutive_failures: 0, last_success_at: "2026-07-31T02:00:00.000Z", days: {} },
        loopGateConfig: { loops: { a: {} } },
        loopGateState: { loops: { a: { runs: 3, noop_streak: 0 } } },
        workRegister: { count: 10, last_timestamp: "2026-07-31T01:00:00.000Z" },
        heartbeats: [{ name: "p", age_min: 1 }],
        sync: { consecutive_failures: 0 },
        radar: { rings: { adopt: [{ item: "x", in_production_since: "2026-07-01" }] } },
      })
    );
    expect(r.entries).toEqual([]);
    expect(r.statement).toMatch(/Nothing above the severity floor/);
  });

  it("reads no sources at all without inventing pain", () => {
    const r = computePainIndex(inputs());
    expect(r.entries).toEqual([]);
  });

  it("names unreadable sources so a gap never looks like an all-clear", () => {
    const r = computePainIndex(inputs({ unreadSources: ["tech-radar.json", "poller heartbeats"] }));
    expect(r.statement).toMatch(/unreadable/);
    expect(r.unread_sources).toHaveLength(2);
  });
});

describe("severity is derived, never assigned", () => {
  it("rises monotonically with the failure count", () => {
    const at = (n: number) =>
      computePainIndex(inputs({ ledger: { consecutive_failures: n, days: { d: { calls: n, ok: 0 } } } }))
        .entries[0]?.severity ?? 0;
    expect(at(2)).toBeLessThan(at(40));
    expect(at(40)).toBeLessThan(at(92));
  });

  it("clamps at 100 rather than running away", () => {
    const r = computePainIndex(
      inputs({ ledger: { consecutive_failures: 100_000, days: { a: { calls: 5, ok: 0 }, b: { calls: 5, ok: 0 } } } })
    );
    expect(r.entries[0]!.severity).toBe(100);
  });

  it("gives identical scores for identical inputs", () => {
    const one = computePainIndex(inputs({ ledger: { consecutive_failures: 40, days: {} } }));
    const two = computePainIndex(inputs({ ledger: { consecutive_failures: 40, days: {} } }));
    expect(one.entries).toEqual(two.entries);
  });

  it("drops entries below the floor", () => {
    const r = computePainIndex(inputs({ radar: { rings: { assess: [{ item: "one", blocked_by: "x" }] } } }));
    expect(r.entries).toEqual([]);
    // ...but the same rule fires once the evidence is bigger.
    const many = computePainIndex(
      inputs({
        radar: {
          rings: { assess: Array.from({ length: 4 }, (_, n) => ({ item: `i${n}`, blocked_by: "x" })) },
        },
      })
    );
    expect(many.entries.map((e) => e.id)).toContain("radar-items-blocked");
    expect(many.entries[0]!.severity).toBeGreaterThanOrEqual(SEVERITY_FLOOR);
  });
});

describe("llm outage", () => {
  it("states the streak and that no success was ever recorded", () => {
    const r = computePainIndex(
      inputs({
        ledger: {
          consecutive_failures: 92,
          last_success_at: null,
          days: { "2026-07-28": { calls: 38, ok: 0 }, "2026-07-29": { calls: 16, ok: 0 } },
        },
      })
    );
    const e = r.entries.find((x) => x.id === "llm-layer-down")!;
    expect(e.statement).toContain("92 consecutive failures");
    expect(e.statement).toContain("no successful call has ever been recorded");
    expect(e.evidence.failing_days).toBe(2);
  });

  it("stays silent when the streak is zero", () => {
    const r = computePainIndex(inputs({ ledger: { consecutive_failures: 0, days: {} } }));
    expect(ids(r)).not.toContain("llm-layer-down");
  });
});

describe("the fleet composite — green lights, zero output", () => {
  const fleet = () =>
    computePainIndex(
      inputs({
        ledger: { consecutive_failures: 92, days: { d: { calls: 92, ok: 0 } } },
        heartbeats: Array.from({ length: 22 }, (_, n) => ({ name: `p${n}`, age_min: 0 })),
        workRegister: { count: 85, last_timestamp: "2026-06-25T23:41:11.522Z" },
      })
    );

  it("fires when pollers are fresh but nothing is produced", () => {
    expect(ids(fleet())).toContain("fleet-running-producing-nothing");
  });

  it("absorbs the narrower entry so one condition yields one entry", () => {
    expect(ids(fleet())).not.toContain("work-register-stale");
  });

  it("still reports the narrow case on its own when the fleet is small", () => {
    const r = computePainIndex(
      inputs({
        heartbeats: [{ name: "only", age_min: 0 }],
        workRegister: { count: 85, last_timestamp: "2026-06-25T23:41:11.522Z" },
      })
    );
    expect(ids(r)).toContain("work-register-stale");
  });

  it("does not fire when the fleet is fresh AND work is flowing", () => {
    const r = computePainIndex(
      inputs({
        ledger: { consecutive_failures: 0, days: {} },
        heartbeats: Array.from({ length: 22 }, (_, n) => ({ name: `p${n}`, age_min: 0 })),
        workRegister: { count: 85, last_timestamp: "2026-07-31T02:00:00.000Z" },
      })
    );
    expect(ids(r)).not.toContain("fleet-running-producing-nothing");
  });

  it("flags pollers that have actually stopped", () => {
    const r = computePainIndex(
      inputs({
        heartbeats: [
          { name: "alive", age_min: 1 },
          { name: "dead1", age_min: STALE_HEARTBEAT_MIN + 600 },
          { name: "dead2", age_min: STALE_HEARTBEAT_MIN + 60 },
        ],
      })
    );
    expect(ids(r)).toContain("pollers-stopped");
  });
});

describe("loop gate", () => {
  it("flags a gate that is configured, wired, and has never recorded a run", () => {
    const r = computePainIndex(
      inputs({
        loopGateConfig: { loops: Object.fromEntries(Array.from({ length: 7 }, (_, n) => [`l${n}`, {}])) },
        loopGateState: null,
        loopGateWiredInto: 5,
      })
    );
    const e = r.entries.find((x) => x.id === "loop-gate-never-exercised")!;
    expect(e.statement).toContain("recorded 0 runs");
    expect(e.evidence.state_file_present).toBe(false);
    expect(e.evidence.importing_loop_scripts).toBe(5);
  });

  it("goes quiet once the gate has recorded runs", () => {
    const r = computePainIndex(
      inputs({
        loopGateConfig: { loops: { a: {} } },
        loopGateState: { loops: { a: { runs: 1, noop_streak: 0 } } },
      })
    );
    expect(ids(r)).not.toContain("loop-gate-never-exercised");
  });

  it("reports loops the gate has auto-paused", () => {
    const r = computePainIndex(
      inputs({
        loopGateConfig: { loops: { a: {} } },
        loopGateState: { loops: { a: { runs: 9, noop_streak: 4, auto_paused: true } } },
      })
    );
    expect(ids(r)).toContain("loops-auto-paused");
  });
});

describe("radar decision debt", () => {
  it("counts Adopt entries that are not running", () => {
    const r = computePainIndex(
      inputs({
        radar: {
          rings: {
            adopt: [
              { item: "a", in_production_since: null },
              { item: "b", in_production_since: null },
              { item: "c", in_production_since: null },
              { item: "d", in_production_since: null },
            ],
          },
        },
      })
    );
    const e = r.entries.find((x) => x.id === "adopt-ring-not-running")!;
    expect(e.statement).toContain("4 of 4");
  });

  it("catches a production claim its own state file does not corroborate", () => {
    const r = computePainIndex(
      inputs({
        radar: {
          rings: {
            trial: [
              {
                item: "Trace-to-eval loop gating (Braintrust pattern)",
                slug: "trace-to-eval-loop-gating-braintrust-pattern",
                in_production_since: "2026-07-27",
              },
            ],
          },
        },
        loopGateState: null,
      })
    );
    const e = r.entries.find((x) => x.id === "radar-production-claim-unevidenced")!;
    expect(e.statement).toContain("records 0 runs");
    expect(e.evidence.claimed_days).toBe(4);
  });

  it("drops that claim once runs exist", () => {
    const r = computePainIndex(
      inputs({
        radar: {
          rings: {
            trial: [
              { item: "x", slug: "trace-to-eval-x", in_production_since: "2026-07-27" },
            ],
          },
        },
        loopGateState: { loops: { a: { runs: 2 } } },
      })
    );
    expect(ids(r)).not.toContain("radar-production-claim-unevidenced");
  });
});

describe("empire sync", () => {
  it("fires on a failing streak and stays silent at zero", () => {
    expect(ids(computePainIndex(inputs({ sync: { consecutive_failures: 37 } })))).toContain("empire-sync-failing");
    expect(ids(computePainIndex(inputs({ sync: { consecutive_failures: 0 } })))).not.toContain("empire-sync-failing");
  });
});

describe("ordering and history", () => {
  it("sorts worst-first", () => {
    const r = computePainIndex(
      inputs({
        ledger: { consecutive_failures: 92, days: { d: { calls: 92, ok: 0 } } },
        radar: { rings: { assess: Array.from({ length: 4 }, (_, n) => ({ item: `i${n}`, blocked_by: "x" })) } },
      })
    );
    const sev = r.entries.map((e) => e.severity);
    expect([...sev].sort((a, b) => b - a)).toEqual(sev);
  });

  it("carries first_observed forward instead of resetting each run", () => {
    const base = computePainIndex(inputs({ ledger: { consecutive_failures: 92, days: {} } }));
    const day1 = mergeWithPrevious(base, null, new Date("2026-07-28T00:00:00.000Z"));
    const day3 = mergeWithPrevious(base, day1, NOW);
    expect(day3.entries[0]!.first_observed).toBe("2026-07-28T00:00:00.000Z");
  });

  it("does not resurrect entries that stopped being true", () => {
    const before = mergeWithPrevious(
      computePainIndex(inputs({ sync: { consecutive_failures: 5 } })),
      null,
      NOW
    );
    expect(ids(before)).toContain("empire-sync-failing");
    const after = mergeWithPrevious(computePainIndex(inputs({ sync: { consecutive_failures: 0 } })), before, NOW);
    expect(after.entries).toEqual([]);
  });

  it("uses the documented staleness thresholds", () => {
    expect(STALE_REGISTER_DAYS).toBe(7);
    expect(STALE_HEARTBEAT_MIN).toBe(60);
  });
});

/**
 * A note on ordering, recorded because the first version of this test asserted
 * the wrong thing.
 *
 * I initially asserted that a never-recorded outreach send must outrank the LLM
 * outage, on the reasoning that ops-pulse lists it first. That was an assumption
 * dressed as a principle, and making it true would have meant inflating a
 * constant until the sort came out the way I wanted — the precise "hand-assigned
 * severity" this module forbids.
 *
 * A 267-failure total provider outage genuinely is the single most severe fact,
 * and it clamps to 100 honestly. Revenue pain lands at 95/90, second and third,
 * which is where the evidence puts it. What IS worth asserting is the thing that
 * carries real meaning: doing outranks deciding. A send that never happened
 * scores above every "decided and never armed" entry on the radar.
 */
describe("revenue — the numbers that decide whether Day14 lives", () => {
  const pulse = {
    paying_software_customers: 0,
    outreach: { log_exists: false, total_sends: 0 },
    fleet_deadman: { armed: false, note: "DAY14_HEALTHCHECK_URL not set" },
  };

  it("ranks a never-recorded send above every decided-but-never-armed entry", () => {
    const r = computePainIndex(
      inputs({
        ledger: { consecutive_failures: 267, days: { d: { calls: 267, ok: 0 } } },
        opsPulse: pulse,
        radar: {
          rings: {
            adopt: Array.from({ length: 4 }, (_, n) => ({ item: `a${n}`, in_production_since: null })),
          },
        },
      })
    );
    const outreach = r.entries.find((e) => e.id === "outreach-never-sent")!;
    const debt = r.entries.find((e) => e.id === "adopt-ring-not-running")!;
    expect(outreach.severity).toBeGreaterThan(debt.severity);
    // Top three, without pretending it beats a total provider outage.
    expect(r.entries.slice(0, 3).map((e) => e.id)).toContain("outreach-never-sent");
  });

  it("treats a missing log as worse than any known gap", () => {
    const never = computePainIndex(inputs({ opsPulse: pulse })).entries.find(
      (e) => e.id === "outreach-never-sent"
    )!;
    const stalled = computePainIndex(
      inputs({ opsPulse: { ...pulse, outreach: { log_exists: true, total_sends: 3, days_since_outreach: 20 } } })
    ).entries.find((e) => e.id === "outreach-stalled")!;
    expect(never.severity).toBeGreaterThan(stalled.severity);
  });

  it("goes quiet when outreach is actually flowing", () => {
    const r = computePainIndex(
      inputs({ opsPulse: { ...pulse, outreach: { log_exists: true, total_sends: 12, days_since_outreach: 2 } } })
    );
    expect(ids(r)).not.toContain("outreach-never-sent");
    expect(ids(r)).not.toContain("outreach-stalled");
  });

  it("flags zero paying customers and an unarmed dead-man switch", () => {
    const r = computePainIndex(inputs({ opsPulse: pulse }));
    expect(ids(r)).toContain("no-paying-customers");
    expect(ids(r)).toContain("deadman-not-armed");
  });

  it("stays silent on revenue when there is no pulse to read", () => {
    const r = computePainIndex(inputs({ opsPulse: null }));
    expect(r.entries.filter((e) => e.source === "revenue")).toEqual([]);
  });

  it("enriches the llm entry with the pulse rather than adding a second row", () => {
    const r = computePainIndex(
      inputs({
        ledger: { consecutive_failures: 267, days: { d: { calls: 267, ok: 0 } } },
        opsPulse: { ...pulse, llm: { worst_failure_streak: 649, providers_down: ["gemini", "anthropic"] } },
      })
    );
    const llm = r.entries.filter((e) => e.source === "llm-layer");
    expect(llm).toHaveLength(1);
    expect(llm[0]!.evidence.worst_provider_streak).toBe(649);
    expect(llm[0]!.evidence.providers_down).toBe("gemini, anthropic");
  });
});
