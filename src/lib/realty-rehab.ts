/**
 * realty-rehab.ts — the line-item rehab estimator.
 *
 * Phase 5 of the Realty advancement plan. The evaluation gives a single
 * repair number; this breaks it into a category-by-category scope so a flip
 * can be planned and so a contractor's bid has something to check against.
 *
 * Every figure is a rough planning estimate, not a bid. A real contractor
 * walkthrough is the only thing that turns this into a number to offer on.
 */

import type { REEvaluation } from "./admin-state";
import type { REProperty } from "./realty-gameplan";

export interface RehabLine {
  category: string;
  cents: number;
  note: string;
}
export interface RehabEstimate {
  lines: RehabLine[];
  total_cents: number;
  basis: string;
  disclaimer: string;
}

// Category splits of the total repair budget. Older homes shift weight toward
// the roof, systems, and wiring; newer homes toward cosmetic finishes.
const SPLIT_OLD: [string, number, string][] = [
  ["Roof", 0.17, "Older roofs often need full replacement — a newer roof also lowers SWFL wind-mitigation insurance."],
  ["HVAC", 0.12, "Aging air handlers and condensers; replacement is common on a pre-1985 home."],
  ["Electrical & plumbing", 0.13, "Panel, wiring, or supply-line updates are often needed to pass inspection."],
  ["Kitchen", 0.16, "Cabinets, counters, and appliances — the highest-impact room for resale."],
  ["Bathrooms", 0.11, "Fixtures, tile, and vanities."],
  ["Flooring", 0.12, "Replace throughout for a consistent, move-in-ready look."],
  ["Interior paint & finishes", 0.07, "Paint, trim, doors, and hardware."],
  ["Exterior & landscaping", 0.07, "Curb appeal — paint, cleanup, and basic landscaping."],
  ["Contingency", 0.05, "Always carry a buffer — older homes hide surprises."],
];
const SPLIT_NEW: [string, number, string][] = [
  ["Roof", 0.13, "Inspect age and condition; budget for repair or replacement."],
  ["HVAC", 0.1, "Service or replace depending on age."],
  ["Kitchen", 0.18, "Cabinets, counters, and appliances — the highest-impact room for resale."],
  ["Bathrooms", 0.12, "Fixtures, tile, and vanities."],
  ["Flooring", 0.14, "Replace throughout for a consistent, move-in-ready look."],
  ["Interior paint & finishes", 0.09, "Paint, trim, doors, and hardware."],
  ["Electrical & plumbing", 0.09, "Minor updates and fixture replacement."],
  ["Exterior & landscaping", 0.08, "Curb appeal — paint, cleanup, and basic landscaping."],
  ["Contingency", 0.07, "Always carry a buffer — something always turns up."],
];

/** Break the evaluation's repair total into a category-by-category scope. */
export function buildRehabEstimate(p: REProperty, e: REEvaluation): RehabEstimate {
  const total = e.flip.repairs_cents || 0;
  const old = !!(p.year_built && p.year_built < 1985);
  const split = old ? SPLIT_OLD : SPLIT_NEW;
  const lines: RehabLine[] = split.map(([category, frac, note]) => ({
    category,
    cents: Math.round(total * frac),
    note,
  }));
  const sqft = p.sqft || 0;
  return {
    lines,
    total_cents: total,
    basis: sqft
      ? `Estimated from about ${sqft.toLocaleString()} sq ft at a ${p.condition || "medium"}-condition repair rate${old ? ", weighted for an older build" : ""}.`
      : `Estimated at a ${p.condition || "medium"}-condition repair rate.`,
    disclaimer:
      "A rough planning estimate, not a bid. Before any flip offer, get a contractor to walk the property and put a written scope and price to it — that number, not this one, is what you offer on.",
  };
}
