/**
 * evaluation-agent.mjs — the evaluation layer.
 *
 * BUILD: maintains the evaluations store.
 * OPERATE: scores every property for fix & flip, rental, and wholesale, plus
 *   a blended deal score (0-100) and a tier (A pursue / B look / C pass).
 *   Output is the ranked deal list the dashboard monitors.
 */

import { loadStore, saveStore, scaffold, dealScore, bestValue, money, auditRE } from "./brain.mjs";

export const BUILD_SPEC = {
  capability: "evaluation",
  beyond: "Every property scored across flip, rental AND wholesale at once — a blended deal score, not a single-strategy guess.",
  ui_next: "/admin/realty — ranked deal board, filterable by tier and play.",
};

export async function operate(slug) {
  await scaffold(slug);
  const properties = await loadStore(slug, "properties");

  const evaluations = properties.map((p) => {
    const d = dealScore(p);
    return {
      property_id: p.id,
      address: p.address,
      city: p.city,
      owner: p.owner_name,
      enriched: !!p.enriched,
      value_cents: bestValue(p),
      score: d.score,
      tier: d.tier,
      best_play: d.best_play,
      signals: d.signals,
      flip: { mao_cents: d.flip.mao_cents, est_profit_cents: d.flip.est_profit_cents, score: d.flip.score },
      rental: { cap_rate_pct: d.rental.cap_rate_pct, rent_to_value_pct: d.rental.rent_to_value_pct, score: d.rental.score },
      wholesale: { equity_pct: d.wholesale.equity_pct, score: d.wholesale.score },
      evaluated_at: new Date().toISOString(),
    };
  });

  evaluations.sort((a, b) => b.score - a.score);
  await saveStore(slug, "evaluations", evaluations);

  const tierA = evaluations.filter((e) => e.tier.startsWith("A")).length;
  const tierB = evaluations.filter((e) => e.tier.startsWith("B")).length;
  const summary = {
    evaluated: evaluations.length,
    tier_a: tierA,
    tier_b: tierB,
    top_deal: evaluations[0] ? `${evaluations[0].address} (${evaluations[0].score})` : "—",
  };
  await auditRE(slug, { actor: "re-evaluation-agent", action: "deals_scored", ...summary });
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2];
  if (!slug) { console.error("Usage: evaluation-agent.mjs <slug>"); process.exit(1); }
  operate(slug).then((r) =>
    console.log(`evaluation ${slug}: ${r.evaluated} scored · ${r.tier_a} A-tier, ${r.tier_b} B-tier · top: ${r.top_deal}`)
  );
}
