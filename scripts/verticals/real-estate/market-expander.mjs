#!/usr/bin/env node
/**
 * market-expander.mjs — re-market-expander
 *
 * Grows the realty county watch list on its own. Each scout run, if the watch
 * list is under the cap and enough time has passed, it adds the next county
 * from a Southwest-Florida-outward priority list. Every county on that list
 * has an FDOR code, so a county added here auto-sources from the statewide
 * cadastral feed on the same run — coverage expands with no manual county
 * adding.
 *
 * This is the engine behind "the data should always be expanding": even when
 * every existing county is fully sourced, the watch list keeps reaching into
 * new counties until it hits the cap.
 *
 * OPERATE: add the next priority county (paced ~once a day) until the cap.
 */

import { loadTargets, addTarget, sameCounty, REALTY_SLUG } from "./targets.mjs";
import { auditRE } from "./brain.mjs";

export const BUILD_SPEC = {
  capability: "market-expander",
  beyond:
    "The watch list grows itself — coverage expands on a cadence with no manual county adding.",
  ui_next: "A 'coverage growing' line on the realty dashboard freshness panel.",
};

const MAX_COUNTIES = 12; // ceiling — keeps each scout run fast
const GATE_HOURS = 20; // pace expansion to ~once a day, whatever the run cadence
const BOOTSTRAP_BELOW = 5; // below this many counties, add a small batch at once
const BOOTSTRAP_BATCH = 3;

// Florida counties in expansion priority — Southwest Florida first, then
// outward along the Gulf coast and into the larger metros. Every county here
// has an FDOR county code, so each one auto-sources from the statewide feed.
export const FL_PRIORITY = [
  "Charlotte", "Sarasota", "Manatee", "Hendry", "Glades", "DeSoto",
  "Highlands", "Hardee", "Hillsborough", "Pinellas", "Polk", "Pasco",
  "Okeechobee", "Martin", "St. Lucie", "Palm Beach", "Hernando", "Sumter",
  "Marion", "Orange",
];

function hoursSince(iso) {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Infinity : (Date.now() - t) / 3_600_000;
}

export async function operate(slug = REALTY_SLUG) {
  const targets = await loadTargets(slug);
  const summary = { watch_list: targets.length, added: 0, counties: [], reason: "" };

  if (targets.length >= MAX_COUNTIES) {
    summary.reason = `at cap (${MAX_COUNTIES} counties)`;
    await auditRE(slug, { actor: "re-market-expander", action: "market_expanded", ...summary });
    return summary;
  }

  // Pace expansion: only add when the most recent auto-added county is older
  // than GATE_HOURS. Counties Jack adds himself never block expansion.
  const autoAdds = targets.filter((t) => t.source === "market-expander");
  const lastAdd = autoAdds.map((t) => t.added_at).filter(Boolean).sort().pop();
  if (autoAdds.length && hoursSince(lastAdd) < GATE_HOURS) {
    summary.reason = "paced — expanded within the last day";
    await auditRE(slug, { actor: "re-market-expander", action: "market_expanded", ...summary });
    return summary;
  }

  const room = MAX_COUNTIES - targets.length;
  const batch = Math.min(room, targets.length < BOOTSTRAP_BELOW ? BOOTSTRAP_BATCH : 1);

  for (const county of FL_PRIORITY) {
    if (summary.added >= batch) break;
    if (targets.some((t) => sameCounty(t.county, county))) continue; // already watched
    const { created } = await addTarget(slug, {
      county,
      state: "FL",
      source: "market-expander",
    });
    if (created) {
      summary.added++;
      summary.counties.push(county);
    }
  }

  summary.watch_list = targets.length + summary.added;
  summary.reason = summary.added
    ? `added ${summary.counties.join(", ")}`
    : "no new priority counties available";
  await auditRE(slug, { actor: "re-market-expander", action: "market_expanded", ...summary });
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2] || REALTY_SLUG;
  operate(slug).then((r) =>
    console.log(
      `market-expander ${slug}: +${r.added} county(ies)` +
        (r.counties.length ? ` — ${r.counties.join(", ")}` : "") +
        ` · watch list ${r.watch_list}/${MAX_COUNTIES} · ${r.reason}`
    )
  );
}
