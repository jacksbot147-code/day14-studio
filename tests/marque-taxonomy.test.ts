import { describe, it, expect } from "vitest";

import {
  HOOK_TYPES,
  OFFER_ANGLES,
  FORMATS,
  HOOKS_REQUIRING_EVIDENCE,
  hooksAvailableWithoutProof,
  CHANNELS,
  ASPECT_RATIOS,
  CHANNEL_SPECS,
  FATIGUE_RULES,
  buildVariantId,
  parseVariantId,
  buildMatrix,
  evaluateFatigue,
  toIngestRecord,
  type VariantMetrics,
  type VariantTag,
} from "@/lib/marque-taxonomy";

import { MARQUE_TIERS, MARQUE_SPEND_RULE } from "@/lib/pricing";

describe("marque taxonomy — variant IDs", () => {
  it("builds a stable, parseable id", () => {
    const id = buildVariantId({
      product: "mug-warmer",
      hook: "problem-callout",
      angle: "pain-relief",
      format: "video-ugc",
      ratio: "9:16",
      channel: "tiktok",
      seq: 1,
    });
    expect(id).toBe("mug-warmer-problem-callout-pain-relief-video-ugc-9x16-tiktok-01");
  });

  it("round-trips every hook x angle x format combination", () => {
    for (const hook of HOOK_TYPES) {
      for (const angle of OFFER_ANGLES) {
        for (const format of FORMATS) {
          const base = {
            product: "led-strip-kit",
            hook,
            angle,
            format,
            ratio: "4:5" as const,
            channel: "meta" as const,
            seq: 7,
          };
          const id = buildVariantId(base);
          const parsed = parseVariantId(id);
          expect(parsed, `failed to parse ${id}`).not.toBeNull();
          expect(parsed).toMatchObject(base);
        }
      }
    }
  });

  it("survives every channel, including the hyphenated one", () => {
    for (const channel of CHANNELS) {
      for (const ratio of ASPECT_RATIOS) {
        const base = {
          product: "poster-static",
          hook: "pattern-interrupt" as const,
          angle: "identity" as const,
          format: "animated-static" as const,
          ratio,
          channel,
          seq: 3,
        };
        const parsed = parseVariantId(buildVariantId(base));
        expect(parsed, `failed on ${channel} / ${ratio}`).not.toBeNull();
        expect(parsed).toMatchObject(base);
      }
    }
  });

  it("survives hyphenated product slugs", () => {
    const base = {
      product: "cold-plunge-tub-pro",
      hook: "before-after" as const,
      angle: "risk-reversal" as const,
      format: "animated-static" as const,
      ratio: "1:1" as const,
      channel: "pinterest" as const,
      seq: 12,
    };
    expect(parseVariantId(buildVariantId(base))).toMatchObject(base);
  });

  it("returns null on malformed ids rather than guessing", () => {
    expect(parseVariantId("")).toBeNull();
    expect(parseVariantId("not-a-real-id")).toBeNull();
    expect(parseVariantId("prod-problem-callout-pain-relief-video-ugc-9x16-myspace-01")).toBeNull();
    expect(parseVariantId("prod-problem-callout-pain-relief-hologram-9x16-tiktok-01")).toBeNull();
  });
});

describe("marque taxonomy — generation matrix", () => {
  it("produces exactly the requested count", () => {
    for (const n of [1, 4, 12, 24, 40]) {
      expect(buildMatrix({ product: "p", count: n, channel: "tiktok" })).toHaveLength(n);
    }
  });

  it("emits unique ids — a batch is a test, not duplicates", () => {
    const m = buildMatrix({ product: "sunset-lamp", count: 40, channel: "tiktok" });
    expect(new Set(m.map((v) => v.id)).size).toBe(40);
  });

  it("does not repeat a (hook, angle) pair before the space is exhausted", () => {
    const m = buildMatrix({ product: "sunset-lamp", count: 10, channel: "tiktok" });
    const pairs = m.map((v) => `${v.hook}|${v.angle}`);
    expect(new Set(pairs).size).toBe(10);
  });

  it("defaults to the channel's own ratio and preferred formats", () => {
    const tiktok = buildMatrix({ product: "p", count: 6, channel: "tiktok" });
    expect(tiktok.every((v) => v.ratio === "9:16")).toBe(true);
    expect(
      tiktok.every((v) => CHANNEL_SPECS.tiktok.preferredFormats.includes(v.format)),
    ).toBe(true);

    const meta = buildMatrix({ product: "p", count: 6, channel: "meta" });
    expect(meta.every((v) => CHANNEL_SPECS.meta.ratios.includes(v.ratio))).toBe(true);
  });

  it("honours explicit hook/angle/format restrictions", () => {
    const m = buildMatrix({
      product: "p",
      count: 4,
      channel: "meta",
      hooks: ["demo-in-hand"],
      angles: ["money-save"],
      formats: ["static"],
      ratio: "1:1",
    });
    expect(m.every((v) => v.hook === "demo-in-hand" && v.angle === "money-save")).toBe(true);
    expect(m.map((v) => v.seq)).toEqual([1, 2, 3, 4]);
    expect(new Set(m.map((v) => v.id)).size).toBe(4);
  });

  it("never repeats a (hook, angle) pair while the space still has room", () => {
    // The angle walk is offset by the hook lap to make the batch a Latin-square
    // sweep rather than a diagonal. Verify that across every restriction shape
    // an operator can actually pass, not just the default one.
    for (const nHooks of [1, 2, 3, 4, 6, 10]) {
      for (const nAngles of [1, 2, 3, 4, 6, 10]) {
        const hooks = HOOK_TYPES.slice(0, nHooks);
        const angles = OFFER_ANGLES.slice(0, nAngles);
        const space = nHooks * nAngles;
        const count = Math.min(space, 40);
        const m = buildMatrix({ product: "p", count, channel: "tiktok", hooks, angles });
        const pairs = m.map((v) => `${v.hook}|${v.angle}`);
        expect(
          new Set(pairs).size,
          `${nHooks} hooks x ${nAngles} angles: ${new Set(pairs).size} distinct of ${count} drawn from a space of ${space}`,
        ).toBe(count);
      }
    }
  });

  it("generates the bench size each tier promises", () => {
    for (const tier of MARQUE_TIERS) {
      const m = buildMatrix({ product: "p", count: tier.variantsPerMonth, channel: "tiktok" });
      expect(m).toHaveLength(tier.variantsPerMonth);
      expect(tier.variantsLive).toBeLessThan(tier.variantsPerMonth);
    }
  });
});

describe("marque taxonomy — fatigue rules", () => {
  const base: VariantMetrics = {
    variantId: "p-demo-in-hand-pain-relief-video-ugc-9x16-tiktok-01",
    channel: "tiktok",
    spend: 100,
    impressions: 40000,
    clicks: 500,
    conversions: 6,
    ctr7d: 0.0125,
    ctrBest7d: 0.0125,
    cpm7d: 8,
    cpmFirst7d: 8,
    frequency7d: 0,
    daysLive: 5,
    targetCpa: 20,
  };

  it("keeps a healthy variant", () => {
    const v = evaluateFatigue(base);
    expect(v.action).toBe("keep");
    expect(v.fired).toEqual([]);
  });

  it("retires on click-through decay past 30% off its own peak", () => {
    const v = evaluateFatigue({ ...base, ctr7d: 0.008 });
    expect(v.fired).toContain("ctr-decay");
    expect(v.action).toBe("retire");
    expect(v.reasons.join(" ")).toMatch(/below its own peak/);
  });

  it("flags a refresh on CPM drift alone, not a retirement", () => {
    const v = evaluateFatigue({ ...base, cpm7d: 11 });
    expect(v.fired).toEqual(["cpm-drift"]);
    expect(v.action).toBe("refresh");
  });

  it("applies the frequency ceiling only on meta", () => {
    expect(evaluateFatigue({ ...base, frequency7d: 3 }).fired).not.toContain("frequency-ceiling");
    const meta = evaluateFatigue({ ...base, channel: "meta", frequency7d: 3 });
    expect(meta.fired).toContain("frequency-ceiling");
    expect(meta.action).toBe("retire");
  });

  it("catches a dead hook via hold-rate collapse", () => {
    const v = evaluateFatigue({ ...base, holdRate3sLaunch: 0.4, holdRate3s: 0.2 });
    expect(v.fired).toContain("hold-rate-drop");
    expect(v.reasons.join(" ")).toMatch(/hook stopped working/);
  });

  it("retires on 3x target spend with zero conversions", () => {
    const v = evaluateFatigue({ ...base, conversions: 0, spend: 61, targetCpa: 20 });
    expect(v.fired).toContain("spend-no-conversion");
  });

  it("does not fire spend-no-conversion below the 3x threshold", () => {
    expect(evaluateFatigue({ ...base, conversions: 0, spend: 59, targetCpa: 20 }).fired).not.toContain(
      "spend-no-conversion",
    );
  });

  it("expires novelty and seasonal angles on the calendar", () => {
    expect(evaluateFatigue({ ...base, daysLive: 22 }, "novelty").fired).toContain("novelty-clock");
    expect(evaluateFatigue({ ...base, daysLive: 22 }, "seasonal").fired).toContain("novelty-clock");
    expect(evaluateFatigue({ ...base, daysLive: 22 }, "pain-relief").fired).not.toContain("novelty-clock");
  });

  it("stays conservative on a sparse export — no numbers, no retirement", () => {
    const sparse: VariantMetrics = {
      ...base,
      ctr7d: 0,
      ctrBest7d: 0,
      cpm7d: 0,
      cpmFirst7d: 0,
      spend: 0,
      conversions: 0,
    };
    expect(evaluateFatigue(sparse).action).toBe("keep");
  });

  it("prefers the harshest action when several rules fire", () => {
    const v = evaluateFatigue({ ...base, ctr7d: 0.008, cpm7d: 12 });
    expect(v.fired).toEqual(expect.arrayContaining(["ctr-decay", "cpm-drift"]));
    expect(v.action).toBe("retire");
  });

  it("every declared rule id is reachable from evaluateFatigue", () => {
    const reachable = new Set<string>();
    reachable.add(evaluateFatigue({ ...base, ctr7d: 0.008 }).fired[0] as string);
    evaluateFatigue({ ...base, cpm7d: 12 }).fired.forEach((f) => reachable.add(f));
    evaluateFatigue({ ...base, channel: "meta", frequency7d: 3 }).fired.forEach((f) => reachable.add(f));
    evaluateFatigue({ ...base, holdRate3sLaunch: 0.4, holdRate3s: 0.1 }).fired.forEach((f) => reachable.add(f));
    evaluateFatigue({ ...base, conversions: 0, spend: 999 }).fired.forEach((f) => reachable.add(f));
    evaluateFatigue({ ...base, daysLive: 30 }, "novelty").fired.forEach((f) => reachable.add(f));
    for (const rule of FATIGUE_RULES) expect(reachable.has(rule.id), `unreachable rule: ${rule.id}`).toBe(true);
  });
});

describe("marque taxonomy — backend handoff", () => {
  const tag: VariantTag = {
    id: "mug-warmer-problem-callout-pain-relief-video-ugc-9x16-tiktok-01",
    product: "mug-warmer",
    hook: "problem-callout",
    angle: "pain-relief",
    format: "video-ugc",
    ratio: "9:16",
    channel: "tiktok",
    seq: 1,
    generatedAt: "2026-07-27T00:00:00.000Z",
    concept: "Cold coffee at 10am, hand reaching for the mug.",
    assetRef: "https://example.invalid/asset.mp4",
  };

  it("emits a record the marque ingest webhook accepts", () => {
    const rec = toIngestRecord(tag);
    expect(rec.brand).toBe("marque");
    expect(rec.kind).toBe("marque-ad-scored");
    expect(rec.external_id).toBe(tag.id);
    expect(rec.payload.hook).toBe("problem-callout");
    expect(rec.payload.assetRef).toBe("https://example.invalid/asset.mp4");
  });

  it("uses the variant id as the idempotency key, so a re-post is a no-op", () => {
    expect(toIngestRecord(tag).external_id).toBe(toIngestRecord(tag).external_id);
  });

  it("nulls a missing asset rather than dropping the field", () => {
    const { assetRef: _drop, ...noAsset } = tag;
    expect(toIngestRecord(noAsset as VariantTag).payload.assetRef).toBeNull();
  });

  it("merges extra scoring fields without clobbering the tag", () => {
    const rec = toIngestRecord(tag, { viralityScore: 71 });
    expect(rec.payload.viralityScore).toBe(71);
    expect(rec.payload.hook).toBe("problem-callout");
  });
});

describe("marque taxonomy — consistency with the published offer", () => {
  it("every tier's live count is a small field against a deep bench", () => {
    for (const t of MARQUE_TIERS) {
      expect(t.variantsLive).toBeGreaterThan(0);
      expect(t.variantsLive * 2).toBeLessThanOrEqual(t.variantsPerMonth);
    }
  });

  it("spend floors rise with the tier fee", () => {
    const fees = MARQUE_TIERS.map((t) => t.monthly ?? 0);
    const floors = MARQUE_TIERS.map((t) => t.spendFloorMonthly);
    for (let i = 1; i < fees.length; i++) {
      expect(fees[i]!).toBeGreaterThan(fees[i - 1]!);
      expect(floors[i]!).toBeGreaterThan(floors[i - 1]!);
    }
  });

  it("the published spend rule stays the documented 50-event / 5x-CPA shape", () => {
    expect(MARQUE_SPEND_RULE.eventsPerAdSetPerWeek).toBe(50);
    expect(MARQUE_SPEND_RULE.dailyBudgetMultipleOfCpa).toBe(5);
  });

  it("every published floor IS the formula — 5x its target CPA over 30 days", () => {
    // The page tells a reader that a $40 lead needs ~$200/day, then publishes a
    // $900/mo entry floor. That only stops being a contradiction because each
    // floor names the cheaper optimization event it is derived for. If anyone
    // edits a floor or a target without the other, this fails — which is the
    // whole point of the test.
    for (const t of MARQUE_TIERS) {
      expect(
        t.spendFloorMonthly,
        `${t.name}: ${t.spendFloorMonthly} != 5 x ${t.floorTargetCpa} x 30`,
      ).toBe(MARQUE_SPEND_RULE.dailyBudgetMultipleOfCpa * t.floorTargetCpa * 30);
    }
  });

  it("names a real optimization event for every floor", () => {
    for (const t of MARQUE_TIERS) {
      expect(t.floorEvent.trim().length, `${t.name} has no floorEvent`).toBeGreaterThan(5);
      expect(t.floorTargetCpa).toBeGreaterThan(0);
    }
  });

  it("targets escalate with the tier — cheaper event at the bottom of the ladder", () => {
    const cpas = MARQUE_TIERS.map((t) => t.floorTargetCpa);
    for (let i = 1; i < cpas.length; i++) {
      expect(cpas[i]!).toBeGreaterThan(cpas[i - 1]!);
    }
  });

  it("the lowest floor clears 5x a plausible low-end CPA for a full week", () => {
    const lowest = Math.min(...MARQUE_TIERS.map((t) => t.spendFloorMonthly));
    const dailyAtLowestFloor = lowest / 30;
    expect(dailyAtLowestFloor).toBeGreaterThanOrEqual(
      5 * 5, // 5x a $5 target CPA — the cheapest upstream event worth optimising for
    );
  });
});

describe("marque taxonomy — hooks that need proof to be honest", () => {
  it("names the three that a business with no customers cannot run", () => {
    expect([...HOOKS_REQUIRING_EVIDENCE].sort()).toEqual(
      ["founder-direct", "social-proof", "ugc-testimonial"].sort(),
    );
  });

  it("leaves seven hooks a brand-new business can still use honestly", () => {
    const usable = hooksAvailableWithoutProof();
    expect(usable).toHaveLength(HOOK_TYPES.length - HOOKS_REQUIRING_EVIDENCE.length);
    for (const h of HOOKS_REQUIRING_EVIDENCE) expect(usable).not.toContain(h);
  });

  it("can still build a full Starter-sized batch from the honest seven", () => {
    // The published promise is 12 a month. Seven hooks against ten angles is a
    // space of 70, so the tier is reachable WITHOUT fabricating proof — which
    // is the whole point of recording the constraint instead of ignoring it.
    const m = buildMatrix({
      product: "day14-spark",
      count: 12,
      channel: "meta",
      hooks: hooksAvailableWithoutProof(),
    });
    expect(m).toHaveLength(12);
    expect(new Set(m.map((v) => `${v.hook}|${v.angle}`)).size).toBe(12);
    for (const v of m) expect(HOOKS_REQUIRING_EVIDENCE).not.toContain(v.hook);
  });
});
