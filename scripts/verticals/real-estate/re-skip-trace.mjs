/**
 * re-skip-trace.mjs — skip-trace provider stub.
 *
 * Placeholder until Jack picks a provider. When a provider is configured
 * (BatchSkipTracing, REI Skip, IDI Data, etc.), this will resolve owner-of-
 * record records to current phone / email / mailing address — the bridge
 * from a county parcel ID to a reachable contact for the outreach drafter.
 *
 * Exits 0 with a clear log line so cron + the pack-runner can call it
 * today without erroring; swapping in a real implementation is a single
 * file edit + SKIP_TRACE_API_KEY in .env.local.
 */

import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

// Realty killswitch — set by scheduled task workday-t01 (2026-05-28) to stop
// realty scans from burning tokens. Resume = delete the killswitch file.
if (existsSync(path.join(homedir(), "Documents/studio/public/data/ops/.realty-killswitch"))) {
  console.log("Realty paused — exiting");
  process.exit(0);
}

export const BUILD_SPEC = {
  capability: "skip-trace",
  beyond: "Bridges a county parcel ID to a reachable owner contact — the missing edge between scored deals and outreach drafts.",
  ui_next: "Provider selector + spend cap on /admin/realty once a provider is wired.",
};

export async function operate() {
  const msg = "skip-trace: no provider configured — pick one (BatchSkipTracing, REI Skip, etc.) and add SKIP_TRACE_API_KEY to .env.local";
  console.log(msg);
  return { ok: true, configured: false, message: msg };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  operate().then(() => process.exit(0));
}
