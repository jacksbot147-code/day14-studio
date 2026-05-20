/**
 * scheduling-agent.mjs — smart route board + weather-aware scheduling.
 *
 * BUILD: maintains the schedule store (route days, zones, ordering).
 * OPERATE: every run, takes scheduled jobs, packs them into tight
 *   geographic routes by service day, and scores each day on density
 *   (billable time vs. drive time). Jobs flagged rain-hit roll forward.
 */

import { loadStore, saveStore, scaffoldOps, optimizeRoute, routeDensityScore, auditLC, seasonalActions } from "./brain.mjs";

export const BUILD_SPEC = {
  capability: "scheduling",
  beyond_jobber:
    "Routes are scored on density (billable vs. drive time), not just pinned on a map. " +
    "Rain-hit jobs roll to the next open slot automatically — no manual reshuffle.",
  ui_next: "/admin/tenants/<slug>/routes — week view, drag-to-reorder, live density score.",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export async function operate(slug) {
  await scaffoldOps(slug);
  const jobs = await loadStore(slug, "jobs");
  const active = jobs.filter((j) => j.status === "scheduled" || j.status === "in-progress");

  // Assign any unscheduled job to the lightest day, balancing the route board.
  const dayLoad = Object.fromEntries(DAYS.map((d) => [d, 0]));
  for (const j of active) if (j.day && dayLoad[j.day] !== undefined) dayLoad[j.day]++;
  for (const j of active) {
    if (!j.day || dayLoad[j.day] === undefined) {
      const lightest = DAYS.slice().sort((a, b) => dayLoad[a] - dayLoad[b])[0];
      j.day = lightest;
      dayLoad[lightest]++;
    }
    if (!j.zone) j.zone = "unzoned";
  }

  const routes = optimizeRoute(active);
  const board = {};
  let rolled = 0;
  for (const day of DAYS) {
    const dayJobs = routes[day] || [];
    // Weather-aware: jobs marked rain_hit roll to the next day.
    for (const j of dayJobs) {
      if (j.rain_hit) {
        const idx = DAYS.indexOf(day);
        j.day = DAYS[Math.min(idx + 1, DAYS.length - 1)];
        j.rain_hit = false;
        rolled++;
      }
    }
    board[day] = {
      stops: dayJobs.length,
      density_score: routeDensityScore(dayJobs),
      jobs: dayJobs.map((j) => ({ id: j.id, customer: j.customer, zone: j.zone, service: j.service })),
    };
  }

  await saveStore(slug, "jobs", jobs);
  await saveStore(slug, "schedule", { generated_at: new Date().toISOString(), season: seasonalActions().season, board });

  const summary = {
    scheduled: active.length,
    rolled_for_weather: rolled,
    avg_density: Math.round(DAYS.reduce((s, d) => s + board[d].density_score, 0) / DAYS.length),
  };
  await auditLC(slug, { actor: "scheduling-agent", action: "routes_optimized", ...summary });
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2];
  if (!slug) { console.error("Usage: scheduling-agent.mjs <tenant-slug>"); process.exit(1); }
  operate(slug).then((r) =>
    console.log(`scheduling ${slug}: ${r.scheduled} jobs routed · avg density ${r.avg_density}/100 · ${r.rolled_for_weather} rolled for weather`)
  );
}
