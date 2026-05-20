#!/usr/bin/env node
/**
 * scout-agent.mjs — the Real-Estate Deal Scout (coordinator).
 *
 * The GM of the real-estate vertical pack. Each run (BUILD + OPERATE):
 *   1. Scaffolds the data layer (intake/ + ops stores).
 *   2. Runs intake -> enrichment -> evaluation.
 *   3. Ranks the deal board and writes a Scout brief (ops/scout-report.md).
 *   4. Heartbeats + logs to the audit trail.
 *
 * Usage: node scout-agent.mjs <segment-slug>   (default: day14-realty)
 * Designed to be daemonized — sources + scores deals on a schedule.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import { KNOWLEDGE, scaffold, opsDir, loadStore, money, auditRE } from "./brain.mjs";
import * as intake from "./intake-agent.mjs";
import * as enrichment from "./enrichment-agent.mjs";
import * as evaluation from "./evaluation-agent.mjs";

export const ROADMAP = [
  { phase: 1, capability: "intake", goal: "County property-record CSV intake, normalized + de-duped." },
  { phase: 1, capability: "evaluation", goal: "Blended flip/rental/wholesale deal score on every property." },
  { phase: 2, capability: "enrichment", goal: "Licensed-API AVM value + rent estimate (RentCast)." },
  { phase: 2, capability: "dashboard", goal: "day14.us/admin/realty — ranked, filterable deal board." },
  { phase: 3, capability: "county-feeds", goal: "Per-county official data-feed connectors (auto intake)." },
  { phase: 3, capability: "outreach", goal: "Owner-outreach drafting for A-tier wholesale leads." },
];

export async function operate(slug) {
  const created = await scaffold(slug);
  const results = {};
  for (const [name, agent] of [
    ["intake", intake],
    ["enrichment", enrichment],
    ["evaluation", evaluation],
  ]) {
    try {
      results[name] = await agent.operate(slug);
    } catch (e) {
      results[name] = { error: e.message };
    }
  }

  const evals = await loadStore(slug, "evaluations");
  const top = evals.slice(0, 10);

  const lines = [
    `# Real-Estate Deal Scout — ${slug}`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `## Funnel`,
    `- Intake: +${results.intake.ingested ?? 0} new · ${results.intake.total_properties ?? 0} properties tracked`,
    `- Enrichment: ${results.enrichment.has_key ? `+${results.enrichment.enriched ?? 0} enriched, ${results.enrichment.pending ?? 0} pending` : "no API key — running on county data only"}`,
    `- Evaluation: ${results.evaluation.evaluated ?? 0} scored · ${results.evaluation.tier_a ?? 0} A-tier, ${results.evaluation.tier_b ?? 0} B-tier`,
    ``,
    `## Top deals`,
    ...(top.length
      ? top.map((e, i) => `${i + 1}. **${e.score}** ${e.tier} · ${e.address || "(no address)"} — best play: ${e.best_play}${e.signals.length ? ` · ${e.signals.join(", ")}` : ""}`)
      : ["- No properties yet. Drop a county property-appraiser CSV into `businesses/" + slug + "/intake/`."]),
    ``,
    `## Build roadmap`,
    ...ROADMAP.map((r) => `- [P${r.phase}] ${r.capability}: ${r.goal}`),
    ``,
    `## Data sources`,
    `- County: ${KNOWLEDGE.data_sources.county}`,
    `- Valuation: ${KNOWLEDGE.data_sources.valuation}`,
    `- Never: ${KNOWLEDGE.data_sources.never}`,
    ``,
  ];
  await fs.mkdir(opsDir(slug), { recursive: true });
  await fs.writeFile(path.join(opsDir(slug), "scout-report.md"), lines.join("\n"));

  await auditRE(slug, {
    actor: "realty-scout",
    action: "scout_run",
    scaffolded: created.length,
    properties: results.intake.total_properties ?? 0,
    a_tier: results.evaluation.tier_a ?? 0,
  });

  return { slug, scaffolded: created, results, top_deal: top[0] || null };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2] || "day14-realty";
  operate(slug).then(async (r) => {
    try {
      const hb = path.join(homedir(), "Documents/businesses/_shared/poller", `realty-scout-${slug}-heartbeat.log`);
      await fs.mkdir(path.dirname(hb), { recursive: true });
      await fs.appendFile(hb, `${new Date().toISOString()} alive\n`);
    } catch { /* best-effort */ }
    console.log(`\n🏠 Real-Estate Scout ran for ${r.slug}`);
    if (r.scaffolded.length) console.log(`   scaffolded: ${r.scaffolded.join(", ")}`);
    for (const [k, v] of Object.entries(r.results)) {
      console.log(`   ${k}: ${v.error ? "ERROR " + v.error : JSON.stringify(v)}`);
    }
    if (r.top_deal) console.log(`   top deal: ${r.top_deal.address} — score ${r.top_deal.score} (${r.top_deal.best_play})`);
    console.log(`   brief: businesses/${r.slug}/ops/scout-report.md\n`);
  });
}
