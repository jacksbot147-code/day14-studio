/**
 * outreach-drafter.mjs — first-contact LETTER drafter.
 *
 * Reads a property from ops/evaluations.json and the buyer profile from
 * ops/buyerprofile.json (safe defaults if missing). Writes a TCPA + fair-
 * housing-aware first-contact letter as DRAFT to outreach/drafts/<id>.md.
 *
 * If ANTHROPIC_API_KEY is set in .env.local, uses Claude haiku for prose;
 * otherwise produces a high-quality template version. Never sends — DRAFT
 * only, attorney review required before any contact.
 *
 * Usage: node outreach-drafter.mjs --property-id <id> [--slug <slug>]
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { loadStore, money, auditRE } from "./brain.mjs";
import { llmCall } from "../../_generic/llm-call.mjs";
import { checkBudget } from "../../lib/budget-gate.mjs";

// Realty killswitch — set by scheduled task workday-t01 (2026-05-28) to stop
// realty scans from burning tokens. Resume = delete the killswitch file.
// Killswitch is the fast-path (binary, fully paused). The budget gate below
// is the middle gear — per-hour + per-day caps from `.budget.json`.
if (existsSync(path.join(homedir(), "Documents/studio/public/data/ops/.realty-killswitch"))) {
  console.log("Realty paused — exiting");
  process.exit(0);
}

// Budget gate (E6) — soft governor on top of the killswitch. With the
// realty domain seeded as paused in `.budget.json`, this exits cleanly
// even if the killswitch file is gone but the budget is still 0/0.
{
  const gate = await checkBudget("realty");
  if (!gate.allowed) {
    console.log(`Realty budget gate: ${gate.reason} — exiting`);
    process.exit(0);
  }
}

export const BUILD_SPEC = {
  capability: "outreach-drafter",
  beyond: "First-contact letter drafts that respect TCPA + fair-housing law — you go from a scored deal to a reviewable seller letter in one step.",
  ui_next: "Inline /admin/realty drawer to preview / regenerate the draft before sending.",
};

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");

const DEFAULT_BUYER = {
  buyer_name: "Day14 Realty",
  contact_name: "Jack",
  phone: "(redacted — fill before sending)",
  email: "(redacted — fill before sending)",
  mailing_address: "(redacted — fill before sending)",
  closing_window_days: 21,
  funds: "cash / verified proof of funds available on request",
  signature_line: "Day14 Realty",
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

async function hasAnthropicKey() {
  if (process.env.ANTHROPIC_API_KEY) return true;
  if (!existsSync(ENV_FILE)) return false;
  try {
    const t = await fs.readFile(ENV_FILE, "utf8");
    return /^\s*ANTHROPIC_API_KEY\s*=\s*.+/m.test(t);
  } catch {
    return false;
  }
}

const COMPLIANCE_SYSTEM = `You are drafting a postal first-contact letter from a real-estate buyer to a property owner. HARD RULES:
- Comply with the federal Fair Housing Act — no reference to race, color, religion, national origin, sex, familial status, or disability.
- Comply with TCPA — this is a postal letter, so do NOT promise calls or texts. Invite the owner to contact us at their convenience.
- No high-pressure or deceptive language. No "we will buy your house today" claims. No guaranteed pricing.
- No statements that imply foreclosure, distress, financial hardship, or government action. Stay neutral and respectful.
- The body MUST follow the "we noticed your property at <address>" pattern and end with a polite offer-to-talk close.
- Keep it short — 140 to 200 words of body copy. Warm, professional, plain English. Avoid all-caps and exclamation points.
- Output ONLY the letter body. Do NOT add headers, addresses, dates, salutation, or signature — those are templated separately.`;

function templateBody(property, buyer) {
  const addr = property.address || "your property";
  const city = property.city ? `, ${property.city}` : "";
  return [
    `We noticed your property at ${addr}${city} and wanted to reach out directly. We are a small local buyer that purchases homes from owners who would prefer a simple, private sale instead of listing on the market.`,
    ``,
    `There is no obligation here, and we are not asking you to make any decisions today. If selling has ever crossed your mind — even as a "maybe someday" — we would value the chance to share what we could offer for the property.`,
    ``,
    `A few things you can expect from us: a straightforward written offer, a flexible closing window (typically ${buyer.closing_window_days} days, or longer if that suits you), the option to leave items behind, and ${buyer.funds}. You choose the timeline. You choose whether to move forward.`,
    ``,
    `If you would like to talk — even just to ask questions — please reach out at your convenience using the contact details below. If you would rather not be contacted again, just let us know and we will remove your address from our list.`,
    ``,
    `Thank you for your time, and we hope this finds you well.`,
  ].join("\n");
}

async function llmBody(property, buyer) {
  const ctx = {
    address: property.address,
    city: property.city,
    buyer_name: buyer.buyer_name,
    closing_window_days: buyer.closing_window_days,
    funds: buyer.funds,
  };
  const prompt = `Draft the body of a postal first-contact letter to a property owner.

Property + buyer context (do NOT invent facts beyond this):
${JSON.stringify(ctx, null, 2)}

Open with "We noticed your property at ${property.address}${property.city ? ", " + property.city : ""}".
Close by inviting the owner to reach out at their convenience, and offer an opt-out from future mail.

Return ONLY the letter body. No salutation, no signature.`;
  const res = await llmCall({
    prompt,
    systemPrompt: COMPLIANCE_SYSTEM,
    temperature: 0.5,
    maxTokens: 600,
    preferAnthropic: true,
    model: "claude-haiku-4-5-20251001",
  });
  if (res.ok && res.text && res.text.trim().length > 80) return res.text.trim();
  return templateBody(property, buyer);
}

function renderLetter({ property, buyer, body, source }) {
  const today = new Date().toISOString().slice(0, 10);
  const addrLine = [property.address, property.city].filter(Boolean).join(", ");
  return [
    `# DRAFT — first-contact letter`,
    ``,
    `> **DRAFT — DO NOT SEND.** Review with a licensed attorney in your jurisdiction before any mailing. This draft is generated for review only; nothing here is legal advice, and laws vary by state, county, and municipality (especially around solicitation, do-not-mail lists, and disclosure language).`,
    ``,
    `- Property ID: \`${property.property_id || property.id}\``,
    `- Property: ${addrLine || "(no address on file)"}`,
    `- Owner of record: ${property.owner || "(unknown)"}`,
    `- Generated: ${today}`,
    `- Source: ${source}`,
    ``,
    `---`,
    ``,
    `${buyer.buyer_name}`,
    `${buyer.mailing_address}`,
    ``,
    `${today}`,
    ``,
    `${property.owner || "Current Owner"}`,
    `${addrLine}`,
    ``,
    `Dear ${property.owner ? "Property Owner" : "Neighbor"},`,
    ``,
    body,
    ``,
    `Warm regards,`,
    ``,
    `${buyer.contact_name}`,
    `${buyer.signature_line}`,
    `Phone: ${buyer.phone}`,
    `Email: ${buyer.email}`,
    ``,
    `---`,
    ``,
    `### Pre-send compliance checklist`,
    ``,
    `- [ ] Reviewed with a licensed real-estate attorney in the property's state.`,
    `- [ ] Owner address is NOT on the state attorney-general do-not-mail list.`,
    `- [ ] No protected-class (FHA) references anywhere in the letter.`,
    `- [ ] No claims of distress, foreclosure, or government action.`,
    `- [ ] Letter is mailed only — no follow-up call or text without express written consent (TCPA).`,
    `- [ ] Opt-out instructions are clear and honored on receipt.`,
    ``,
  ].join("\n");
}

export async function operate({ slug = "day14-realty", propertyId } = {}) {
  if (!propertyId) throw new Error("--property-id is required");
  const evals = await loadStore(slug, "evaluations");
  const property = evals.find((p) => String(p.property_id) === String(propertyId));
  if (!property) throw new Error(`property ${propertyId} not found in evaluations.json`);

  const buyer = await loadBuyer(slug);
  const useLLM = await hasAnthropicKey();
  let body, source;
  if (useLLM) {
    try {
      body = await llmBody(property, buyer);
      source = "claude-haiku-4-5-20251001 (compliance system prompt)";
    } catch {
      body = templateBody(property, buyer);
      source = "template (LLM call failed)";
    }
  } else {
    body = templateBody(property, buyer);
    source = "template (no ANTHROPIC_API_KEY)";
  }

  const md = renderLetter({ property, buyer, body, source });
  const outDir = path.join(BIZ, slug, "outreach", "drafts");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${property.property_id || property.id}.md`);
  await fs.writeFile(outPath, md);

  await auditRE(slug, {
    actor: "re-outreach-drafter",
    action: "letter_drafted",
    property_id: property.property_id || property.id,
    source,
    path: outPath,
  });

  return { ok: true, path: outPath, source, value: money(property.value_cents) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv);
  const propertyId = args["property-id"] || args.id;
  const slug = args.slug || "day14-realty";
  if (!propertyId) {
    console.error("Usage: node outreach-drafter.mjs --property-id <id> [--slug <slug>]");
    process.exit(2);
  }
  operate({ slug, propertyId })
    .then((r) => console.log(`outreach-drafter: DRAFT -> ${r.path}\n  source: ${r.source}\n  value (county): ${r.value}`))
    .catch((e) => { console.error("outreach-drafter failed:", e.message); process.exit(1); });
}
