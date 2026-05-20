/**
 * targets.mjs — the realty county watch list.
 *
 * Jack Telegrams a county (or a metro that expands to several) and each one
 * becomes a standing target in businesses/<slug>/ops/targets.json. The
 * county-feed agent works the list every scout run: sourcing properties,
 * filing a CSV to-do when needed, and keeping each target's stats fresh.
 *
 * Stored as a bare array (consistent with properties.json / evaluations.json)
 * so the dashboard reads ops.targets directly.
 */

import { loadStore, saveStore } from "./brain.mjs";

export const REALTY_SLUG = "day14-realty";

/** Stable id for a county target. */
export function targetId(county, state) {
  return `${county}-${state || "xx"}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Human label for a county target. */
export function targetLabel(county, state) {
  const c = /count(y|ies)$/i.test(county) ? county : `${county} County`;
  return state ? `${c}, ${state}` : c;
}

export async function loadTargets(slug = REALTY_SLUG) {
  return await loadStore(slug, "targets", []);
}

export async function saveTargets(slug, targets) {
  await saveStore(slug, "targets", targets);
}

/**
 * Add a county to the watch list. Deduped by county+state — re-adding an
 * existing county returns it untouched (created: false).
 */
export async function addTarget(slug, { county, state = "", source = "telegram", cities = [] }) {
  if (!county) throw new Error("addTarget: county is required");
  const targets = await loadTargets(slug);
  const id = targetId(county, state);
  const existing = targets.find((t) => t.id === id);
  if (existing) return { target: existing, created: false };

  const target = {
    id,
    county,
    state,
    label: targetLabel(county, state),
    status: "queued", // queued -> active (has properties) | needs-csv (awaiting drop)
    monitor: true,
    source,
    cities,
    added_at: new Date().toISOString(),
    last_scanned_at: null,
    properties_sourced: 0,
    a_tier: 0,
  };
  targets.push(target);
  await saveTargets(slug, targets);
  return { target, created: true };
}

/** Patch a target in place by id. */
export async function updateTarget(slug, id, patch) {
  const targets = await loadTargets(slug);
  const t = targets.find((x) => x.id === id);
  if (!t) return null;
  Object.assign(t, patch);
  await saveTargets(slug, targets);
  return t;
}

/** Loose county-name match ("Travis", "travis county" -> same). */
export function sameCounty(a, b) {
  const norm = (x) =>
    String(x || "")
      .toLowerCase()
      .replace(/count(y|ies)/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  return norm(a) && norm(a) === norm(b);
}

/**
 * Guidance for where to get a county's official property-appraiser export.
 * Honest sourcing — public records, no scraping.
 */
export function countyExportHint(county, state) {
  const where = state ? `${county} County, ${state}` : `${county} County`;
  return (
    `Day14 needs the public-records property roll for ${where}. ` +
    `Search "${county} County ${state || ""} property appraiser data export" (or the county GIS / open-data portal), ` +
    `download the CSV, and drop it into businesses/${REALTY_SLUG}/intake/ — name it ` +
    `"${county.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-county.csv". ` +
    `The scout ingests, scores, and starts monitoring it automatically.`
  );
}
