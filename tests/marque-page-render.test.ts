/**
 * /marque — the public page. Rendered, not just typechecked.
 *
 * This page carries the claims the business is held to: a published media-spend
 * floor, the reasoning behind it, and a set of honesty rails. tsc cannot tell
 * you whether a rail is still on the page, and a floor that renders without the
 * paragraph explaining it is worse than no floor at all — it reads as arbitrary,
 * or as a contradiction of the 5x rule stated two paragraphs above it.
 *
 * Every number is asserted against pricing.ts rather than hardcoded, so this
 * pins the WIRING, not the values. Repricing must not fail these tests;
 * un-wiring them must.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import MarquePage from "../src/app/marque/page";
import { MARQUE_TIERS, MARQUE_SPEND_RULE } from "@/lib/pricing";

const html = renderToStaticMarkup(MarquePage() as React.ReactElement);
const text = html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ");

describe("/marque renders", () => {
  it("renders at all", () => {
    expect(html.length).toBeGreaterThan(5000);
    expect(text).toContain("Marque");
  });

  it("leads with creative fatigue, not with ad management", () => {
    expect(text).toMatch(/Your ads don.{0,3}t stop working\. Your creative does\./);
  });

  it("states the pipeline is not an agency", () => {
    expect(text).toMatch(/creative pipeline, not an ad agency/i);
  });
});

describe("/marque — the published spend floor", () => {
  it("shows every tier's floor, sourced from pricing.ts", () => {
    for (const t of MARQUE_TIERS) {
      expect(text, `${t.name} floor missing`).toContain(
        `$${t.spendFloorMonthly.toLocaleString("en-US")}`,
      );
    }
  });

  it("names the optimization event each floor assumes", () => {
    // Without this the floors look arbitrary, or look like they contradict the
    // 5x rule stated on the same page. This is the paragraph that reconciles it.
    for (const t of MARQUE_TIERS) {
      expect(text, `${t.name} does not name its event`).toContain(t.floorEvent);
      expect(text).toContain(`$${t.floorTargetCpa}`);
    }
  });

  it("states the rule the floors are derived from", () => {
    expect(text).toContain(String(MARQUE_SPEND_RULE.eventsPerAdSetPerWeek));
    expect(text).toContain(`${MARQUE_SPEND_RULE.dailyBudgetMultipleOfCpa}`);
    expect(text).toMatch(/per ad set per week/i);
  });

  it("answers the contradiction out loud instead of hoping nobody does the arithmetic", () => {
    expect(text).toMatch(/optimization event is a choice/i);
  });

  it("says the floor is disclosed, not enforced", () => {
    expect(text).toMatch(/readability floors, not gates/i);
  });
});

describe("/marque — honesty rails", () => {
  it("refuses to guarantee leads or a cost per lead", () => {
    expect(text).toMatch(/Do you guarantee leads or a cost-per-lead\?/i);
    expect(text).toMatch(/No .{0,10}and be careful with anyone who does/i);
  });

  it("says the client owns the spend and the account", () => {
    expect(text).toContain(MARQUE_SPEND_RULE.billing);
  });

  it("explains why the live field is small — the anti-volume argument", () => {
    expect(text).toMatch(/share (a single|one) pool of optimization events/i);
    expect(text).toMatch(/deep bench|bench.{0,40}field|small field/i);
  });

  it("distinguishes signal-based fatigue detection from a calendar", () => {
    expect(text).toMatch(/not a calendar|on a calendar/i);
  });
});

describe("/marque — no stale claims", () => {
  it("does not still say the creative is sized for Google", () => {
    // Google is not one of the four channels in the taxonomy; this copy was
    // stale from the pre-repositioning page.
    expect(text).not.toMatch(/sized for Meta and Google/i);
  });

  it("bills through TikTok or Meta, matching the TikTok-first decision", () => {
    expect(text).toMatch(/TikTok or Meta/);
  });

  it("carries no price literal that pricing.ts does not know about", () => {
    const fromPricing = MARQUE_TIERS.flatMap((t) => [
      `$${t.monthly}`,
      `$${t.spendFloorMonthly.toLocaleString("en-US")}`,
      `$${t.floorTargetCpa}`,
    ]);

    // The only figures allowed to be literals are the WORKED EXAMPLE that
    // explains the rule -- "if a lead is worth $40 to you, that is roughly
    // $200/day" and the $600-a-year under-spender. They are illustrations of
    // arithmetic, not prices of anything, so they cannot drift out of sync with
    // pricing.ts. Every other number on the page must come from there.
    const worked = ["$40", "$200", "$600"];
    const allowed = new Set([...fromPricing, ...worked]);

    // Trim a trailing comma: "$40, that is..." would otherwise read as "$40,".
    const found = (text.match(/\$[\d,]+/g) ?? []).map((f) => f.replace(/,+$/, ""));
    for (const f of found) {
      expect(allowed.has(f), `unexplained price literal on the page: ${f}`).toBe(true);
    }
  });
});
