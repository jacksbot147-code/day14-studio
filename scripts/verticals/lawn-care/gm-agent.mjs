#!/usr/bin/env node
/**
 * gm-agent.mjs — the Lawn-Care General Manager.
 *
 * The coordinator of the lawn-care vertical pack. It is "brilliant in the
 * field": it owns the build roadmap and runs the operating cluster.
 *
 * Each run (BUILD + OPERATE):
 *   1. Scaffolds the tenant's ops data layer.
 *   2. Runs every capability agent (pipeline, scheduling, CRM, portal).
 *   3. Applies the SWFL seasonal playbook from the domain brain.
 *   4. Writes a GM brief (ops/gm-report.md) + logs to the audit trail.
 *
 * Usage: node gm-agent.mjs <tenant-slug>
 * Designed to be daemonized — runs the whole cluster on a schedule.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import { KNOWLEDGE, seasonalActions, scaffoldOps, opsDir, auditLC, money, loadStore } from "./brain.mjs";
import * as pipeline from "./pipeline-agent.mjs";
import * as scheduling from "./scheduling-agent.mjs";
import * as crm from "./crm-agent.mjs";
import * as portal from "./portal-agent.mjs";

export const ROADMAP = [
  { phase: 1, capability: "pipeline", goal: "Lead -> quote -> job -> invoice runs itself." },
  { phase: 1, capability: "scheduling", goal: "Density-scored, weather-aware route board." },
  { phase: 2, capability: "crm", goal: "Churn prediction + upsell detection per customer." },
  { phase: 2, capability: "portal", goal: "Proactive, photo-backed customer portal." },
  { phase: 3, capability: "ops-console", goal: "day14.us/admin ops console reading the live stores." },
  { phase: 3, capability: "payments", goal: "Recurring billing + one-tap invoice pay (Stripe)." },
];

export async function operate(slug) {
  const created = await scaffoldOps(slug);
  const season = seasonalActions();

  const results = {};
  for (const [name, agent] of [
    ["pipeline", pipeline],
    ["scheduling", scheduling],
    ["crm", crm],
    ["portal", portal],
  ]) {
    try {
      results[name] = await agent.operate(slug);
    } catch (e) {
      results[name] = { error: e.message };
    }
  }

  const invoices = await loadStore(slug, "invoices");
  const outstanding = invoices.filter((i) => i.status === "unpaid").reduce((s, i) => s + i.amount_cents, 0);

  const lines = [
    `# Lawn-Care GM Brief — ${slug}`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    `Season: **${season.season}** · mow cadence: ${season.mow_cadence}`,
    `Fertilizer: ${season.fertilizer_allowed ? "allowed" : "BLACKOUT — SWFL ordinance, do not quote/schedule"}`,
    ``,
    `## This season, push:`,
    ...season.push.map((p) => `- ${p}`),
    ``,
    `## Cluster status`,
    `- Pipeline: ${results.pipeline.open_leads ?? 0} open leads · pipeline value ${money(results.pipeline.pipeline_value ?? 0)} · outstanding ${money(outstanding)}`,
    `- Scheduling: ${results.scheduling.scheduled ?? 0} jobs routed · avg route density ${results.scheduling.avg_density ?? 0}/100`,
    `- CRM: ${results.crm.customers ?? 0} customers · ${results.crm.at_risk ?? 0} at churn risk · ${results.crm.upsell_openings ?? 0} upsell openings`,
    `- Portal: ${results.portal.portal_feeds ?? 0} customer feeds live`,
    ``,
    `## Build roadmap (beyond Jobber)`,
    ...ROADMAP.map((r) => `- [P${r.phase}] ${r.capability}: ${r.goal}`),
    ``,
    `## The edge`,
    ...KNOWLEDGE.beyond_jobber.map((b) => `- ${b}`),
    ``,
  ];
  await fs.mkdir(opsDir(slug), { recursive: true });
  await fs.writeFile(path.join(opsDir(slug), "gm-report.md"), lines.join("\n"));

  await auditLC(slug, {
    actor: "lawn-care-gm",
    action: "cluster_run",
    scaffolded: created.length,
    season: season.season,
    pipeline_value: results.pipeline.pipeline_value ?? 0,
    at_risk: results.crm.at_risk ?? 0,
  });

  return { slug, season: season.season, scaffolded: created, results };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: gm-agent.mjs <tenant-slug>");
    process.exit(1);
  }
  operate(slug).then(async (r) => {
    // Heartbeat so the empire dashboard tracks this daemon.
    try {
      const hb = path.join(homedir(), "Documents/businesses/_shared/poller", `lawn-care-gm-${slug}-heartbeat.log`);
      await fs.mkdir(path.dirname(hb), { recursive: true });
      await fs.appendFile(hb, `${new Date().toISOString()} alive\n`);
    } catch { /* best-effort */ }
    console.log(`\n🌱 Lawn-Care GM ran for ${r.slug} — season: ${r.season}`);
    if (r.scaffolded.length) console.log(`   scaffolded ops stores: ${r.scaffolded.join(", ")}`);
    for (const [k, v] of Object.entries(r.results)) {
      console.log(`   ${k}: ${v.error ? "ERROR " + v.error : JSON.stringify(v)}`);
    }
    console.log(`   brief: businesses/${r.slug}/ops/gm-report.md\n`);
  });
}
