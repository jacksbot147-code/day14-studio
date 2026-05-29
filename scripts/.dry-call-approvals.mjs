/**
 * Diagnostic: count items returned by collectAllApprovals(), grouped by kind.
 *
 * Why this exists: dropped here during E3 (2026-05-28) while wiring the
 * approvals-page `?kind=` filter, to verify how many items each chip would
 * show. Kept as a quick-poke script for later — `npx tsx
 * scripts/.dry-call-approvals.mjs` from the studio root.
 *
 * Not wired into package.json; not used by any agent. Safe to ignore or
 * delete if you don't want it around.
 */
import { loadEmpireState } from "../src/lib/admin-state.ts";
import { collectAllApprovals } from "../src/lib/admin-approvals.ts";

const state = await loadEmpireState();
const items = await collectAllApprovals(state);

const byKind = {};
for (const i of items) byKind[i.kind] = (byKind[i.kind] || 0) + 1;

console.log("total:", items.length);
console.log("by kind:");
for (const [k, n] of Object.entries(byKind).sort()) {
  console.log(`  ${k}: ${n}`);
}
