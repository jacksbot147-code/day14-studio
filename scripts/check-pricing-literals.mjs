#!/usr/bin/env node
/**
 * check-pricing-literals.mjs — pricing-integrity regression guard.
 *
 * Enforces the binding rule in src/lib/pricing.ts: no page may hard-code a
 * price; every tier number is imported from pricing.ts. This guard exists
 * because a prior relaunch shipped ~15 files quoting a RETIRED price model
 * (Studio $24,000, Site $2,500+$99, Platform $10,000+$399) while the homepage
 * said something else — see WEBSITE-STATUS-AND-AUDIT-2026-06-19.
 *
 * It fails (exit 1) on two signals:
 *   1. Known-RETIRED price strings reappearing anywhere in src/.
 *   2. Any "$X + $Y/mo" tier-shaped literal outside pricing.ts (the tell of a
 *      hard-coded service tier that should be sourced from SERVICE_TIERS).
 *
 * Legitimately-kept prices (competitor plans, the $200/hr change rate, the
 * $25k milestone threshold, standalone Day14 Voice/Audit/Migration services,
 * brand microsites) are NOT tier-shaped and are not flagged.
 *
 * Run standalone:  npm run check:prices
 * NOT wired into `build` on purpose — a guard must never break a deploy.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SCAN_DIRS = ["src/app", "src/components"];
const ALLOW_FILE = "src/lib/pricing.ts";

// 1. Retired strings that must never resurface (the exact dead model).
const RETIRED = [
  /\$24,?000/, // dead "Studio" tier
  /\$10,?000\s*\+\s*\$?399/, // dead Platform
  /\$5,?000\s*\+\s*\$?199/, // dead Portal
  /\$2,?500\s*\+\s*\$?99\b/, // dead Site
  /deposits?\s+start\s+at\s+\$1,?250/i, // dead deposit figure
  /\$1,?250\s+via\s+Stripe/i,
];

// 2. Tier-shaped "$X + $Y/mo" literals are almost always hard-coded tiers.
const TIER_SHAPED = /\$\d{1,3}(?:,\d{3})?\s*\+\s*\$\d+\s*\/\s*mo/i;

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(join(ROOT, dir));
  } catch {
    return out;
  }
  for (const name of entries) {
    const rel = join(dir, name);
    const abs = join(ROOT, rel);
    const st = statSync(abs);
    if (st.isDirectory()) out.push(...walk(rel));
    else if (/\.(ts|tsx|mdx?)$/.test(name)) out.push(rel);
  }
  return out;
}

const violations = [];
for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    if (file === ALLOW_FILE) continue;
    const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const re of RETIRED) {
        if (re.test(line))
          violations.push({ file, line: i + 1, kind: "RETIRED price", text: line.trim() });
      }
      if (TIER_SHAPED.test(line))
        violations.push({ file, line: i + 1, kind: "hard-coded tier ($X + $Y/mo)", text: line.trim() });
    });
  }
}

if (violations.length === 0) {
  console.log("✓ pricing-integrity guard: clean — no retired or hard-coded tier prices in src/app or src/components.");
  process.exit(0);
}

console.error(`✗ pricing-integrity guard: ${violations.length} violation(s). Import from src/lib/pricing.ts instead.\n`);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  [${v.kind}]`);
  console.error(`    ${v.text}\n`);
}
process.exit(1);
