#!/usr/bin/env node
/**
 * county-data-fetcher.mjs — auto-sources county property data.
 *
 * The legitimate, durable alternative to scraping county web pages: for every
 * Florida county on the watch list, this pulls the official property roll
 * straight from the Florida Department of Revenue's statewide cadastral
 * service — an ArcGIS REST API covering all 67 counties (public records the
 * state publishes for download). It maps the NAL (Name-Address-Legal) fields
 * to the realty schema and writes a CSV into intake/ for the scout to score.
 *
 * No scraping of county HTML, no per-county brittleness — one standard
 * government API for the whole state. Counties outside Florida fall back to
 * the manual CSV upload until a connector for that state's data is added.
 *
 * OPERATE: for each FL watch target without recent data, fetch + write CSV.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { intakeDir, opsDir, scaffold, auditRE } from "./brain.mjs";
import { loadTargets, saveTargets, REALTY_SLUG } from "./targets.mjs";

export const BUILD_SPEC = {
  capability: "county-data",
  beyond:
    "Add a Florida county and its property roll auto-loads from the state's official API — no manual download, no scraping.",
  ui_next: "Per-county 'last sourced' timestamp on the realty watch list.",
};

// Florida statewide cadastral — FDOR property roll for all 67 counties.
const FL_CADASTRAL_QUERY =
  "https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0/query";
const PAGE = 1000; // rows per request — smaller pages fetch fast + reliably
const DEFAULT_CAP = 6000; // parcels per county per run — keeps scoring fast
const REFETCH_DAYS = 30; // a fully-sourced county refreshes ~monthly
// How many counties to actually source per run. The loop starts from a
// rotating pointer so, over successive runs, every watched county gets its
// turn even when the watch list is longer than one run's time budget.
const COUNTIES_PER_RUN = 4;
// Circuit-breaker: if this many counties fail back-to-back the FDOR service
// itself is almost certainly down — stop the run instead of burning a 30s
// timeout on every remaining county.
const CB_MAX_CONSEC_FAILURES = 3;

// Florida Dept. of Revenue county numbers (CO_NO field), the stable 11-77
// standard. Keyed by normalized county name.
const FL_DOR_CODES = {
  alachua: 11, baker: 12, bay: 13, bradford: 14, brevard: 15, broward: 16,
  calhoun: 17, charlotte: 18, citrus: 19, clay: 20, collier: 21, columbia: 22,
  miamidade: 23, dade: 23, desoto: 24, dixie: 25, duval: 26, escambia: 27,
  flagler: 28, franklin: 29, gadsden: 30, gilchrist: 31, glades: 32, gulf: 33,
  hamilton: 34, hardee: 35, hendry: 36, hernando: 37, highlands: 38,
  hillsborough: 39, holmes: 40, indianriver: 41, jackson: 42, jefferson: 43,
  lafayette: 44, lake: 45, lee: 46, leon: 47, levy: 48, liberty: 49,
  madison: 50, manatee: 51, marion: 52, martin: 53, monroe: 54, nassau: 55,
  okaloosa: 56, okeechobee: 57, orange: 58, osceola: 59, palmbeach: 60,
  pasco: 61, pinellas: 62, polk: 63, putnam: 64, stjohns: 65, stlucie: 66,
  santarosa: 67, sarasota: 68, seminole: 69, sumter: 70, suwannee: 71,
  taylor: 72, union: 73, volusia: 74, wakulla: 75, walton: 76, washington: 77,
};

const OUT_FIELDS = [
  "PARCEL_ID", "PHY_ADDR1", "PHY_ADDR2", "PHY_CITY", "PHY_ZIPCD",
  "OWN_NAME", "OWN_ADDR1", "OWN_CITY", "OWN_STATE_", "JV", "AV_SD",
  "LND_SQFOOT", "TOT_LVG_AR", "ACT_YR_BLT", "NO_BULDNG",
  "SALE_PRC1", "SALE_YR1", "SALE_MO1", "DOR_UC",
].join(",");

function norm(s) {
  return String(s || "").toLowerCase().replace(/county|counties/g, "").replace(/[^a-z]/g, "");
}

/** The FDOR county code for a target, or null if not a Florida county. */
export function flCountyCode(target) {
  if (target.state && target.state !== "FL") return null;
  return FL_DOR_CODES[norm(target.county)] ?? null;
}

/** One page of the cadastral query (single attempt). Orders by OBJECTID —
 *  required for resultOffset paging, and indexed so it costs nothing (unlike
 *  ordering by JV, which made earlier runs time out). */
async function fetchPageOnce(coNo, offset) {
  const params = new URLSearchParams({
    // CO_NO is a NUMERIC (integer) field on the FDOR statewide cadastral
    // layer. Quoting the literal (CO_NO='15') makes this layer reject the
    // request with "Invalid query parameters" — a numeric field must be
    // compared against a bare numeric literal.
    where: `CO_NO=${Number(coNo)}`,
    outFields: OUT_FIELDS,
    // Order by the OID field so resultOffset paging is stable + indexed.
    orderByFields: "OBJECTID",
    returnGeometry: "false",
    resultOffset: String(offset),
    resultRecordCount: String(PAGE),
    f: "json",
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(`${FL_CADASTRAL_QUERY}?${params}`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const data = await res.json();
    if (data.error) {
      const det = Array.isArray(data.error.details) && data.error.details.length
        ? ` — ${data.error.details.join("; ")}`
        : "";
      return { error: `${data.error.message || "query error"}${det}` };
    }
    return { features: (data.features || []).map((f) => f.attributes || {}) };
  } catch (e) {
    clearTimeout(timer);
    return { error: e.name === "AbortError" ? "timed out (30s)" : e.message };
  }
}

/** One page, with a single retry on failure. */
async function fetchPage(coNo, offset) {
  let page = await fetchPageOnce(coNo, offset);
  if (page.error) {
    await new Promise((r) => setTimeout(r, 2000));
    page = await fetchPageOnce(coNo, offset);
  }
  return page;
}

/**
 * Pull up to `cap` parcels for one Florida county, starting at `startOffset`.
 * Returns the rows, whether the county roll is exhausted, any error, and the
 * offset to resume from next run — so a large county is sourced a slice at a
 * time across runs instead of stopping at the first pull.
 */
async function fetchCounty(coNo, startOffset, cap) {
  const rows = [];
  let exhausted = false;
  let error = null;
  for (let offset = startOffset; rows.length < cap; offset += PAGE) {
    const page = await fetchPage(coNo, offset);
    if (page.error) { error = page.error; break; }
    if (!page.features.length) { exhausted = true; break; }
    rows.push(...page.features);
    if (page.features.length < PAGE) { exhausted = true; break; }
  }
  const capped = rows.slice(0, cap);
  return { rows: capped, exhausted, error, nextOffset: startOffset + capped.length };
}

function csvCell(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Map a cadastral record to the realty intake schema. */
export function toRow(a, county) {
  const addr = [a.PHY_ADDR1, a.PHY_ADDR2].filter(Boolean).join(" ").trim();
  const ownerMail = [a.OWN_ADDR1, a.OWN_CITY, a.OWN_STATE_].filter(Boolean).join(" ").trim();
  const saleYr = Number(a.SALE_YR1) || 0;
  const saleMo = String(a.SALE_MO1 || "").padStart(2, "0");
  const lastSaleDate = saleYr > 1900 ? `${saleYr}-${saleMo === "00" ? "01" : saleMo}-01` : "";
  const zip = a.PHY_ZIPCD ? String(a.PHY_ZIPCD).replace(/\..*$/, "") : "";
  return {
    id: a.PARCEL_ID || "",
    address: addr,
    city: a.PHY_CITY || "",
    county,
    zip,
    owner_name: a.OWN_NAME || "",
    owner_mailing_address: ownerMail,
    sqft: Number(a.TOT_LVG_AR) || "",
    lot_sqft: Number(a.LND_SQFOOT) || "",
    year_built: Number(a.ACT_YR_BLT) || "",
    market_value: Number(a.JV) || "",
    assessed_value: Number(a.AV_SD) || "",
    last_sale_price: Number(a.SALE_PRC1) || "",
    last_sale_date: lastSaleDate,
  };
}

const COLUMNS = [
  "id", "address", "city", "county", "zip", "owner_name",
  "owner_mailing_address", "sqft", "lot_sqft", "year_built",
  "market_value", "assessed_value", "last_sale_price", "last_sale_date",
];

/** Build CSV text from mapped rows. */
export function toCsv(rows) {
  const lines = [COLUMNS.join(",")];
  for (const r of rows) lines.push(COLUMNS.map((c) => csvCell(r[c])).join(","));
  return lines.join("\n") + "\n";
}

function countySlug(county) {
  return county.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "county";
}

function staleEnough(iso, days) {
  if (!iso) return true;
  return Date.now() - new Date(iso).getTime() > days * 86_400_000;
}

// ── County rotation pointer ─────────────────────────────────────────────
// A tiny JSON file holds the index of the county to start the next run from,
// so a watch list longer than one run's budget still gets every county
// sourced over successive runs (Sarasota & Manatee no longer starve).
function rotationFile(slug) {
  return path.join(opsDir(slug), "county-fetch-rotation.json");
}

async function loadRotationPointer(slug) {
  try {
    const data = JSON.parse(await fs.readFile(rotationFile(slug), "utf8"));
    return Number.isInteger(data.start) && data.start >= 0 ? data.start : 0;
  } catch {
    return 0;
  }
}

async function saveRotationPointer(slug, start) {
  try {
    await fs.mkdir(opsDir(slug), { recursive: true });
    await fs.writeFile(
      rotationFile(slug),
      JSON.stringify({ start, updated_at: new Date().toISOString() }, null, 2)
    );
  } catch {
    /* best-effort — a missing pointer just resets rotation to 0 */
  }
}

export async function operate(slug = REALTY_SLUG, opts = {}) {
  await scaffold(slug);
  const cap = opts.cap || DEFAULT_CAP;
  const targets = await loadTargets(slug);
  if (!targets.length) {
    return { fl_counties: 0, fetched: 0, properties: 0, skipped_non_fl: 0 };
  }

  const dir = intakeDir(slug);
  await fs.mkdir(dir, { recursive: true });

  let fetched = 0;
  let totalProps = 0;
  let skippedNonFl = 0;
  const errors = [];

  // FL targets only — rotation runs over the counties this fetcher can source.
  const flTargets = targets.filter((t) => flCountyCode(t) !== null);
  skippedNonFl = targets.length - flTargets.length;

  // Start from the rotation pointer so a watch list longer than one run's
  // budget still sources every county over successive runs.
  const rotStart = flTargets.length ? (await loadRotationPointer(slug)) % flTargets.length : 0;
  const ordered = flTargets.length
    ? [...flTargets.slice(rotStart), ...flTargets.slice(0, rotStart)]
    : [];

  let consecFailures = 0;
  let circuitTripped = false;
  let worked = 0; // counties this run actually attempted a fetch on
  let advancedBy = 0; // how far to push the rotation pointer

  for (const target of ordered) {
    // Stop once this run has done its share of counties — the rest get their
    // turn next run thanks to the rotation pointer.
    if (worked >= COUNTIES_PER_RUN) break;

    const coNo = flCountyCode(target);
    // A county that has been fully sourced refreshes only every REFETCH_DAYS.
    // A county still being sourced pulls its next slice on every run, so large
    // counties keep growing instead of stalling at the first page.
    const complete = target.fetch_complete === true;
    if (complete && !staleEnough(target.last_completed_at, REFETCH_DAYS)) {
      // Up to date — costs no time, so it doesn't consume the run budget but
      // the pointer still moves past it.
      advancedBy++;
      continue;
    }

    worked++;
    advancedBy++;

    // Complete + stale -> full refresh from the top; otherwise resume.
    const startOffset = complete ? 0 : (target.fetch_offset || 0);
    const { rows, exhausted, error, nextOffset } = await fetchCounty(coNo, startOffset, cap);
    if (error && !rows.length) {
      errors.push(`${target.county}: ${error} (offset ${startOffset})`);
      consecFailures++;
      // Circuit-breaker: a run of failures means the FDOR service is down —
      // stop rather than burn a 30s timeout on every remaining county.
      if (consecFailures >= CB_MAX_CONSEC_FAILURES) {
        circuitTripped = true;
        errors.push(
          `circuit-breaker: ${consecFailures} counties failed in a row — FDOR service likely down, aborting run`
        );
        break;
      }
      continue;
    }
    consecFailures = 0; // any success (even partial) resets the breaker

    const mapped = rows.filter((a) => a.PHY_ADDR1).map((a) => toRow(a, target.county));
    const nowIso = new Date().toISOString();
    if (!mapped.length) {
      if (exhausted) {
        // Reached the end of the county roll — mark it complete.
        target.fetch_complete = true;
        target.last_completed_at = nowIso;
        target.fetch_offset = 0;
      } else {
        errors.push(`${target.county}: no records returned (offset ${startOffset})`);
      }
      continue;
    }

    await fs.writeFile(path.join(dir, `${countySlug(target.county)}-county.csv`), toCsv(mapped));
    target.auto_source = "fl-statewide";
    target.last_fetched_at = nowIso;
    target.fetched_count = mapped.length;
    target.total_fetched = (complete ? 0 : (target.total_fetched || 0)) + mapped.length;
    target.fetch_offset = exhausted ? 0 : nextOffset;
    target.fetch_complete = exhausted;
    if (exhausted) target.last_completed_at = nowIso;
    if (error) {
      errors.push(`${target.county}: ${error} — kept ${mapped.length}, resumes at offset ${nextOffset}`);
    }
    fetched++;
    totalProps += mapped.length;
  }

  await saveTargets(slug, targets);
  // Advance the rotation pointer past the counties handled this run so the
  // next run picks up where this one left off. If the breaker tripped, leave
  // the pointer where it is so the same counties retry next run.
  if (flTargets.length && !circuitTripped) {
    await saveRotationPointer(slug, (rotStart + advancedBy) % flTargets.length);
  }

  const summary = {
    fl_counties: flTargets.length,
    fetched,
    properties: totalProps,
    skipped_non_fl: skippedNonFl,
    circuit_tripped: circuitTripped,
    errors,
  };
  await auditRE(slug, { actor: "re-county-data-fetcher", action: "county_data_fetched", ...summary });
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2] || REALTY_SLUG;
  operate(slug).then((r) =>
    console.log(
      `county-data-fetcher ${slug}: fetched ${r.fetched} FL county feed(s) · ${r.properties} properties` +
        (r.skipped_non_fl ? ` · ${r.skipped_non_fl} non-FL skipped` : "") +
        (r.errors.length ? `\n  errors: ${r.errors.join("; ")}` : "")
    )
  );
}
