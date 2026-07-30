import { describe, expect, it } from "vitest";
import {
  ADOPT_MIN_PRODUCTION_DAYS,
  adoptEligibility,
  applyAddItem,
  applyRingMove,
  findRadarItem,
  moveDirection,
  radarIntegrity,
  radarSlug,
  recommendations,
  trulyAdopted,
  validateRingMove,
  vaultMirrorLine,
  type RadarItem,
  type TechRadar,
} from "@/lib/tech-radar";

const NOW = new Date("2026-07-29T12:00:00Z");

/** 40+ chars so it clears rule 4 on its own. */
const GOOD_EVIDENCE =
  "Ran clean in production for eight days with no operator intervention at all.";
const CITED_EVIDENCE =
  "Vendor shipped GA support on 2026-07-20 and published a real per-seat price.";

function item(over: Partial<RadarItem> = {}): RadarItem {
  return { item: "Example Tool", ...over };
}

function radar(over: Partial<TechRadar> = {}): TechRadar {
  return {
    schema: 2,
    title: "Test radar",
    purpose: "test",
    updated: "2026-07-27",
    rules_for_changing_a_ring: [],
    rings: { adopt: [], trial: [], assess: [], hold: [] },
    changelog: [],
    ...over,
  };
}

describe("radarSlug", () => {
  it("is stable and url-safe", () => {
    expect(radarSlug("Ollama + Mistral Small 3.2 24B local fallback")).toBe(
      "ollama-mistral-small-3-2-24b-local-fallback"
    );
    expect(radarSlug("  Trailing & leading  ")).toBe("trailing-leading");
  });

  it("gives the same slug for the same name every time", () => {
    const name = "Anthropic prompt caching + Batch API";
    expect(radarSlug(name)).toBe(radarSlug(name));
  });
});

describe("moveDirection", () => {
  it("ranks hold lowest and adopt highest", () => {
    expect(moveDirection("hold", "assess")).toBe("up");
    expect(moveDirection("adopt", "trial")).toBe("down");
    expect(moveDirection("trial", "trial")).toBe("none");
  });
});

describe("rule 4 — every change records evidence", () => {
  it("rejects a move with no evidence", () => {
    const r = validateRingMove(item(), "assess", "trial", "", NOW);
    expect(r.ok).toBe(false);
    expect(r.rule).toBe(4);
  });

  it("rejects evidence that is too short to be a sentence", () => {
    const r = validateRingMove(item(), "assess", "trial", "seems good now", NOW);
    expect(r.ok).toBe(false);
    expect(r.rule).toBe(4);
  });

  it("rejects a move to the ring it is already in", () => {
    const r = validateRingMove(item(), "trial", "trial", GOOD_EVIDENCE, NOW);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/already in/i);
  });
});

describe("rule 1 — Adopt needs a week in production", () => {
  it("refuses an item that is not running at all", () => {
    const r = validateRingMove(
      item({ in_production_since: null }),
      "trial",
      "adopt",
      GOOD_EVIDENCE,
      NOW
    );
    expect(r.ok).toBe(false);
    expect(r.rule).toBe(1);
    expect(r.error).toMatch(/not adoption/i);
  });

  it("refuses an item with no production date recorded — unverified is not a pass", () => {
    const r = validateRingMove(item(), "trial", "adopt", GOOD_EVIDENCE, NOW);
    expect(r.ok).toBe(false);
    expect(r.rule).toBe(1);
  });

  it("refuses an item that has run less than the window", () => {
    const r = validateRingMove(
      item({ in_production_since: "2026-07-27" }), // 2 days before NOW
      "trial",
      "adopt",
      GOOD_EVIDENCE,
      NOW
    );
    expect(r.ok).toBe(false);
    expect(r.rule).toBe(1);
    expect(r.error).toMatch(/2026-08-03/);
  });

  it("allows it the day the window closes", () => {
    const start = new Date(NOW.getTime() - ADOPT_MIN_PRODUCTION_DAYS * 86_400_000);
    const r = validateRingMove(
      item({ in_production_since: start.toISOString().slice(0, 10) }),
      "trial",
      "adopt",
      GOOD_EVIDENCE,
      NOW
    );
    expect(r.ok).toBe(true);
  });

  it("reports the eligibility date so the UI can show the countdown", () => {
    const elig = adoptEligibility(item({ in_production_since: "2026-07-27" }), NOW);
    expect(elig.eligible).toBe(false);
    expect(elig.eligibleAt).toBe("2026-08-03");
    expect(elig.daysRunning).toBe(2);
  });

  it("treats an unparseable date as not eligible rather than throwing", () => {
    const elig = adoptEligibility(item({ in_production_since: "soon" }), NOW);
    expect(elig.eligible).toBe(false);
    expect(elig.detail).toMatch(/unparseable/i);
  });
});

describe("rule 2 — leaving Hold needs new evidence, not a new opinion", () => {
  const held = item({
    item: "llms.txt as a citation lever",
    reason: "Zero evidence any major crawler parses it; a 500-site analysis found no correlation.",
  });

  it("refuses an uncited opinion however long it is", () => {
    const r = validateRingMove(
      held,
      "hold",
      "assess",
      "I have been thinking about this again and I now believe it is probably worth another look.",
      NOW
    );
    expect(r.ok).toBe(false);
    expect(r.rule).toBe(2);
    expect(r.error).toMatch(/cite a date/i);
  });

  it("accepts a dated citation", () => {
    const r = validateRingMove(held, "hold", "assess", CITED_EVIDENCE, NOW);
    expect(r.ok).toBe(true);
  });

  it("accepts a URL citation", () => {
    const r = validateRingMove(
      held,
      "hold",
      "assess",
      "Crawler vendor confirmed parsing support here: https://example.com/changelog/llms-txt",
      NOW
    );
    expect(r.ok).toBe(true);
  });

  it("allows the old reason to be quoted when something dated is added to it", () => {
    const r = validateRingMove(
      held,
      "hold",
      "assess",
      `${held.reason} Re-checked 2026-07-29 and the vendor now documents support.`,
      NOW
    );
    expect(r.ok).toBe(true);
  });

  it("refuses a verbatim restatement with a date bolted on", () => {
    const r = validateRingMove(
      item({ item: "x", reason: "2026-07-01 no crawler parses it and adoption is 8.7 percent." }),
      "hold",
      "assess",
      "2026-07-01 no crawler parses it and adoption is 8.7 percent.",
      NOW
    );
    expect(r.ok).toBe(false);
    expect(r.rule).toBe(2);
    expect(r.error).toMatch(/restates/i);
  });

  it("does not gate moves INTO hold on citations — demotion stays cheap (rule 3)", () => {
    const r = validateRingMove(
      item({ why: "looked promising" }),
      "trial",
      "hold",
      "Tried it for two weeks and it never changed a single business number for us.",
      NOW
    );
    expect(r.ok).toBe(true);
    expect(r.direction).toBe("down");
  });
});

describe("applyRingMove", () => {
  const base = radar({
    rings: {
      adopt: [],
      trial: [item({ item: "Loop gating", in_production_since: "2026-07-27" })],
      assess: [],
      hold: [item({ item: "llms.txt", reason: "No crawler parses it.", revisit: "on support" })],
    },
  });

  it("relocates the item and appends a changelog entry", () => {
    const { radar: next, entry } = applyRingMove(
      base,
      radarSlug("Loop gating"),
      "assess",
      GOOD_EVIDENCE,
      "jack@day14",
      NOW
    );
    expect(next.rings.trial).toHaveLength(0);
    expect(next.rings.assess).toHaveLength(1);
    expect(next.rings.assess[0]?.since).toBe("2026-07-29");
    expect(next.updated).toBe("2026-07-29");
    expect(next.changelog).toHaveLength(1);
    expect(entry.from).toBe("trial");
    expect(entry.to).toBe("assess");
  });

  it("never mutates the radar it was given", () => {
    applyRingMove(base, radarSlug("Loop gating"), "assess", GOOD_EVIDENCE, "jack", NOW);
    expect(base.rings.trial).toHaveLength(1);
    expect(base.changelog).toHaveLength(0);
  });

  it("drops the refusal reason when an item leaves Hold", () => {
    const { radar: next } = applyRingMove(
      base,
      radarSlug("llms.txt"),
      "assess",
      CITED_EVIDENCE,
      "jack",
      NOW
    );
    const moved = next.rings.assess[0];
    expect(moved?.reason).toBeUndefined();
    expect(moved?.revisit).toBeUndefined();
    expect(moved?.why).toBe(CITED_EVIDENCE);
    // ...but the original reason survives in the changelog.
    expect(next.rings.hold).toHaveLength(0);
    expect(next.changelog[0]?.evidence).toBe(CITED_EVIDENCE);
  });

  it("turns the evidence into the recorded reason when an item enters Hold", () => {
    const { radar: next } = applyRingMove(
      base,
      radarSlug("Loop gating"),
      "hold",
      "Ran for a month and never once caused a state change we cared about.",
      "jack",
      NOW
    );
    const held = next.rings.hold.find((h) => h.item === "Loop gating");
    expect(held?.reason).toMatch(/never once caused a state change/);
    expect(held?.why).toBeUndefined();
  });

  it("throws on an unknown slug rather than silently doing nothing", () => {
    expect(() => applyRingMove(base, "nope", "hold", GOOD_EVIDENCE, "jack", NOW)).toThrow(
      /no radar item/i
    );
  });
});

describe("applyAddItem", () => {
  const base = radar({
    rings: { adopt: [], trial: [], assess: [item({ item: "LiteLLM" })], hold: [] },
  });

  it("adds a genuinely new item", () => {
    const { radar: next } = applyAddItem(
      base,
      item({ item: "Some New Gateway", why: "changes the buy-vs-build call" }),
      "trial",
      "jack",
      NOW
    );
    expect(next.rings.trial).toHaveLength(1);
    expect(next.rings.trial[0]?.slug).toBe("some-new-gateway");
  });

  it("refuses something already on the radar — that is the baseline working", () => {
    expect(() => applyAddItem(base, item({ item: "LiteLLM" }), "trial", "jack", NOW)).toThrow(
      /already on the radar/i
    );
  });
});

describe("radarIntegrity", () => {
  it("flags an Adopt item that is not actually running", () => {
    const r = radar({
      rings: {
        adopt: [item({ item: "Healthchecks.io dead-man's switch", in_production_since: null })],
        trial: [],
        assess: [],
        hold: [],
      },
    });
    const flags = radarIntegrity(r, NOW);
    expect(flags).toHaveLength(1);
    expect(flags[0]?.problem).toMatch(/In Adopt but not adopted/);
    expect(trulyAdopted(r, NOW)).toHaveLength(0);
  });

  it("passes an Adopt item that has run the full window", () => {
    const r = radar({
      rings: {
        adopt: [item({ in_production_since: "2026-07-01" })],
        trial: [],
        assess: [],
        hold: [],
      },
    });
    expect(radarIntegrity(r, NOW)).toHaveLength(0);
    expect(trulyAdopted(r, NOW)).toHaveLength(1);
  });

  it("flags the same item listed in two rings", () => {
    const r = radar({
      rings: {
        adopt: [],
        trial: [item({ item: "Dup" })],
        assess: [item({ item: "Dup" })],
        hold: [],
      },
    });
    const flags = radarIntegrity(r, NOW);
    expect(flags.some((f) => /One item, one ring/.test(f.problem))).toBe(true);
  });

  it("flags a Hold entry with no reason", () => {
    const r = radar({
      rings: { adopt: [], trial: [], assess: [], hold: [item({ item: "Unexplained" })] },
    });
    expect(radarIntegrity(r, NOW)[0]?.problem).toMatch(/no recorded reason/);
  });
});

describe("recommendations", () => {
  const r = radar({
    rings: {
      adopt: [],
      trial: [
        item({ item: "Cheap and blocked", next_action: "do it", effort: "minutes", blocked_by: "x" }),
        item({ item: "Cheap and clear", next_action: "do it", effort: "minutes" }),
        item({ item: "No next step" }),
      ],
      assess: [item({ item: "Slow but clear", next_action: "do it", effort: "days" })],
      hold: [item({ item: "Refused", next_action: "do not do it", effort: "minutes" })],
    },
  });

  it("excludes Hold entirely", () => {
    expect(recommendations(r).some((x) => x.item.item === "Refused")).toBe(false);
  });

  it("skips items with no concrete next action", () => {
    expect(recommendations(r).some((x) => x.item.item === "No next step")).toBe(false);
  });

  it("puts unblocked before blocked, then cheapest first", () => {
    expect(recommendations(r).map((x) => x.item.item)).toEqual([
      "Cheap and clear",
      "Slow but clear",
      "Cheap and blocked",
    ]);
  });
});

describe("findRadarItem", () => {
  it("locates an item by derived slug across every ring", () => {
    const r = radar({
      rings: { adopt: [], trial: [], assess: [], hold: [item({ item: "Held Thing" })] },
    });
    expect(findRadarItem(r, "held-thing")?.ring).toBe("hold");
    expect(findRadarItem(r, "missing")).toBeNull();
  });
});

describe("vaultMirrorLine", () => {
  it("renders a paste-ready line for the vault note", () => {
    const line = vaultMirrorLine({
      date: "2026-07-29",
      item: "Loop gating",
      from: "trial",
      to: "adopt",
      evidence: "Ran 8 days clean.",
      note: "x",
    });
    expect(line).toBe(
      "- 2026-07-29 — **Loop gating** Trial → Adopt. Evidence: Ran 8 days clean."
    );
  });
});
