/**
 * brain.mjs — the real-estate domain brain.
 *
 * Shared intelligence for the real-estate agent pack. Turns a raw county
 * property record into a scored deal across three plays — fix & flip,
 * rental / buy-and-hold, and wholesale — plus a blended deal score.
 *
 * Every formula is deterministic (no API quota). Property data comes from
 * official county property-appraiser exports + a licensed valuation API
 * (RentCast / ATTOM / Estated) — never from scraping Zillow.
 *
 * Self-contained: depends only on Node builtins. Real-estate agents import
 * ONLY from this file, so the pack stays portable as a vertical template.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const BIZ = path.join(homedir(), "Documents/businesses");

export const KNOWLEDGE = {
  segment: "Real estate — county-records deal sourcing + property evaluation",
  data_sources: {
    county: "Official county property-appraiser data exports (public records). Drop CSVs into businesses/<slug>/intake/.",
    valuation: "Licensed property API (RentCast / ATTOM / Estated) for AVM value, rent estimate, comps. Key: REALESTATE_API_KEY.",
    never: "Zillow / Redfin scraping — against their terms and brittle. Licensed APIs only.",
  },
  // Rules of thumb the evaluation layer encodes.
  rules: {
    flip_70_rule: "Max Allowable Offer = ARV x 0.70 - repair cost.",
    rental_1pct: "Monthly rent >= 1% of price is a strong rental.",
    good_cap_rate: "Cap rate >= 8% is strong for SWFL single-family.",
    holding_closing: "Budget ~12% of ARV for holding + closing + selling costs on a flip.",
  },
  // FL note: homesteaded 'assessed' values are capped low by Save Our Homes —
  // always prefer market/just value for evaluation.
  fl_note: "Florida assessed values are capped on homesteaded property; use market/just value.",
};

// Repair cost per sqft (cents) by condition band.
const REPAIR_RATE = { light: 1500, medium: 3200, heavy: 6000 };

export function money(cents) {
  return `$${Math.round((cents || 0) / 100).toLocaleString()}`;
}
function clamp(n, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}
function yearsSince(dateStr) {
  if (!dateStr) return 0;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return 0;
  return (Date.now() - t) / (365.25 * 24 * 3600 * 1000);
}

/** Normalize a raw (county CSV) record into the property schema. */
export function normalizeProperty(raw = {}) {
  const num = (v) => {
    const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  return {
    id: raw.id || raw.parcel || raw.parcel_id || `prop-${Math.random().toString(36).slice(2, 9)}`,
    address: raw.address || raw.site_address || raw.property_address || "",
    city: raw.city || "",
    county: raw.county || "",
    zip: raw.zip || raw.zipcode || "",
    owner_name: raw.owner_name || raw.owner || "",
    owner_mailing_address: raw.owner_mailing_address || raw.mailing_address || "",
    beds: num(raw.beds || raw.bedrooms),
    baths: num(raw.baths || raw.bathrooms),
    sqft: num(raw.sqft || raw.living_area || raw.heated_sqft),
    lot_sqft: num(raw.lot_sqft || raw.lot_size),
    year_built: num(raw.year_built),
    assessed_value_cents: Math.round(num(raw.assessed_value) * 100),
    market_value_cents: Math.round(num(raw.market_value || raw.just_value) * 100),
    last_sale_price_cents: Math.round(num(raw.last_sale_price || raw.sale_price) * 100),
    last_sale_date: raw.last_sale_date || raw.sale_date || "",
    tax_status: /deli|due|owed/i.test(String(raw.tax_status || "")) ? "delinquent" : (raw.tax_status || "unknown"),
    vacant: /vacant|y|true/i.test(String(raw.vacant || "")),
    condition: ["light", "medium", "heavy"].includes(raw.condition) ? raw.condition : "medium",
    // enrichment (filled by enrichment-agent):
    avm_value_cents: Math.round(num(raw.avm_value) * 100) || null,
    rent_estimate_cents: Math.round(num(raw.rent_estimate) * 100) || null,
    enriched: false,
  };
}

/** Best available market value, preferring AVM, then county market, then assessed. */
export function bestValue(p) {
  return p.avm_value_cents || p.market_value_cents || Math.round((p.assessed_value_cents || 0) / 0.85) || 0;
}

export function repairEstimate(p) {
  return Math.round((p.sqft || 1200) * (REPAIR_RATE[p.condition] || REPAIR_RATE.medium));
}

/** Motivation / distress signals — strongest predictor of a deal. */
export function motivationSignals(p) {
  const sig = [];
  if (p.tax_status === "delinquent") sig.push({ flag: "tax-delinquent", weight: 3 });
  if (p.owner_mailing_address && p.address && !p.owner_mailing_address.toLowerCase().includes(p.address.toLowerCase().slice(0, 12)))
    sig.push({ flag: "absentee-owner", weight: 2 });
  if (yearsSince(p.last_sale_date) > 15) sig.push({ flag: "long-time owner (15y+)", weight: 1 });
  if (p.vacant) sig.push({ flag: "likely vacant", weight: 2 });
  if (p.year_built && p.year_built < 1985) sig.push({ flag: "dated build (pre-1985)", weight: 1 });
  return sig;
}

// ── Per-strategy evaluation ─────────────────────────────────────────────
export function evaluateFlip(p) {
  const arv = bestValue(p);
  const repairs = repairEstimate(p);
  const mao = Math.round(arv * 0.7) - repairs; // 70% rule
  const acquisition = p.last_sale_price_cents || p.assessed_value_cents || arv;
  const margin = mao - acquisition;
  const profit = arv - mao - repairs - Math.round(arv * 0.12);
  return {
    arv_cents: arv,
    repairs_cents: repairs,
    mao_cents: mao,
    est_profit_cents: profit,
    score: clamp(50 + (margin / (arv || 1)) * 220),
  };
}

export function evaluateRental(p) {
  const value = bestValue(p);
  const monthlyRent = p.rent_estimate_cents || Math.round(value * 0.008); // 0.8% fallback
  const rentToValue = value ? monthlyRent / value : 0;
  const capRate = value ? (monthlyRent * 12 * 0.55) / value : 0; // 0.55 NOI factor
  return {
    monthly_rent_cents: monthlyRent,
    rent_to_value_pct: +(rentToValue * 100).toFixed(2),
    cap_rate_pct: +(capRate * 100).toFixed(2),
    score: clamp(rentToValue * 6000 + capRate * 500),
  };
}

export function evaluateWholesale(p) {
  const value = bestValue(p);
  const owed = p.last_sale_price_cents || Math.round(value * 0.6);
  const equity = value - owed;
  const equityPct = value ? equity / value : 0;
  const motivation = motivationSignals(p);
  const motScore = motivation.reduce((s, m) => s + m.weight, 0);
  return {
    equity_cents: equity,
    equity_pct: +(equityPct * 100).toFixed(1),
    motivation_signals: motivation.map((m) => m.flag),
    score: clamp(equityPct * 90 + motScore * 9),
  };
}

/** Blended deal score (0-100) + the recommended play. */
export function dealScore(p) {
  const flip = evaluateFlip(p);
  const rental = evaluateRental(p);
  const wholesale = evaluateWholesale(p);
  const plays = [
    { play: "flip", score: flip.score },
    { play: "rental", score: rental.score },
    { play: "wholesale", score: wholesale.score },
  ].sort((a, b) => b.score - a.score);
  // Blended: 60% the best play + 25% second + 15% third — a property strong
  // across multiple plays scores higher than a one-trick deal.
  const blended = clamp(plays[0].score * 0.6 + plays[1].score * 0.25 + plays[2].score * 0.15);
  return {
    score: blended,
    best_play: plays[0].play,
    tier: blended >= 75 ? "A — pursue now" : blended >= 55 ? "B — worth a look" : "C — pass / watch",
    flip, rental, wholesale,
    signals: wholesale.motivation_signals,
  };
}

// ── Data layer ──────────────────────────────────────────────────────────
export function opsDir(slug) { return path.join(BIZ, slug, "ops"); }
export function intakeDir(slug) { return path.join(BIZ, slug, "intake"); }

export async function loadStore(slug, name, fallback = []) {
  const f = path.join(opsDir(slug), `${name}.json`);
  if (!existsSync(f)) return fallback;
  try { return JSON.parse(await fs.readFile(f, "utf8")); } catch { return fallback; }
}
export async function saveStore(slug, name, data) {
  await fs.mkdir(opsDir(slug), { recursive: true });
  await fs.writeFile(path.join(opsDir(slug), `${name}.json`), JSON.stringify(data, null, 2));
}
export async function scaffold(slug) {
  await fs.mkdir(intakeDir(slug), { recursive: true });
  const created = [];
  for (const s of ["properties", "evaluations"]) {
    const f = path.join(opsDir(slug), `${s}.json`);
    if (!existsSync(f)) { await saveStore(slug, s, []); created.push(s); }
  }
  return created;
}
export async function auditRE(slug, record) {
  const f = path.join(BIZ, slug, "audit-log.jsonl");
  await fs.mkdir(path.dirname(f), { recursive: true });
  await fs.appendFile(f, JSON.stringify({ ts: new Date().toISOString(), tenant: slug, ...record }) + "\n");
}
