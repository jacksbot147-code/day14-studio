/**
 * comp-analyst.mjs — comparable-sales analysis.
 *
 * BUILD: extends each property with a comp-based ARV.
 * OPERATE: for every property, finds true comparables within the tracked set
 *   (same city, living area within +/-25%, bed count within +/-1), takes the
 *   median price-per-sqft, and writes a comp ARV onto the property. The
 *   evaluation layer prefers this over the raw county value.
 */

import { loadStore, saveStore, scaffold, bestValue, auditRE } from "./brain.mjs";

export const BUILD_SPEC = {
  capability: "comp-analyst",
  beyond: "ARV from real comparables in the set, not a single blunt AVM — sharper flip math without an API call.",
  ui_next: "Per-property card shows comp ARV + the comp count behind it.",
};

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export async function operate(slug) {
  await scaffold(slug);
  const properties = await loadStore(slug, "properties");

  let computed = 0;
  for (const p of properties) {
    if (!p.sqft || p.sqft < 200) continue;
    const ppsf = properties
      .filter(
        (c) =>
          c.id !== p.id &&
          c.sqft > 200 &&
          (!p.city || !c.city || c.city.toLowerCase() === p.city.toLowerCase()) &&
          Math.abs(c.sqft - p.sqft) / p.sqft <= 0.25 &&
          Math.abs((c.beds || 0) - (p.beds || 0)) <= 1
      )
      .map((c) => bestValue(c) / c.sqft)
      .filter((v) => v > 0);
    if (ppsf.length >= 3) {
      p.comp_arv_cents = Math.round(median(ppsf) * p.sqft);
      p.comp_count = ppsf.length;
      computed++;
    }
  }
  await saveStore(slug, "properties", properties);

  const summary = { properties: properties.length, comp_arvs: computed };
  await auditRE(slug, { actor: "re-comp-analyst", action: "comps_computed", ...summary });
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2] || "day14-realty";
  operate(slug).then((r) =>
    console.log(`comp-analyst ${slug}: comp ARV computed for ${r.comp_arvs}/${r.properties} properties`)
  );
}
