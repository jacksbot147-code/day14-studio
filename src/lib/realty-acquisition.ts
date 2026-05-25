/**
 * realty-acquisition.ts — the least-cash acquisition strategist.
 *
 * Phase 2 of the Realty advancement plan. Given a property, its evaluation,
 * and the buyer profile, this ranks every legal way to take the property down
 * by the cash it needs out of pocket — cheapest first. It folds in the
 * financing math (cash to close, cash left in after a refinance).
 *
 * Honesty rules: every cash figure is a rough planning estimate from the
 * property's own numbers, never a quote. Creative-finance routes depend on a
 * willing seller and carry real risks — each route states its own.
 */

import type { BuyerProfile, REEvaluation } from "./admin-state";
import type { REProperty } from "./realty-gameplan";

export const DEFAULT_BUYER_PROFILE: BuyerProfile = {
  cash_available_cents: 0,
  credit_band: "unknown",
  has_llc: false,
  will_owner_occupy: false,
  goal: "mixed",
};

export type RouteFit = "strong" | "possible" | "weak" | "not-now";

export interface AcquisitionRoute {
  id: string;
  name: string;
  cash_cents: number;
  cash_label: string;
  fit: RouteFit;
  summary: string;
  needs: string;
  risk: string;
}

export interface AcquisitionPlan {
  routes: AcquisitionRoute[];
  profileSet: boolean;
  note: string;
}

function clampCents(n: number): number {
  return Math.max(0, Math.round(n || 0));
}

/** Rank every acquisition route for this property + buyer, cheapest cash first. */
export function buildAcquisitionPlan(
  p: REProperty,
  e: REEvaluation,
  profile: BuyerProfile
): AcquisitionPlan {
  const value = e.value_cents || 0;
  const mao = e.flip.mao_cents || 0;
  const repairs = e.flip.repairs_cents || 0;
  const arv = e.flip.arv_cents || value;
  const goodCredit = profile.credit_band === "excellent" || profile.credit_band === "good";

  const routes: AcquisitionRoute[] = [];

  routes.push({
    id: "wholesale-assign",
    name: "Wholesale assignment",
    cash_cents: 100000,
    cash_label: "earnest money — often recovered at assignment",
    fit: e.best_play === "wholesale" || e.wholesale.score >= 70 ? "strong" : "possible",
    summary:
      "Put the property under contract, then assign that contract to a cash buyer for a fee. You never take title and never get a loan — the lowest-cash route there is.",
    needs: "A signed purchase contract and a cash buyer ready to close.",
    risk: "You do not own the property, so the deal collapses if the buyer walks. A few states regulate wholesale assignment — confirm the rules for this state before relying on it.",
  });

  routes.push({
    id: "partnership",
    name: "Partnership / JV",
    cash_cents: 0,
    cash_label: "none of your own cash — the partner funds it",
    fit: "possible",
    summary:
      "Bring the deal and the work; a capital partner brings the money. You split the profit by a written agreement.",
    needs: "A capital partner and a clear written JV agreement.",
    risk: "You give up a share of the profit, and a partnership is only as good as the agreement and the partner.",
  });

  routes.push({
    id: "subject-to",
    name: "Subject-to (take over the mortgage)",
    cash_cents: 500000,
    cash_label: "estimated arrears + closing",
    fit: "possible",
    summary:
      "Take over the seller's existing mortgage payments and the deed, leaving the loan itself in place. Very low cash if there is a loan to take over.",
    needs: "A motivated seller and an existing mortgage in good-enough standing.",
    risk: "The loan's due-on-sale clause lets the lender call the full balance — a real risk that must be understood and managed. This property's records may not even show a mortgage; verify one exists first.",
  });

  routes.push({
    id: "seller-finance",
    name: "Seller financing",
    cash_cents: clampCents(mao * 0.07),
    cash_label: "estimated down payment — negotiable",
    fit: e.wholesale.equity_pct >= 60 ? "strong" : "possible",
    summary:
      "The seller acts as the bank — you pay them over time instead of a lender. The down payment is whatever you negotiate, often small.",
    needs: "A seller with enough equity to carry the note. High-equity and absentee owners are the best candidates.",
    risk: "It depends entirely on the seller agreeing. Watch the interest rate and any balloon payment in the terms.",
  });

  routes.push({
    id: "lease-option",
    name: "Lease-option",
    cash_cents: clampCents(value * 0.03),
    cash_label: "estimated option fee",
    fit: "possible",
    summary:
      "Lease the property now with the right to buy it later at a set price. A low-cash way to lock in control and a price.",
    needs: "A seller open to a rent-to-own arrangement.",
    risk: "You do not own it during the option period, and the option fee is generally lost if you do not buy.",
  });

  routes.push({
    id: "brrrr",
    name: "BRRRR — buy, rehab, rent, refinance",
    cash_cents: clampCents(mao + repairs - arv * 0.75),
    cash_label: "estimated cash left in after the refinance",
    fit: e.best_play === "flip" || e.best_play === "rental" ? "strong" : "possible",
    summary:
      "Buy with short-term money, renovate, rent it out, then refinance to pull most of your cash back out — and repeat. Low cash left in if the deal is good.",
    needs: "Short-term funding for the buy + rehab, then a rental that appraises and rents well enough to refinance.",
    risk: "You front the full buy + rehab during the project. If the property does not appraise or rent as expected, cash gets stuck in the deal.",
  });

  routes.push({
    id: "hard-money",
    name: "Hard / private money",
    cash_cents: clampCents((mao + repairs) * 0.13),
    cash_label: "estimated down payment + closing",
    fit: e.best_play === "flip" ? "strong" : "possible",
    summary:
      "A short-term, asset-based loan that covers most of the purchase and rehab. Fast to close, higher rate.",
    needs: "A hard-money or private lender, and a clear exit — a sale or a refinance — within the loan's short term.",
    risk: "High interest and a short term. If the exit slips, the carrying cost bites hard.",
  });

  routes.push({
    id: "dscr-loan",
    name: "DSCR / investor loan",
    cash_cents: clampCents(value * 0.27),
    cash_label: "estimated ~25% down + closing",
    fit:
      e.best_play === "rental" && goodCredit
        ? "strong"
        : e.best_play === "rental"
        ? "possible"
        : "weak",
    summary:
      "A rental-property loan qualified on the property's rent, not your personal income. Typically 20-25% down, and usually held in an LLC.",
    needs: "Reasonable credit and a property whose rent covers the loan payment.",
    risk: "A larger cash outlay than the creative routes, and the rate runs higher than an owner-occupied mortgage.",
  });

  if (profile.will_owner_occupy) {
    routes.push({
      id: "fha-low-down",
      name: "FHA / low-down — owner-occupied",
      cash_cents: clampCents(value * 0.06),
      cash_label: "estimated ~3.5% down + closing",
      fit: "strong",
      summary:
        "If you will live in the property, an owner-occupied loan needs very little down. FHA 203(k) can even roll the renovation into the loan.",
      needs: "You move in as your primary residence and meet the loan's credit requirements.",
      risk: "Owner-occupancy is required and is verified — this route does not apply to a pure investment property.",
    });
  }

  const cashNeeded = clampCents(value * 1.03);
  routes.push({
    id: "all-cash",
    name: "All cash",
    cash_cents: cashNeeded,
    cash_label: "full purchase + closing",
    fit:
      profile.cash_available_cents >= cashNeeded
        ? "strong"
        : profile.cash_available_cents > 0
        ? "not-now"
        : "possible",
    summary:
      "Buy outright with no loan. The simplest, strongest offer to a seller — but it ties up the most of your own cash.",
    needs: "Enough cash to cover the full price plus closing costs.",
    risk: "Your capital is fully committed to one property — the opposite of the least-cash goal.",
  });

  routes.sort((a, b) => a.cash_cents - b.cash_cents);

  const profileSet =
    profile.cash_available_cents > 0 || profile.credit_band !== "unknown";
  const note = profileSet
    ? "Cheapest cash first. Every figure is a rough planning estimate from this property's numbers — confirm real terms with the lender or seller."
    : "Set your buyer profile (cash, credit, whether you'll live in it) to personalize these routes — especially the loan and all-cash options.";

  return { routes, profileSet, note };
}
