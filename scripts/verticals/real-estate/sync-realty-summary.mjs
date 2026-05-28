#!/usr/bin/env node
/**
 * sync-realty-summary.mjs — build a git-friendly summary of the realty deal
 * board for the hosted /admin/realty page.
 *
 * The full snapshot (`public/data/ops/day14-realty.json`) clocks in around
 * 110+ MB and is gitignored, so the Vercel deploy has no data behind the
 * realty admin. This script reads the source-of-truth stores under
 * `~/Documents/businesses/day14-realty/ops/` and emits a slim summary
 * (`public/data/ops/day14-realty-summary.json`, target < 2 MB) that the
 * admin-state loader falls back to when the full file is absent.
 *
 * Summary shape:
 *   {
 *     slug, generated_at,
 *     counts: { total_properties, by_tier, by_county },
 *     top_a_deals: [{ id, address, score, tier, best_play, value_cents }] (≤ 200),
 *     freshness: { updated_at, added_last_run, added_7d, ... },
 *   }
 *
 * Usage: node scripts/verticals/real-estate/sync-realty-summary.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const OPS_DIR = path.join(homedir(), "Documents/businesses/day14-realty/ops");
const OUT_PATH = path.join(
  REPO_ROOT,
  "public/data/ops/day14-realty-summary.json",
);

const TOP_A_LIMIT = 200;

async function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

function inc(map, key) {
  map[key] = (map[key] || 0) + 1;
}

async function main() {
  const [evaluations, properties, hotLeads, freshness] = await Promise.all([
    readJson(path.join(OPS_DIR, "evaluations.json"), []),
    readJson(path.join(OPS_DIR, "properties.json"), []),
    readJson(path.join(OPS_DIR, "hot-leads.json"), []),
    readJson(path.join(OPS_DIR, "freshness.json"), {}),
  ]);

  // Build a property-id → county lookup so the summary can group by county
  // without paying for the whole 53 MB properties payload.
  const countyById = new Map();
  for (const p of properties) {
    if (p && p.id) countyById.set(String(p.id), p.county || "unknown");
  }

  const byTier = {};
  const byCounty = {};
  for (const e of evaluations) {
    inc(byTier, e.tier || "unknown");
    const county = countyById.get(String(e.property_id)) || "unknown";
    inc(byCounty, county);
  }

  // Top A-tier deals only, slimmed to the columns the dashboard needs to
  // render a ranked list. Drops flip/rental/wholesale sub-objects.
  const aTier = evaluations
    .filter((e) => (e.tier || "").startsWith("A"))
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, TOP_A_LIMIT)
    .map((e) => ({
      id: e.property_id,
      address: e.address,
      city: e.city,
      score: e.score,
      tier: e.tier,
      best_play: e.best_play,
      value_cents: e.value_cents,
      signals: Array.isArray(e.signals) ? e.signals.slice(0, 4) : [],
      county: countyById.get(String(e.property_id)) || "unknown",
    }));

  const summary = {
    slug: "day14-realty",
    generated_at: new Date().toISOString(),
    counts: {
      total_properties: evaluations.length,
      a_tier: byTier["A — pursue now"] || 0,
      b_tier: byTier["B — worth a look"] || 0,
      c_tier: byTier["C — pass / watch"] || 0,
      hot_leads: Array.isArray(hotLeads) ? hotLeads.length : 0,
      by_tier: byTier,
      by_county: byCounty,
    },
    top_a_deals: aTier,
    freshness: {
      updated_at: freshness.updated_at || null,
      first_tracked_at: freshness.first_tracked_at || null,
      total_properties: freshness.total_properties || evaluations.length,
      a_tier: freshness.a_tier || byTier["A — pursue now"] || 0,
      counties: freshness.counties || Object.keys(byCounty).length,
      active_counties: freshness.active_counties || 0,
      added_last_run: freshness.added_last_run || 0,
      added_7d: freshness.added_7d || 0,
    },
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  const json = JSON.stringify(summary, null, 2);
  await fs.writeFile(OUT_PATH, json);

  const bytes = Buffer.byteLength(json, "utf8");
  const mb = (bytes / (1024 * 1024)).toFixed(3);
  console.log(`✓ wrote ${OUT_PATH}`);
  console.log(`  size: ${bytes} bytes (${mb} MB)`);
  console.log(
    `  total properties: ${summary.counts.total_properties}, A-tier: ${summary.counts.a_tier}, top deals listed: ${aTier.length}`,
  );
  if (bytes > 2 * 1024 * 1024) {
    console.warn(
      `  WARN: summary exceeds 2 MB target — consider lowering TOP_A_LIMIT`,
    );
  }
}

main().catch((err) => {
  console.error("sync-realty-summary failed:", err);
  process.exitCode = 1;
});
