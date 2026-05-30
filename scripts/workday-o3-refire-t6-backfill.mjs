/**
 * workday-o3-refire-t6-backfill.mjs
 *
 * Overnight O3 (Day14, 2026-05-28 23:20 EDT) — refire of T6
 * (`workday-t06-stop-slop-cs-outreach`) after the EOD verifier caught it as
 * a phantom-success run (no work-log entry, no filesystem evidence).
 *
 * Pipes each of the 6 queued CS reply templates in
 * `public/data/cs-templates/*.subjects.json` through the new
 * `lib/cs-template-writer.mjs` chokepoint — which itself wraps the
 * deterministic `stripSlop()` from `lib/skills/stop-slop.mjs`.
 *
 * Behavior:
 *   - Reads each template, strips slop from prose fields, writes the
 *     cleaned JSON back to the same path.
 *   - Idempotent: rerunning on already-clean templates writes the same
 *     bytes (modulo a trailing-newline normalization) and reports zero
 *     removals.
 *   - Logs per-template removal counts in a stable, machine-readable
 *     shape so the work-log entry can quote it verbatim.
 *   - Honors the standing constraints: never delete, never push, no
 *     network, no realty API calls. Hot-flash + kennum CS templates do
 *     not live in this directory, so they are excluded by construction.
 *
 * Usage:
 *   node scripts/workday-o3-refire-t6-backfill.mjs [--dry-run]
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  csTemplatePath,
  materializeCsTemplate,
  readCsTemplate,
} from "./lib/cs-template-writer.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(HERE, "..");
const TEMPLATES_DIR = path.join(STUDIO_ROOT, "public", "data", "cs-templates");

// Hot-flash + kennum tenants are excluded from all new work tonight. The
// directory only contains day14 templates today, but the filter is
// explicit so a future glob match against another tenant cannot leak.
const EXCLUDED_TENANTS = new Set(["hot-flash-co", "kennum-lawn-care"]);

function parseArgs(argv) {
  const out = { dryRun: false };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run" || a === "-n") out.dryRun = true;
  }
  return out;
}

async function listTemplateIds() {
  const entries = await fs.readdir(TEMPLATES_DIR);
  return entries
    .filter((f) => f.endsWith(".subjects.json"))
    .map((f) => f.replace(/\.subjects\.json$/, ""))
    .sort();
}

async function run() {
  const args = parseArgs(process.argv);
  const ids = await listTemplateIds();
  if (ids.length === 0) {
    console.log("o3-t6-backfill: no CS templates found at", TEMPLATES_DIR);
    return { ok: true, totalRemoved: 0, perTemplate: [] };
  }

  const perTemplate = [];
  let grandTotal = 0;

  for (const id of ids) {
    const template = await readCsTemplate(id, { studioRoot: STUDIO_ROOT });
    if (EXCLUDED_TENANTS.has(template.tenant)) {
      perTemplate.push({
        id,
        path: csTemplatePath(id, { studioRoot: STUDIO_ROOT }),
        skipped: true,
        reason: `tenant ${template.tenant} excluded`,
        removedCount: 0,
        removed: [],
        fieldsTouched: [],
      });
      continue;
    }
    const result = await materializeCsTemplate(template, {
      studioRoot: STUDIO_ROOT,
      dryRun: args.dryRun,
    });
    perTemplate.push({
      id,
      path: result.path,
      removedCount: result.removedCount,
      removed: result.removed,
      fieldsTouched: result.fieldsTouched,
    });
    grandTotal += result.removedCount;
  }

  // Stable, line-oriented report for the work-log.
  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: args.dryRun,
        templatesScanned: ids.length,
        templatesCleaned: perTemplate.filter((p) => !p.skipped).length,
        totalRemoved: grandTotal,
        perTemplate,
      },
      null,
      2,
    ),
  );

  return { ok: true, totalRemoved: grandTotal, perTemplate };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => {
    console.error("o3-t6-backfill failed:", e.message);
    process.exit(1);
  });
}

export { run };
