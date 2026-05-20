/**
 * distress-monitor.mjs — the motivated-seller lead engine.
 *
 * BUILD: maintains the hot-leads store.
 * OPERATE: every run, re-scans every tracked property for distress /
 *   motivation signals (tax-delinquent, absentee owner, long-time owner,
 *   likely vacant, dated build) and surfaces a ranked hot-leads list — the
 *   properties most likely to have a motivated seller. All public-records
 *   based, deterministic, no API.
 */

import { loadStore, saveStore, scaffold, motivationSignals, bestValue, money, auditRE } from "./brain.mjs";

export const BUILD_SPEC = {
  capability: "distress-monitor",
  beyond: "Continuously re-scores the whole property set for motivation, so the hottest leads float up the moment their signals change.",
  ui_next: "/admin/realty — a 'Hot leads' tab filtered to high-motivation properties.",
};

export async function operate(slug) {
  await scaffold(slug);
  const properties = await loadStore(slug, "properties");

  const leads = [];
  for (const p of properties) {
    const signals = motivationSignals(p);
    const weight = signals.reduce((s, m) => s + m.weight, 0);
    if (weight >= 3) {
      leads.push({
        property_id: p.id,
        address: p.address,
        owner: p.owner_name,
        value_cents: bestValue(p),
        motivation_weight: weight,
        signals: signals.map((m) => m.flag),
      });
    }
  }
  leads.sort((a, b) => b.motivation_weight - a.motivation_weight);
  await saveStore(slug, "hot-leads", leads);

  const summary = { scanned: properties.length, hot_leads: leads.length, top: leads[0] ? `${leads[0].address} (w${leads[0].motivation_weight})` : "—" };
  await auditRE(slug, { actor: "re-distress-monitor", action: "distress_scanned", ...summary });
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2] || "day14-realty";
  operate(slug).then((r) =>
    console.log(`distress-monitor ${slug}: ${r.scanned} scanned · ${r.hot_leads} hot leads · top: ${r.top}`)
  );
}
