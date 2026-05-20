/**
 * crm-agent.mjs — client CRM + property intelligence.
 *
 * BUILD: maintains the customers store with property + history data.
 * OPERATE: every run, scores each customer for churn risk and scans for
 *   upsell openings (overgrown beds, brown patches, seasonal projects),
 *   then writes a prioritized CRM report. Anything that needs a human
 *   touch (a high-churn customer) is flagged for follow-up.
 */

import { loadStore, saveStore, scaffoldOps, churnRisk, upsellTriggers, auditLC } from "./brain.mjs";

export const BUILD_SPEC = {
  capability: "crm",
  beyond_jobber:
    "The client list predicts churn and surfaces upsells from job history — " +
    "it doesn't just store contacts. Each customer carries a live risk score and a next-best-action.",
  ui_next: "/admin/tenants/<slug>/customers — sortable by churn risk + lifetime value, with property notes.",
};

export async function operate(slug) {
  await scaffoldOps(slug);
  const customers = await loadStore(slug, "customers");
  const jobs = await loadStore(slug, "jobs");
  const invoices = await loadStore(slug, "invoices");

  const rows = [];
  let atRisk = 0;
  let upsells = 0;

  for (const c of customers) {
    const history = jobs.filter((j) => j.customer === c.name);
    const ltv = invoices
      .filter((i) => i.customer === c.name)
      .reduce((s, i) => s + i.amount_cents, 0);
    const risk = churnRisk(c);
    const triggers = upsellTriggers(c.property || {}, history.map((h) => ({ service: h.service })));
    if (risk.level === "high") atRisk++;
    upsells += triggers.length;
    rows.push({
      name: c.name,
      lifetime_value_cents: ltv,
      jobs_done: history.length,
      churn: risk,
      upsells: triggers,
      next_best_action:
        risk.level === "high"
          ? `Save call — ${risk.reasons.join(", ")}`
          : triggers[0]
            ? `Offer ${triggers[0].service} — ${triggers[0].reason}`
            : "Healthy — keep the route consistent.",
    });
  }

  rows.sort((a, b) => b.churn.score - a.churn.score || b.lifetime_value_cents - a.lifetime_value_cents);

  const report = { generated_at: new Date().toISOString(), customers: rows.length, at_risk: atRisk, upsell_openings: upsells, rows };
  await saveStore(slug, "crm-report", report);

  const summary = { customers: rows.length, at_risk: atRisk, upsell_openings: upsells };
  await auditLC(slug, { actor: "crm-agent", action: "crm_scored", ...summary });
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2];
  if (!slug) { console.error("Usage: crm-agent.mjs <tenant-slug>"); process.exit(1); }
  operate(slug).then((r) =>
    console.log(`crm ${slug}: ${r.customers} customers · ${r.at_risk} at churn risk · ${r.upsell_openings} upsell openings`)
  );
}
