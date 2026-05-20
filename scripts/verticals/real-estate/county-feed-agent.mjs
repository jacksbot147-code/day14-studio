/**
 * county-feed-agent.mjs — works the realty county watch list.
 *
 * OPERATE: every scout run, walks ops/targets.json. For each county:
 *   - If REALESTATE_API_KEY is set, does a best-effort pull of on-market
 *     listings (RentCast) for the county and ingests new ones.
 *   - Whether or not the API ran, if the county still has zero properties in
 *     the store it is flagged "needs-csv" and an operator to-do is filed with
 *     exactly where to get that county's official property-appraiser export.
 *     The moment Jack drops the CSV into intake/, the intake agent ingests it
 *     and the county flips to "active".
 *   - Active counties stay on the list and get re-scanned every run, so a
 *     watched county is monitored, not sourced once and forgotten.
 *
 * Honest sourcing: official public records + a licensed listings API only.
 * Never scrapes Zillow/Redfin or county web pages.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { loadStore, saveStore, scaffold, normalizeProperty, auditRE } from "./brain.mjs";
import {
  loadTargets,
  saveTargets,
  sameCounty,
  countyExportHint,
  REALTY_SLUG,
} from "./targets.mjs";
import { addTodo } from "../../_generic/operator-todos.mjs";

export const BUILD_SPEC = {
  capability: "county-feed",
  beyond:
    "Telegram a county or a whole metro — the scout sources, scores, and monitors it. No manual CSV hunting unless a county has no feed.",
  ui_next: "/admin/realty county watch list with per-county status + stats.",
};

const ENV_FILE = path.join(homedir(), "Documents/studio/.env.local");

async function apiKey() {
  if (!existsSync(ENV_FILE)) return "";
  try {
    const t = await fs.readFile(ENV_FILE, "utf8");
    const m = t.match(/^\s*REALESTATE_API_KEY\s*=\s*(.+)\s*$/m);
    return m && m[1] ? m[1].replace(/^['"]|['"]$/g, "").trim() : "";
  } catch {
    return "";
  }
}

/** Best-effort on-market listings pull for one city (RentCast). */
async function rentcastListings(city, state, key) {
  if (!city) return [];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const params = new URLSearchParams({ city, status: "Active", limit: "100" });
    if (state) params.set("state", state);
    const res = await fetch(`https://api.rentcast.io/v1/listings/sale?${params}`, {
      headers: { "X-Api-Key": key, Accept: "application/json" },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    clearTimeout(timer);
    return [];
  }
}

/** Turn a RentCast listing into a property record. */
function listingToProperty(L, target, now) {
  const raw = {
    id: L.id ? `rc-${L.id}` : undefined,
    address: L.formattedAddress || L.addressLine1 || "",
    city: L.city || "",
    county: L.county || target.county,
    zip: L.zipCode || "",
    beds: L.bedrooms,
    baths: L.bathrooms,
    sqft: L.squareFootage,
    lot_sqft: L.lotSize,
    year_built: L.yearBuilt,
    market_value: L.price,
  };
  const p = normalizeProperty(raw);
  p.county = p.county || target.county;
  p.source = "rentcast-listing";
  p.listed = true;
  p.ingested_at = now;
  return p;
}

export async function operate(slug = REALTY_SLUG) {
  await scaffold(slug);
  const targets = await loadTargets(slug);
  if (!targets.length) {
    await auditRE(slug, { actor: "re-county-feed-agent", action: "county_feed_run", targets: 0 });
    return { targets: 0, active: 0, needs_csv: 0, api_sourced: 0 };
  }

  const key = await apiKey();
  const properties = await loadStore(slug, "properties");
  const evals = await loadStore(slug, "evaluations");
  const seen = new Set(properties.map((p) => (p.address || p.id || "").toLowerCase()));
  const now = new Date().toISOString();

  let apiSourced = 0;
  let active = 0;
  let needsCsv = 0;

  for (const target of targets) {
    if (target.monitor === false) continue;

    // ── API path — best-effort on-market listings ──────────────────────
    if (key) {
      const cities = target.cities && target.cities.length ? target.cities : [target.county];
      for (const city of cities.slice(0, 3)) {
        const listings = await rentcastListings(city, target.state, key);
        for (const L of listings) {
          const p = listingToProperty(L, target, now);
          const k = (p.address || p.id || "").toLowerCase();
          if (!p.address || seen.has(k)) continue;
          seen.add(k);
          properties.push(p);
          apiSourced++;
        }
      }
    }

    // ── Status — does this county have any properties yet? ─────────────
    const countyProps = properties.filter((p) => sameCounty(p.county, target.county));
    const idSet = new Set(countyProps.map((p) => p.id));
    target.properties_sourced = countyProps.length;
    target.a_tier = evals.filter(
      (e) => idSet.has(e.property_id) && String(e.tier || "").startsWith("A")
    ).length;
    target.last_scanned_at = now;

    if (countyProps.length > 0) {
      target.status = "active";
      active++;
    } else {
      target.status = "needs-csv";
      needsCsv++;
      await addTodo({
        tenant: REALTY_SLUG,
        title: `County records needed: ${target.label}`,
        detail: countyExportHint(target.county, target.state),
        category: "realty",
        priority: "medium",
        source: "county-feed-agent",
      });
    }
  }

  if (apiSourced > 0) await saveStore(slug, "properties", properties);
  await saveTargets(slug, targets);

  const summary = { targets: targets.length, active, needs_csv: needsCsv, api_sourced: apiSourced };
  await auditRE(slug, { actor: "re-county-feed-agent", action: "county_feed_run", ...summary });
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2] || REALTY_SLUG;
  operate(slug).then((r) =>
    console.log(
      `county-feed ${slug}: ${r.targets} target(s) · ${r.active} active · ${r.needs_csv} awaiting CSV · +${r.api_sourced} via API`
    )
  );
}
