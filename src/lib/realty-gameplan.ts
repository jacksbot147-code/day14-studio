/**
 * realty-gameplan.ts — the Property Gameplan assembler.
 *
 * Pure functions: given a property record + its evaluation, assemble the
 * structured gameplan the /admin/realty/[id] page renders — the recommended
 * play and why, the working links, honest risk flags, a step-by-step action
 * plan, and a data-confidence read.
 *
 * Phase 1 of the Realty advancement plan. The least-cash acquisition engine,
 * the contract generator, the loopfinder, and owner skip-trace arrive in
 * later phases and slot into the same gameplan.
 */

import type { REEvaluation } from "./admin-state";

export interface REProperty {
  id: string;
  address?: string;
  city?: string;
  county?: string;
  zip?: string;
  owner_name?: string;
  owner_mailing_address?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  lot_sqft?: number;
  year_built?: number;
  assessed_value_cents?: number;
  market_value_cents?: number;
  last_sale_price_cents?: number;
  last_sale_date?: string;
  tax_status?: string;
  vacant?: boolean;
  condition?: string;
  avm_value_cents?: number | null;
  rent_estimate_cents?: number | null;
  enriched?: boolean;
  comp_arv_cents?: number;
  comp_count?: number;
}

export interface GameplanLink {
  label: string;
  url: string;
  note?: string;
}
export interface GameplanRisk {
  level: "info" | "caution" | "warn";
  text: string;
}
export interface GameplanConfidence {
  level: "high" | "medium" | "low";
  note: string;
}
export interface Gameplan {
  play: string;
  playLabel: string;
  rationale: string;
  confidence: GameplanConfidence;
  links: GameplanLink[];
  risks: GameplanRisk[];
  steps: string[];
  ownerIsAbsentee: boolean;
}

const PLAY_LABEL: Record<string, string> = {
  flip: "Fix & flip",
  rental: "Rental / buy-and-hold",
  wholesale: "Wholesale",
};

// County property-appraiser sites confirmed for the Southwest Florida focus
// counties. Any other county falls back to a search that reliably lands on
// the right appraiser.
const FL_APPRAISER: Record<string, string> = {
  collier: "https://www.collierappraiser.com",
  lee: "https://www.leepa.org",
  charlotte: "https://www.ccappraiser.com",
  sarasota: "https://www.sc-pa.com",
  manatee: "https://www.manateepao.gov",
};

function normCounty(s: string | undefined): string {
  return String(s || "")
    .toLowerCase()
    .replace(/county|counties/g, "")
    .replace(/[^a-z]/g, "");
}

function fullAddress(p: REProperty): string {
  return [p.address, p.city, p.zip ? `FL ${p.zip}` : "FL"].filter(Boolean).join(", ");
}

function isAbsentee(p: REProperty): boolean {
  const mail = (p.owner_mailing_address || "").toLowerCase();
  const addr = (p.address || "").toLowerCase();
  if (!mail || !addr) return false;
  return !mail.includes(addr.slice(0, 12));
}

/** Working links for the property — map, county record, flood zone, owner. */
export function propertyLinks(p: REProperty): GameplanLink[] {
  const q = encodeURIComponent(fullAddress(p));
  const links: GameplanLink[] = [
    {
      label: "Map & Street View",
      url: `https://www.google.com/maps/search/?api=1&query=${q}`,
      note: "see the property and the street",
    },
  ];

  const appraiser = FL_APPRAISER[normCounty(p.county)];
  if (appraiser) {
    links.push({
      label: `${p.county} County property record`,
      url: appraiser,
      note: `official public record — search parcel ${p.id}`,
    });
  } else {
    links.push({
      label: "County property record",
      url: `https://www.google.com/search?q=${encodeURIComponent(
        `${p.county || ""} County FL property appraiser parcel ${p.id}`
      )}`,
      note: "official public record",
    });
  }

  links.push({
    label: "FEMA flood map",
    url: `https://msc.fema.gov/portal/search?AddressQuery=${q}`,
    note: "flood zone drives the insurance cost",
  });

  if (p.owner_mailing_address) {
    links.push({
      label: "Where the owner lives",
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        p.owner_mailing_address
      )}`,
      note: p.owner_mailing_address,
    });
  }
  return links;
}

export function dataConfidence(p: REProperty, e: REEvaluation): GameplanConfidence {
  if (p.enriched || e.enriched) {
    return { level: "high", note: "Value is sharpened by the licensed valuation API." };
  }
  if ((p.comp_count || 0) >= 8) {
    return {
      level: "medium",
      note: `Value is from county records plus ${p.comp_count} comparable sales — solid, but the valuation API would sharpen it.`,
    };
  }
  return {
    level: "low",
    note: "Value is from county records only — treat every number here as a starting point. A real comp pull and the valuation API will sharpen it.",
  };
}

export function playRationale(e: REEvaluation): string {
  const tail = ` (play scores — flip ${e.flip.score}, rental ${e.rental.score}, wholesale ${e.wholesale.score}).`;
  if (e.best_play === "flip") {
    return `Fix & flip is the strongest play here${tail} The gap between the after-repair value and a 70%-rule offer leaves room for a renovation profit — if the repair estimate holds.`;
  }
  if (e.best_play === "rental") {
    return `Rental / buy-and-hold is the strongest play here${tail} The rent relative to the price makes this a hold candidate — confirm it still cash-flows at a real mortgage rate.`;
  }
  return `Wholesale is the strongest play here${tail} High equity plus motivated-seller signals mean you may be able to lock it under contract and assign it without ever owning it — the lowest-cash route of all.`;
}

export function gameplanRisks(p: REProperty, e: REEvaluation): GameplanRisk[] {
  const risks: GameplanRisk[] = [
    {
      level: "caution",
      text: "Southwest Florida property — confirm the flood zone and get a real insurance quote before you trust these numbers. Insurance is one of the largest costs in this market and it varies enormously.",
    },
  ];
  if (!(p.enriched || e.enriched)) {
    risks.push({
      level: "info",
      text: "The value here is estimated from county records, not a licensed valuation. Verify it with a real comparable-sales pull before making any offer.",
    });
  }
  if (!p.last_sale_price_cents) {
    risks.push({
      level: "caution",
      text: "No recorded sale price for this property. The equity and the flip acquisition cost are estimates — check the county records for an existing mortgage or lien.",
    });
  }
  if (p.year_built && p.year_built < 1985) {
    risks.push({
      level: "caution",
      text: `Built in ${p.year_built} — budget for roof, HVAC, electrical, and possible code updates. Older SWFL homes also face stricter wind-mitigation insurance rules.`,
    });
  }
  if (p.tax_status === "delinquent") {
    risks.push({
      level: "warn",
      text: "Tax-delinquent. That is a motivated-seller signal, but confirm exactly what is owed — back taxes come straight off your margin.",
    });
  }
  if (p.vacant) {
    risks.push({
      level: "info",
      text: "Flagged likely vacant — often a more motivated seller, and easier to inspect.",
    });
  }
  if (e.wholesale.equity_pct >= 95) {
    risks.push({
      level: "info",
      text: "Equity reads at or near 100% — this usually means no mortgage data was available, not that the home is truly free and clear. Verify before counting on it.",
    });
  }
  return risks;
}

export function actionPlan(p: REProperty, e: REEvaluation): string[] {
  const steps = [
    "Pull the full county property record — confirm beds, baths, square footage, lot size, and the legal description.",
    "Drive the property (or send someone) — photos of the roof, the exterior condition, and the street.",
    "Pull real comparable sales from the last 6 months within about a mile.",
    "Confirm the FEMA flood zone and get an insurance quote — in SWFL this can change the whole deal.",
  ];
  if (e.best_play === "flip") {
    steps.push("Get a contractor's repair bid against a written renovation scope.");
    steps.push("Re-run the 70% rule with the real after-repair value and the real repair cost.");
    steps.push("Line up funding — the lowest-cash options are computed for you in the next phase of this tool.");
  } else if (e.best_play === "rental") {
    steps.push("Verify the market rent against current local listings.");
    steps.push("Run the full numbers — property tax, insurance, any HOA, vacancy, and management.");
    steps.push("Confirm it still cash-flows at today's mortgage rate, not a best-case one.");
  } else {
    steps.push("Research the owner's situation — why might they sell, and how soon?");
    steps.push("Make contact and gauge motivation (owner skip-trace and outreach drafting arrive in a later phase).");
    steps.push("If they are motivated, lock the property under a purchase contract, then line up a cash buyer.");
  }
  steps.push(
    "The least-cash acquisition plan, the contract documents, and the owner-contact tools are the next phases of this build."
  );
  return steps;
}

export function buildGameplan(p: REProperty, e: REEvaluation): Gameplan {
  return {
    play: e.best_play,
    playLabel: PLAY_LABEL[e.best_play] || e.best_play,
    rationale: playRationale(e),
    confidence: dataConfidence(p, e),
    links: propertyLinks(p),
    risks: gameplanRisks(p, e),
    steps: actionPlan(p, e),
    ownerIsAbsentee: isAbsentee(p),
  };
}
