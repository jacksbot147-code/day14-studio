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
import { intakeDir, scaffold, auditRE } from "./brain.mjs";
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
const REFETCH_DAYS = 7; // the roll updates annually; don't re-pull every run

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
    // Quote the literal — this layer rejects a bare numeric compare on CO_NO
    // ("Invalid query parameters"). A quoted literal is accepted whether the
    // field is typed as text or numeric, so it's the safe universal form.
    where: `CO_NO='${coNo}'`,
    outFields: OUT_FIELDS,
    orderByFields: "OBJECTID",
    returnGeometry: "false",
    resultOffset: String(offset),
    resultRecordCount: String(PAGE),
    f: "json",
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
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
    return { error: e.name === "AbortError" ? "timed out (60s)" : e.message };
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

/** Pull up to `cap` parcels for one Florida county code. */
async function fetchCounty(coNo, cap) {
  const rows = [];
  for (let offset = 0; rows.length < cap; offset += PAGE) {
    const page = await fetchPage(coNo, offset);
    if (page.error) return { error: page.error, rows };
    if (!page.features.length) break;
    rows.push(...page.features);
    if (page.features.length < PAGE) break;
  }
  return { rows: rows.slice(0, cap) };
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

function staleEnough(iso) {
  if (!iso) return true;
  return Date.now() - new Date(iso).getTime() > REFETCH_DAYS * 86_400_000;
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

  for (const target of targets) {
    const coNo = flCountyCode(target);
    if (coNo === null) {
      skippedNonFl++;
      continue; // non-FL county — manual CSV upload until a connector exists
    }
    // Already sourced recently? skip (the roll updates annually).
    if (target.auto_source === "fl-statewide" && !staleEnough(target.last_fetched_at)) {
      continue;
    }

    const { rows, error } = await fetchCounty(coNo, cap);
    if (error && !rows?.length) {
      errors.push(`${target.county}: ${error}`);
      continue;
    }
    const mapped = (rows || []).filter((a) => a.PHY_ADDR1).map((a) => toRow(a, target.county));
    if (!mapped.length) {
      errors.push(`${target.county}: no records returned`);
      continue;
    }

    await fs.writeFile(path.join(dir, `${countySlug(target.county)}-county.csv`), toCsv(mapped));
    target.auto_source = "fl-statewide";
    target.last_fetched_at = new Date().toISOString();
    target.fetched_count = mapped.length;
    fetched++;
    totalProps += mapped.length;
  }

  await saveTargets(slug, targets);
  const summary = {
    fl_counties: targets.length - skippedNonFl,
    fetched,
    properties: totalProps,
    skipped_non_fl: skippedNonFl,
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
