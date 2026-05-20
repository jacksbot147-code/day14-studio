/**
 * enrichment-agent.mjs — enrich properties with valuation data.
 *
 * BUILD: extends each property record with AVM value + rent estimate.
 * OPERATE: for properties not yet enriched, calls a licensed property API
 *   (RentCast by default) for an AVM value and long-term rent estimate.
 *
 * Degrades gracefully: with no REALESTATE_API_KEY set, it leaves properties
 * unenriched and flags it — the evaluation layer still runs on county data
 * alone (tax status, owner, equity, distress signals all work without it).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { loadStore, saveStore, scaffold, auditRE } from "./brain.mjs";

export const BUILD_SPEC = {
  capability: "enrichment",
  beyond: "Licensed-API valuation (RentCast/ATTOM/Estated) — stable and ToS-clean, never a Zillow scraper.",
  ui_next: "Per-property card shows AVM value, rent estimate, and confidence range.",
};

const ENV_FILE = path.join(homedir(), "Documents/studio/.env.local");
const MAX_PER_RUN = 25; // protect API quota

async function apiKey() {
  if (!existsSync(ENV_FILE)) return "";
  try {
    const t = await fs.readFile(ENV_FILE, "utf8");
    const m = t.match(/^\s*REALESTATE_API_KEY\s*=\s*(.+)\s*$/m);
    return m && m[1] ? m[1].replace(/^['"]|['"]$/g, "").trim() : "";
  } catch { return ""; }
}

async function rentcast(endpoint, address, key) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`https://api.rentcast.io/v1/${endpoint}?address=${encodeURIComponent(address)}`, {
      headers: { "X-Api-Key": key, Accept: "application/json" },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export async function operate(slug) {
  await scaffold(slug);
  const properties = await loadStore(slug, "properties");
  const key = await apiKey();

  const pending = properties.filter((p) => !p.enriched && p.address);
  if (!key) {
    await auditRE(slug, { actor: "re-enrichment-agent", action: "enrichment_skipped_no_key", pending: pending.length });
    return { enriched: 0, pending: pending.length, has_key: false };
  }

  let enriched = 0;
  for (const p of pending.slice(0, MAX_PER_RUN)) {
    const val = await rentcast("avm/value", p.address, key);
    const rent = await rentcast("avm/rent/long-term", p.address, key);
    if (val && typeof val.price === "number") p.avm_value_cents = Math.round(val.price * 100);
    if (rent && typeof rent.rent === "number") p.rent_estimate_cents = Math.round(rent.rent * 100);
    if (p.avm_value_cents || p.rent_estimate_cents) {
      p.enriched = true;
      p.enriched_at = new Date().toISOString();
      enriched++;
    }
  }

  await saveStore(slug, "properties", properties);
  const summary = { enriched, pending: pending.length - enriched, has_key: true };
  await auditRE(slug, { actor: "re-enrichment-agent", action: "properties_enriched", ...summary });
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2];
  if (!slug) { console.error("Usage: enrichment-agent.mjs <slug>"); process.exit(1); }
  operate(slug).then((r) =>
    console.log(`enrichment ${slug}: ${r.has_key ? `+${r.enriched} enriched, ${r.pending} pending` : "no REALESTATE_API_KEY — skipped (county data still scores)"}`)
  );
}
