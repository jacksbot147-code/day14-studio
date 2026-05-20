/**
 * intake-agent.mjs — ingest county property records.
 *
 * BUILD: maintains the properties store.
 * OPERATE: reads every CSV dropped into businesses/<slug>/intake/, normalizes
 *   each row into the property schema, de-dupes against the store, and files
 *   the processed CSV away. County property-appraiser exports are public
 *   records — this is the ToS-clean intake path (no scraping).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { loadStore, saveStore, scaffold, intakeDir, normalizeProperty, auditRE } from "./brain.mjs";

export const BUILD_SPEC = {
  capability: "intake",
  beyond: "Bulk public-records intake with flexible column mapping. Drop a county export, get normalized properties.",
  ui_next: "/admin/realty/intake — drag-drop a county CSV, see rows land.",
};

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function rowsToObjects(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  return rows.slice(1).filter((r) => r.some((c) => c && c.trim())).map((r) => {
    const o = {};
    headers.forEach((h, i) => { o[h] = (r[i] || "").trim(); });
    return o;
  });
}

export async function operate(slug) {
  await scaffold(slug);
  const dir = intakeDir(slug);
  const processedDir = path.join(dir, "processed");
  await fs.mkdir(processedDir, { recursive: true });

  const properties = await loadStore(slug, "properties");
  const seen = new Set(properties.map((p) => (p.address || p.id).toLowerCase()));
  const files = (await fs.readdir(dir)).filter((f) => f.toLowerCase().endsWith(".csv"));

  let ingested = 0, skipped = 0, filesDone = 0;
  for (const f of files) {
    try {
      const text = await fs.readFile(path.join(dir, f), "utf8");
      for (const raw of rowsToObjects(parseCsv(text))) {
        const p = normalizeProperty(raw);
        const key = (p.address || p.id).toLowerCase();
        if (!p.address) { skipped++; continue; }
        if (seen.has(key)) { skipped++; continue; }
        seen.add(key);
        p.ingested_at = new Date().toISOString();
        properties.push(p);
        ingested++;
      }
      await fs.rename(path.join(dir, f), path.join(processedDir, `${Date.now()}-${f}`));
      filesDone++;
    } catch (e) {
      console.warn(`  ! could not process ${f}: ${e.message}`);
    }
  }

  await saveStore(slug, "properties", properties);
  const summary = { ingested, skipped, files: filesDone, total_properties: properties.length };
  await auditRE(slug, { actor: "re-intake-agent", action: "county_records_ingested", ...summary });
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2];
  if (!slug) { console.error("Usage: intake-agent.mjs <slug>"); process.exit(1); }
  operate(slug).then((r) =>
    console.log(`intake ${slug}: +${r.ingested} properties from ${r.files} file(s) · ${r.total_properties} total`)
  );
}
