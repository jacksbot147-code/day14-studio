/**
 * pipeline-agent.mjs — the revenue pipeline: lead -> quote -> job -> invoice.
 *
 * BUILD: scaffolds the ops data layer (leads/quotes/jobs/invoices stores).
 * OPERATE: every run, advances the pipeline deterministically —
 *   - new lead with no quote        -> drafts a priced quote
 *   - quote marked "accepted"       -> opens a scheduled job
 *   - job marked "completed"        -> raises an unpaid invoice
 * All pricing is rules-based (brain.priceService) so it needs no API quota.
 */

import { loadStore, saveStore, scaffoldOps, priceService, auditLC, money } from "./brain.mjs";

export const BUILD_SPEC = {
  capability: "pipeline",
  beyond_jobber:
    "Quotes draft themselves the moment a lead lands, priced by lot size + difficulty. " +
    "No manual quote form, no copy-paste — the lead-to-invoice spine runs itself.",
  ui_next: "/admin/tenants/<slug>/pipeline — kanban of leads, quotes, jobs, invoices.",
};

let _seq = Date.now();
const id = (p) => `${p}-${(_seq++).toString(36)}`;

export async function operate(slug) {
  await scaffoldOps(slug);
  const leads = await loadStore(slug, "leads");
  const quotes = await loadStore(slug, "quotes");
  const jobs = await loadStore(slug, "jobs");
  const invoices = await loadStore(slug, "invoices");

  let quoted = 0, opened = 0, invoiced = 0;

  // 1. New leads -> draft quotes.
  for (const lead of leads) {
    if (lead.status === "lost") continue;
    if (quotes.some((q) => q.leadId === lead.id)) continue;
    const service = lead.service || "weekly-maintenance";
    const property = lead.property || { lotBand: "medium", difficulty: "standard" };
    const amount = priceService(service, property);
    quotes.push({
      id: id("q"),
      leadId: lead.id,
      customer: lead.name || "(unknown)",
      email: lead.email || "",
      service,
      property,
      amount_cents: amount,
      status: "draft",
      created_at: new Date().toISOString(),
    });
    lead.status = "quoted";
    quoted++;
  }

  // 2. Accepted quotes -> scheduled jobs.
  for (const q of quotes) {
    if (q.status !== "accepted") continue;
    if (jobs.some((j) => j.quoteId === q.id)) continue;
    jobs.push({
      id: id("j"),
      quoteId: q.id,
      customer: q.customer,
      service: q.service,
      amount_cents: q.amount_cents,
      status: "scheduled",
      created_at: new Date().toISOString(),
    });
    opened++;
  }

  // 3. Completed jobs -> unpaid invoices.
  for (const j of jobs) {
    if (j.status !== "completed") continue;
    if (invoices.some((inv) => inv.jobId === j.id)) continue;
    invoices.push({
      id: id("inv"),
      jobId: j.id,
      customer: j.customer,
      amount_cents: j.amount_cents,
      status: "unpaid",
      created_at: new Date().toISOString(),
    });
    invoiced++;
  }

  await saveStore(slug, "leads", leads);
  await saveStore(slug, "quotes", quotes);
  await saveStore(slug, "jobs", jobs);
  await saveStore(slug, "invoices", invoices);

  const outstanding = invoices
    .filter((i) => i.status === "unpaid")
    .reduce((s, i) => s + i.amount_cents, 0);

  const summary = {
    quoted, opened, invoiced,
    open_leads: leads.filter((l) => l.status === "new" || l.status === "quoted").length,
    pipeline_value: quotes.filter((q) => q.status !== "lost").reduce((s, q) => s + q.amount_cents, 0),
    outstanding_cents: outstanding,
  };
  await auditLC(slug, { actor: "pipeline-agent", action: "pipeline_advanced", ...summary });
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2];
  if (!slug) { console.error("Usage: pipeline-agent.mjs <tenant-slug>"); process.exit(1); }
  operate(slug).then((r) =>
    console.log(`pipeline ${slug}: +${r.quoted} quotes, +${r.opened} jobs, +${r.invoiced} invoices · outstanding ${money(r.outstanding_cents)}`)
  );
}
