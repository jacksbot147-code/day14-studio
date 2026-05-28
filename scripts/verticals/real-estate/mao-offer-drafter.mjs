/**
 * mao-offer-drafter.mjs — MAO + offer-terms drafter.
 *
 * Reads a property from ops/evaluations.json and the buyer profile from
 * ops/buyerprofile.json. Computes MAO using the 70% rule:
 *     MAO = ARV * 0.70 - repairs
 * Then drafts a DRAFT offer with price, EMD, due-diligence period, and
 * financing contingency. Writes to outreach/offers/<id>.md.
 *
 * Usage: node mao-offer-drafter.mjs --property-id <id> [--slug <slug>]
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { loadStore, money, auditRE } from "./brain.mjs";

// Realty killswitch — set by scheduled task workday-t01 (2026-05-28) to stop
// realty scans from burning tokens. Resume = delete the killswitch file.
if (existsSync(path.join(homedir(), "Documents/studio/public/data/ops/.realty-killswitch"))) {
  console.log("Realty paused — exiting");
  process.exit(0);
}

export const BUILD_SPEC = {
  capability: "mao-offer-drafter",
  beyond: "From scored deal -> DRAFT offer with price + terms in one step. The 70% rule applied consistently across every property.",
  ui_next: "Side-by-side offer-vs-ARV slider on /admin/realty so Jack can adjust price + DD window before locking the draft.",
};

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");

const DEFAULT_BUYER = {
  buyer_name: "Day14 Realty",
  contact_name: "Jack",
  mailing_address: "(redacted — fill before sending)",
  emd_cents: 100000, // $1,000 earnest money default
  due_diligence_days: 10,
  closing_window_days: 21,
  financing: "cash",
  financing_contingency_days: 0, // cash = no contingency
  title_company: "(buyer-selected title company)",
};

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--") && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      out[a.slice(2)] = argv[++i];
    } else if (a.startsWith("--")) {
      out[a.slice(2)] = true;
    }
  }
  return out;
}

async function loadBuyer(slug) {
  const f = path.join(BIZ, slug, "ops", "buyerprofile.json");
  if (!existsSync(f)) return { ...DEFAULT_BUYER };
  try {
    const raw = JSON.parse(await fs.readFile(f, "utf8"));
    return { ...DEFAULT_BUYER, ...raw };
  } catch {
    return { ...DEFAULT_BUYER };
  }
}

/** MAO = ARV * 0.70 - repairs. Returns cents (clamped to >= 0). */
export function computeMAO({ arv_cents = 0, repairs_cents = 0 } = {}) {
  const raw = Math.round(arv_cents * 0.70) - Math.round(repairs_cents);
  return Math.max(0, raw);
}

function renderOffer({ property, buyer, arv_cents, repairs_cents, mao_cents }) {
  const today = new Date().toISOString().slice(0, 10);
  const addrLine = [property.address, property.city].filter(Boolean).join(", ");
  const offerPrice = mao_cents;
  const financingClause =
    buyer.financing === "cash"
      ? `**All cash.** No financing contingency. Proof of funds available on request.`
      : `**${buyer.financing}.** Financing contingency: ${buyer.financing_contingency_days} days from effective date.`;

  return [
    `# DRAFT — purchase offer terms`,
    ``,
    `> **DRAFT — DO NOT SEND.** This is an internal pricing worksheet. Review with a licensed real-estate attorney and use a state-compliant purchase contract (e.g. FAR/BAR in Florida) before transmitting any offer. Numbers below are computed deterministically from the 70% rule and the buyer profile — they are NOT pre-negotiated.`,
    ``,
    `- Property ID: \`${property.property_id || property.id}\``,
    `- Property: ${addrLine || "(no address on file)"}`,
    `- Owner of record: ${property.owner || "(unknown)"}`,
    `- Generated: ${today}`,
    ``,
    `## Underwriting (from evaluations.json)`,
    ``,
    `| Field | Value |`,
    `|---|---|`,
    `| ARV (after-repair value) | ${money(arv_cents)} |`,
    `| Estimated repairs | ${money(repairs_cents)} |`,
    `| **MAO (70% rule)** | **${money(mao_cents)}** |`,
    `| Implied gross spread (ARV - MAO - repairs) | ${money(arv_cents - mao_cents - repairs_cents)} |`,
    `| Best play (scored) | ${property.best_play || "n/a"} (score ${property.score ?? "?"}) |`,
    ``,
    `Formula: **MAO = ARV x 0.70 - repairs**. Standard fix-and-flip rule of thumb — leaves ~30% of ARV to cover holding + closing + selling + buyer's profit margin.`,
    ``,
    `## Proposed offer terms`,
    ``,
    `- **Purchase price:** ${money(offerPrice)}`,
    `- **Earnest money deposit:** ${money(buyer.emd_cents)} to ${buyer.title_company} within 3 business days of effective date.`,
    `- **Due-diligence / inspection period:** ${buyer.due_diligence_days} days from effective date. Buyer may terminate for any reason during this window and receive full EMD refund.`,
    `- **Financing:** ${financingClause}`,
    `- **Closing:** on or before ${buyer.closing_window_days} days from effective date, at ${buyer.title_company}.`,
    `- **Title:** seller to convey marketable title via warranty deed; title insurance per state custom.`,
    `- **Property condition:** sold AS-IS, where-is. Buyer waives repair credits in exchange for the inspection-period termination right above.`,
    `- **Possession:** delivered at closing, broom-clean. Seller may leave personal property; buyer will dispose.`,
    `- **Assignment:** buyer reserves the right to assign the contract to an affiliated entity.`,
    `- **Offer expiration:** 5 business days from delivery to seller.`,
    ``,
    `## Buyer`,
    ``,
    `- ${buyer.buyer_name}`,
    `- Mailing address: ${buyer.mailing_address}`,
    `- Contact: ${buyer.contact_name}`,
    ``,
    `## Pre-send checklist`,
    ``,
    `- [ ] Verified ARV with a comp-based ARV (re-comp-analyst) before sending — county AVM alone is not enough.`,
    `- [ ] Verified repair estimate against a recent walkthrough or contractor scope.`,
    `- [ ] Confirmed owner has clear title (no open liens / probate / divorce that would block close).`,
    `- [ ] Transferred these terms into a state-compliant purchase agreement (e.g. FAR/BAR in Florida).`,
    `- [ ] Reviewed with a licensed real-estate attorney.`,
    `- [ ] EMD source funds available and title company has been notified.`,
    ``,
  ].join("\n");
}

export async function operate({ slug = "day14-realty", propertyId } = {}) {
  if (!propertyId) throw new Error("--property-id is required");
  const evals = await loadStore(slug, "evaluations");
  const property = evals.find((p) => String(p.property_id) === String(propertyId));
  if (!property) throw new Error(`property ${propertyId} not found in evaluations.json`);

  const buyer = await loadBuyer(slug);

  // Prefer the flip-block ARV + repairs; fall back to the property value_cents.
  const arv_cents = property.flip?.arv_cents ?? property.value_cents ?? 0;
  const repairs_cents = property.flip?.repairs_cents ?? 0;
  const mao_cents = computeMAO({ arv_cents, repairs_cents });

  const md = renderOffer({ property, buyer, arv_cents, repairs_cents, mao_cents });
  const outDir = path.join(BIZ, slug, "outreach", "offers");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${property.property_id || property.id}.md`);
  await fs.writeFile(outPath, md);

  await auditRE(slug, {
    actor: "re-mao-offer-drafter",
    action: "offer_drafted",
    property_id: property.property_id || property.id,
    arv_cents,
    repairs_cents,
    mao_cents,
    path: outPath,
  });

  return { ok: true, path: outPath, arv: money(arv_cents), repairs: money(repairs_cents), mao: money(mao_cents) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv);
  const propertyId = args["property-id"] || args.id;
  const slug = args.slug || "day14-realty";
  if (!propertyId) {
    console.error("Usage: node mao-offer-drafter.mjs --property-id <id> [--slug <slug>]");
    process.exit(2);
  }
  operate({ slug, propertyId })
    .then((r) => console.log(`mao-offer-drafter: DRAFT -> ${r.path}\n  ARV ${r.arv} | repairs ${r.repairs} | MAO ${r.mao}`))
    .catch((e) => { console.error("mao-offer-drafter failed:", e.message); process.exit(1); });
}
