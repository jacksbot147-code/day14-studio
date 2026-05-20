/**
 * portal-agent.mjs — the customer portal data layer.
 *
 * BUILD: maintains a per-customer portal feed under ops/portal/.
 * OPERATE: every run, compiles each customer's feed — upcoming visits,
 *   service history, invoices, and any open upsell offers — so the client
 *   portal UI is a pure read of pre-built JSON (fast, no live joins).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { loadStore, scaffoldOps, opsDir, churnRisk, upsellTriggers, auditLC } from "./brain.mjs";

export const BUILD_SPEC = {
  capability: "portal",
  beyond_jobber:
    "The portal is proactive — it shows what we noticed on the property and the next " +
    "recommended service, not just a passive invoice list. Photo-backed visit updates.",
  ui_next: "/brands/<slug>/portal — magic-link login, schedule, history with photos, one-tap extras.",
};

function slugifyName(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "customer";
}

export async function operate(slug) {
  await scaffoldOps(slug);
  const customers = await loadStore(slug, "customers");
  const jobs = await loadStore(slug, "jobs");
  const invoices = await loadStore(slug, "invoices");
  const portalDir = path.join(opsDir(slug), "portal");
  await fs.mkdir(portalDir, { recursive: true });

  let feeds = 0;
  for (const c of customers) {
    const mine = jobs.filter((j) => j.customer === c.name);
    const feed = {
      customer: c.name,
      generated_at: new Date().toISOString(),
      upcoming: mine.filter((j) => j.status === "scheduled").map((j) => ({ service: j.service, day: j.day || "TBD" })),
      history: mine.filter((j) => j.status === "completed").map((j) => ({ service: j.service, id: j.id })),
      invoices: invoices
        .filter((i) => i.customer === c.name)
        .map((i) => ({ id: i.id, amount_cents: i.amount_cents, status: i.status })),
      offers: upsellTriggers(c.property || {}, mine.map((j) => ({ service: j.service }))),
      account_health: churnRisk(c).level,
    };
    await fs.writeFile(path.join(portalDir, `${slugifyName(c.name)}.json`), JSON.stringify(feed, null, 2));
    feeds++;
  }

  const summary = { portal_feeds: feeds };
  await auditLC(slug, { actor: "portal-agent", action: "portal_feeds_built", ...summary });
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2];
  if (!slug) { console.error("Usage: portal-agent.mjs <tenant-slug>"); process.exit(1); }
  operate(slug).then((r) => console.log(`portal ${slug}: ${r.portal_feeds} customer feeds built`));
}
