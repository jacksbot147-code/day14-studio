#!/usr/bin/env node
/**
 * freshness-monitor.mjs — re-freshness-monitor
 *
 * Tracks how the realty pipeline is growing. Each scout run it snapshots the
 * property count, enrichment coverage, deal tiers, and county count, appends
 * the snapshot to a rolling history, and computes growth — added this run and
 * added over the last 7 days.
 *
 * Writes ops/freshness.json. The dashboard reads it to show, at a glance, that
 * the data really is expanding — answering "has anything updated since we made
 * it?" with a number instead of a guess.
 *
 * OPERATE: snapshot the pipeline, compute growth, persist the history.
 */

import { loadStore, saveStore, auditRE } from "./brain.mjs";
import { REALTY_SLUG } from "./targets.mjs";

export const BUILD_SPEC = {
  capability: "freshness-monitor",
  beyond:
    "Every run records how much the pipeline grew — the dashboard can prove the data is expanding.",
  ui_next: "Freshness panel on /admin/realty: added this run, added this week, % enriched.",
};

const HISTORY_CAP = 90; // ~3 months of daily snapshots

/** The most recent snapshot at or before `daysAgo` days back, or null. */
function snapshotAround(history, daysAgo) {
  const mark = Date.now() - daysAgo * 86_400_000;
  let best = null;
  for (const h of history) {
    const t = new Date(h.ts).getTime();
    if (!Number.isNaN(t) && t <= mark) best = h;
  }
  return best;
}

export async function operate(slug = REALTY_SLUG) {
  const properties = await loadStore(slug, "properties", []);
  const evaluations = await loadStore(slug, "evaluations", []);
  const targets = await loadStore(slug, "targets", []);

  const total = properties.length;
  const enriched = properties.filter((p) => p && p.enriched).length;
  const aTier = evaluations.filter((e) => String(e.tier || "").startsWith("A")).length;
  const activeCounties = targets.filter((t) => t.status === "active").length;
  const now = new Date().toISOString();

  const prior = await loadStore(slug, "freshness", null);
  const history = prior && Array.isArray(prior.history) ? prior.history.slice() : [];
  const last = history.length ? history[history.length - 1] : null;

  history.push({
    ts: now,
    total_properties: total,
    enriched,
    a_tier: aTier,
    counties: targets.length,
    active_counties: activeCounties,
  });
  while (history.length > HISTORY_CAP) history.shift();

  const addedLastRun = last ? total - last.total_properties : 0;
  const ref7 = snapshotAround(history.slice(0, -1), 7);
  const added7d = ref7 ? total - ref7.total_properties : addedLastRun;

  const freshness = {
    updated_at: now,
    first_tracked_at: prior && prior.first_tracked_at ? prior.first_tracked_at : now,
    total_properties: total,
    enriched_count: enriched,
    enriched_pct: total ? +((enriched / total) * 100).toFixed(1) : 0,
    a_tier: aTier,
    counties: targets.length,
    active_counties: activeCounties,
    added_last_run: addedLastRun,
    added_7d: added7d,
    runs_tracked: history.length,
    history,
  };

  await saveStore(slug, "freshness", freshness);
  await auditRE(slug, {
    actor: "re-freshness-monitor",
    action: "freshness_tracked",
    total_properties: total,
    added_last_run: addedLastRun,
    added_7d: added7d,
    enriched_pct: freshness.enriched_pct,
  });
  return freshness;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2] || REALTY_SLUG;
  operate(slug).then((r) =>
    console.log(
      `freshness-monitor ${slug}: ${r.total_properties} properties ` +
        `(+${r.added_last_run} this run, +${r.added_7d} over 7d) · ` +
        `${r.enriched_pct}% enriched · ${r.active_counties} active counties`
    )
  );
}
