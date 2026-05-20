/**
 * brain.mjs — the lawn-care domain brain.
 *
 * The shared intelligence every lawn-care agent imports. This is the part
 * that makes the cluster "brilliant in the field" and lets it out-think a
 * generic field-service tool like Jobber: SWFL-specific seasonal ops, a
 * deterministic pricing engine, route-density logic, upsell triggers, and
 * churn scoring — all rules-based, so they run with zero API quota.
 *
 * Self-contained: depends only on Node builtins. Lawn-care agents import
 * ONLY from this file, so the pack stays portable + reusable as a template
 * for the next service vertical.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const BIZ = path.join(homedir(), "Documents/businesses");

// ── Domain knowledge ────────────────────────────────────────────────────
export const KNOWLEDGE = {
  region: "Southwest Florida (Lee, Collier, Charlotte counties)",
  // SWFL grass grows year-round; cadence and service mix shift by season.
  seasons: {
    "growth": {
      months: [5, 6, 7, 8, 9, 10],
      label: "Rainy / peak growth (May–Oct)",
      mow_cadence: "weekly",
      push: ["weekly maintenance upsell to year-round", "storm prep + trimming", "post-storm cleanup"],
    },
    "dry": {
      months: [11, 12, 1, 2, 3, 4],
      label: "Dry season (Nov–Apr)",
      mow_cadence: "bi-weekly option",
      push: ["irrigation tune-ups", "mulch + bed refresh", "landscape design projects (best planting weather)"],
    },
  },
  // SWFL counties restrict N/P fertilizer in the summer rainy season.
  fertilizer_blackout: {
    months: [6, 7, 8, 9],
    note: "Most SWFL counties prohibit nitrogen/phosphorus fertilizer Jun–Sep. Agents must never schedule or quote fertilization in the blackout window.",
  },
  // What makes this platform beat Jobber — the agent cluster's mandate.
  beyond_jobber: [
    "AI-native: quoting, scheduling, comms and follow-up run autonomously, not as manual forms.",
    "SWFL-specialized: seasonal cadence, fertilizer-ordinance compliance, storm-season surges built in.",
    "Route-density optimization: routes scored on billable-vs-drive ratio, not just pinned on a map.",
    "Weather-reactive scheduling: rain-day jobs auto-roll with catch-up logic.",
    "Proactive customer care: photo-backed 'here's what we did / noticed' updates, not a passive client hub.",
    "Churn prediction + upsell detection from job history, not just an invoice list.",
    "Dynamic, transparent pricing by lot size and property difficulty.",
  ],
};

// ── Pricing engine (deterministic — no API needed) ──────────────────────
const MOW_BASE = { small: 12000, medium: 15000, large: 20000, xl: 28000 }; // cents / month
const DIFFICULTY_MULT = { easy: 0.9, standard: 1.0, hard: 1.25 };
const PROJECT_BASE = {
  "landscape-design": 85000,
  "mulch-beds": 35000,
  "trimming": 18000,
  "seasonal-cleanup": 22000,
  "irrigation": 12000,
};

/** Price a service for a property. Returns cents. property = {lotBand, difficulty}. */
export function priceService(serviceKey, property = {}) {
  const lot = property.lotBand || "medium";
  const mult = DIFFICULTY_MULT[property.difficulty] || 1.0;
  if (serviceKey === "weekly-maintenance") {
    return Math.round((MOW_BASE[lot] || MOW_BASE.medium) * mult);
  }
  const base = PROJECT_BASE[serviceKey] || 20000;
  return Math.round(base * mult);
}

// ── Route optimization ──────────────────────────────────────────────────
/**
 * Order jobs into a tight route: grouped by service day, then by zone so
 * the crew never criss-crosses. Density is profit.
 */
export function optimizeRoute(jobs = []) {
  const byDay = {};
  for (const j of jobs) {
    const day = j.day || "unassigned";
    (byDay[day] ||= []).push(j);
  }
  for (const day of Object.keys(byDay)) {
    byDay[day].sort((a, b) => String(a.zone || "").localeCompare(String(b.zone || "")));
  }
  return byDay;
}

/** Drive-efficiency score for a day's route: billable share of the day. */
export function routeDensityScore(dayJobs = []) {
  if (!dayJobs.length) return 0;
  const zones = new Set(dayJobs.map((j) => j.zone || "?"));
  // Tighter (fewer zones per job) = denser = better. 100 = all one zone.
  return Math.max(0, Math.round(100 - (zones.size - 1) * (60 / dayJobs.length)));
}

// ── Upsell triggers ─────────────────────────────────────────────────────
export function upsellTriggers(property = {}, history = []) {
  const flags = [];
  const did = (s) => history.some((h) => h.service === s);
  const month = new Date().getMonth() + 1;
  if (property.beds_overgrown) flags.push({ service: "mulch-beds", reason: "Beds flagged overgrown on last visit." });
  if (property.brown_patches) flags.push({ service: "irrigation", reason: "Brown patches — likely an irrigation or fungus issue." });
  if ([5, 6].includes(month) && !did("trimming")) flags.push({ service: "trimming", reason: "Pre-storm season — trim before hurricane season." });
  if ([10, 11].includes(month) && !did("seasonal-cleanup")) flags.push({ service: "seasonal-cleanup", reason: "End of rainy season — full property reset." });
  if ([11, 12, 1].includes(month) && !did("landscape-design")) flags.push({ service: "landscape-design", reason: "Dry season — best planting window for new landscaping." });
  return flags;
}

// ── Churn risk scoring ──────────────────────────────────────────────────
export function churnRisk(customer = {}) {
  let score = 0;
  const reasons = [];
  if (customer.missed_payments > 0) { score += 35; reasons.push("missed payment"); }
  if (customer.declined_extras >= 2) { score += 20; reasons.push("declined extras twice"); }
  if (customer.last_login_days > 60) { score += 15; reasons.push("no portal login in 60+ days"); }
  if (customer.open_complaint) { score += 30; reasons.push("open complaint"); }
  if ((new Date().getMonth() + 1) === 11 && customer.type === "seasonal") { score += 25; reasons.push("seasonal-resident cancel window"); }
  const level = score >= 50 ? "high" : score >= 25 ? "medium" : "low";
  return { score: Math.min(100, score), level, reasons };
}

// ── Seasonal action of the moment ───────────────────────────────────────
export function seasonalActions(date = new Date()) {
  const m = date.getMonth() + 1;
  const season = KNOWLEDGE.seasons.growth.months.includes(m)
    ? KNOWLEDGE.seasons.growth
    : KNOWLEDGE.seasons.dry;
  return {
    season: season.label,
    mow_cadence: season.mow_cadence,
    push: season.push,
    fertilizer_allowed: !KNOWLEDGE.fertilizer_blackout.months.includes(m),
  };
}

// ── Tenant ops data layer (JSON stores under businesses/<slug>/ops) ─────
export function opsDir(slug) {
  return path.join(BIZ, slug, "ops");
}

export async function loadStore(slug, name, fallback = []) {
  const f = path.join(opsDir(slug), `${name}.json`);
  if (!existsSync(f)) return fallback;
  try {
    return JSON.parse(await fs.readFile(f, "utf8"));
  } catch {
    return fallback;
  }
}

export async function saveStore(slug, name, data) {
  await fs.mkdir(opsDir(slug), { recursive: true });
  await fs.writeFile(path.join(opsDir(slug), `${name}.json`), JSON.stringify(data, null, 2));
}

/** Ensure every ops store exists — the "build" side scaffolding. */
export async function scaffoldOps(slug) {
  const stores = ["leads", "quotes", "jobs", "invoices", "customers", "schedule"];
  const created = [];
  for (const s of stores) {
    const f = path.join(opsDir(slug), `${s}.json`);
    if (!existsSync(f)) {
      await saveStore(slug, s, []);
      created.push(s);
    }
  }
  return created;
}

export async function auditLC(slug, record) {
  const f = path.join(BIZ, slug, "audit-log.jsonl");
  await fs.mkdir(path.dirname(f), { recursive: true });
  await fs.appendFile(f, JSON.stringify({ ts: new Date().toISOString(), tenant: slug, ...record }) + "\n");
}

export function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
