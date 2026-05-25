/**
 * realty-loopfinder.ts — the per-property loophole scan.
 *
 * Phase 4 of the Realty advancement plan, and the bridge to Life Loophole.
 * For one property it surfaces every legal advantage: tax angles (ported from
 * the Life Loophole catalog's real-estate strategies, IRS sources intact),
 * and market / legal edges read from the property's own signals.
 *
 * COMPLIANCE: tax items are educational information, not tax advice. Whether
 * any applies depends on how the property is held, the entity structure, and
 * current tax law — confirm with a licensed CPA, EA, or tax attorney.
 */

import type { REEvaluation } from "./admin-state";
import type { REProperty } from "./realty-gameplan";

export interface LoopholeItem {
  name: string;
  what: string;
  applies: string;
  irs_source: string;
  needs_pro: boolean;
}
export interface MarketEdge {
  signal: string;
  advantage: string;
}
export interface LoopholeScan {
  taxAngles: LoopholeItem[];
  marketEdges: MarketEdge[];
  financingNote: string;
  disclaimer: string;
}

export const LOOPFINDER_DISCLAIMER =
  "Educational information, not tax advice. Whether any of these applies depends on how you hold the property, your entity structure, and current tax law. Confirm every item with a licensed CPA, Enrolled Agent, or tax attorney before acting.";

/** The per-property tax advantage scan, tailored to this property + play. */
export function buildLoopholeScan(p: REProperty, e: REEvaluation): LoopholeScan {
  const play = e.best_play;
  const sqft = p.sqft || 0;
  const dated = !!(p.year_built && p.year_built < 1985);

  const taxAngles: LoopholeItem[] = [
    {
      name: "Rental real estate depreciation",
      what: "Hold a property as a rental and the tax code lets you write off part of the building's value every year — a deduction you take without spending a dollar of cash.",
      applies:
        play === "rental"
          ? "This scores best as a rental, so depreciation would shelter much of the rental income from tax from year one."
          : "If you keep this as a rental instead of flipping it, annual depreciation becomes available.",
      irs_source: "IRC Section 168; IRS Publication 527; Form 4562",
      needs_pro: false,
    },
    {
      name: "Cost segregation study",
      what: "A study that breaks the building into its parts so the faster-wearing pieces depreciate much sooner — front-loading the write-offs into the early years.",
      applies:
        sqft >= 1500
          ? `At about ${sqft.toLocaleString()} sq ft this is sizable enough that a study could be worth its cost — best done early in ownership.`
          : "Worth pricing out if you hold this as a rental; the payoff is larger on bigger buildings.",
      irs_source: "IRS Cost Segregation Audit Techniques Guide; IRC Section 168; IRS Publication 946",
      needs_pro: true,
    },
    {
      name: "1031 like-kind exchange",
      what: "When you sell an investment property at a gain, a 1031 exchange lets you roll the proceeds into another investment property and defer the capital-gains tax.",
      applies:
        "Relevant on the exit — when you sell this property, a 1031 exchange can defer the tax and keep your full proceeds working. The 45- and 180-day deadlines are strict; plan it before you sell.",
      irs_source: "IRC Section 1031; Form 8824; IRS Publication 544",
      needs_pro: true,
    },
    {
      name: "Real estate professional status",
      what: "Qualify as a real estate professional and rental paper-losses can offset your other income — wages, business profit — instead of being trapped as passive losses.",
      applies:
        "If you build a rental portfolio and spend enough time on real estate, this status can free the losses from this property against your other income. It is heavily scrutinized — a contemporaneous time log is essential.",
      irs_source: "IRC Section 469(c)(7); Treasury Regulation 1.469-9; IRS Publication 925",
      needs_pro: true,
    },
    {
      name: "Section 179 / bonus depreciation",
      what: "Certain improvements and equipment placed in service can be written off immediately, instead of slowly over decades.",
      applies:
        dated
          ? "This is an older build likely to need a rehab — some of those components and equipment may qualify for immediate expensing in the year of the work."
          : "On any rehab, some components and equipment may qualify for immediate expensing rather than long depreciation.",
      irs_source: "IRC Section 179; IRC Section 168(k); IRS Publication 946; Form 4562",
      needs_pro: false,
    },
    {
      name: "Qualified Opportunity Zone",
      what: "If a property sits in a designated Opportunity Zone, reinvesting a capital gain into it can defer — and, held long enough, partly erase — tax on that gain.",
      applies:
        "Check whether this parcel falls inside a designated Qualified Opportunity Zone. If it does, it opens a powerful gain-deferral path; if not, this one does not apply.",
      irs_source: "IRC Section 1400Z-2; Form 8997; Form 8949",
      needs_pro: true,
    },
    {
      name: "Augusta Rule (14-day rental)",
      what: "If you own a business, you can rent a property you own to that business for up to 14 days a year and receive that rental income completely tax-free.",
      applies:
        "If you own a business, this property could host legitimate, documented business use up to 14 days a year — tax-free income to you, a deductible expense to the business.",
      irs_source: "IRC Section 280A(g)",
      needs_pro: false,
    },
    {
      name: "Primary-residence capital gains exclusion",
      what: "Live in a home as your main residence for at least 2 of the 5 years before selling, and a large amount of the gain on sale is excluded from federal tax.",
      applies:
        "Only if you would live in this property yourself — then a later sale could be largely tax-free. It does not apply to a pure flip or rental.",
      irs_source: "IRC Section 121; IRS Publication 523",
      needs_pro: false,
    },
  ];

  const marketEdges: MarketEdge[] = [];
  const sig = new Set(e.signals || []);
  if (sig.has("absentee-owner")) {
    marketEdges.push({
      signal: "Absentee owner",
      advantage:
        "The owner does not live at the property. Absentee owners sell more readily and tend to negotiate with more flexibility.",
    });
  }
  if (p.tax_status === "delinquent" || sig.has("tax-delinquent")) {
    marketEdges.push({
      signal: "Tax-delinquent",
      advantage:
        "The owner is behind on property taxes — a strong motivated-seller signal. Confirm exactly what is owed; back taxes come off your margin.",
    });
  }
  if (sig.has("dated build (pre-1985)") || dated) {
    marketEdges.push({
      signal: "Older home",
      advantage:
        "An older, likely long-held home. Owners of dated homes are often ready to sell rather than take on a renovation themselves.",
    });
  }
  if (p.vacant || sig.has("likely vacant")) {
    marketEdges.push({
      signal: "Likely vacant",
      advantage:
        "No occupant to displace, easier to inspect, and often a more motivated owner carrying an empty property.",
    });
  }
  if (sig.has("long-time owner (15y+)")) {
    marketEdges.push({
      signal: "Long-time owner",
      advantage:
        "Held for 15+ years — likely deep equity, and an owner who may be ready for a change.",
    });
  }
  if (e.wholesale.equity_pct >= 60) {
    marketEdges.push({
      signal: `High equity (~${e.wholesale.equity_pct}%)`,
      advantage:
        "The owner holds substantial equity — room to negotiate on price, and a real candidate for seller financing.",
    });
  }
  if (marketEdges.length === 0) {
    marketEdges.push({
      signal: "No standout signals yet",
      advantage:
        "No strong motivated-seller signals in the data so far. Enrichment and a closer look may surface more.",
    });
  }

  return {
    taxAngles,
    marketEdges,
    financingNote:
      "Every creative-finance structure — subject-to, seller financing, lease-option, BRRRR — is itself a legal way to acquire this property for less cash. See “Acquire it for the least cash” above for the routes ranked for this deal.",
    disclaimer: LOOPFINDER_DISCLAIMER,
  };
}
