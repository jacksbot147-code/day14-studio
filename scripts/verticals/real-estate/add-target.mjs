#!/usr/bin/env node
/**
 * add-target.mjs — register a county/region on the realty watch list + scout.
 *
 * The direct, no-Telegram path behind the realty dashboard's "Send to scout"
 * button (via /api/realty/add-county) when the Day14 admin runs locally on
 * the Mac.
 *
 * Parses a free-text county or metro, registers each county as a watch
 * target, mirrors the result into the dashboard ops snapshot so the watch
 * list updates immediately, and launches the scout in the background.
 *
 * Usage: node add-target.mjs "<county or metro>"
 * Prints ONE JSON line: { ok, type, region?, added:[], existing:[], message }
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseTargetRequest } from "./regions.mjs";
import { addTarget, loadTargets, REALTY_SLUG } from "./targets.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "../../..");

function out(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

/**
 * Mirror the fresh targets into public/data/ops/<slug>.json so the local
 * dashboard's watch list reflects the add immediately — before the next
 * scheduled empire-state sync reconciles it.
 */
async function patchSnapshot(slug) {
  try {
    const snapPath = path.join(REPO_ROOT, "public/data/ops", `${slug}.json`);
    let snap = {};
    if (existsSync(snapPath)) {
      try {
        snap = JSON.parse(await fs.readFile(snapPath, "utf8"));
      } catch {
        snap = {};
      }
    }
    snap.slug = slug;
    snap.targets = await loadTargets(slug);
    snap.generated_at = new Date().toISOString();
    await fs.mkdir(path.dirname(snapPath), { recursive: true });
    await fs.writeFile(snapPath, JSON.stringify(snap, null, 2));
  } catch {
    /* best-effort — the next sync reconciles the snapshot */
  }
}

async function main() {
  const input = process.argv.slice(2).join(" ").trim();
  if (!input) {
    out({ ok: false, error: "no county provided" });
    process.exit(1);
  }

  const parsed = parseTargetRequest(input);
  if (parsed.type === "empty") {
    out({ ok: false, error: "no county found", message: 'Couldn\'t read a county out of that — try e.g. "Lee County, FL".' });
    return;
  }
  if (parsed.type === "unknown-region") {
    out({
      ok: false,
      error: "unknown region",
      message: `"${parsed.region}" isn't a metro I have mapped — name the counties, e.g. "Sangamon County, IL".`,
    });
    return;
  }

  const added = [];
  const existing = [];
  for (const c of parsed.counties) {
    try {
      const { target, created } = await addTarget(REALTY_SLUG, {
        county: c.county,
        state: c.state,
        source: "dashboard",
      });
      (created ? added : existing).push(target.label);
    } catch {
      /* skip a malformed county */
    }
  }
  if (!added.length && !existing.length) {
    out({ ok: false, error: "nothing registered", message: "Couldn't register that county." });
    return;
  }

  await patchSnapshot(REALTY_SLUG);

  // Launch the scout in the background so sourcing starts now.
  try {
    const child = spawn(process.execPath, [path.join(HERE, "scout-agent.mjs"), REALTY_SLUG], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    /* the scheduled scout run will pick it up */
  }

  const message =
    parsed.type === "region"
      ? `Scouting the ${parsed.region} region — ${added.length + existing.length} counties on the watch list. The scout is sourcing now.`
      : added.length
        ? `${added.join(", ")} added — the scout is sourcing it now.`
        : `${existing.join(", ")} is already on your watch list — re-running the scout.`;

  out({ ok: true, type: parsed.type, region: parsed.region || null, added, existing, message });
}

main().catch((e) => {
  out({ ok: false, error: e.message || String(e) });
  process.exit(1);
});
