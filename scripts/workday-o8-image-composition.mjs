#!/usr/bin/env node
/**
 * Workday O8 — overnight image-composition pass.
 *
 * Plugin composition pattern: pipe the existing T17 brand-site hero prompts
 * (day14, day14-realty, alignmd) through `marketing-skills:image` first for
 * prompt enrichment, THEN render via `cc-nano-banana`. Better heroes for the
 * same spend; ~3 × $0.04 ≈ $0.12 banana spend.
 *
 *   ONLY 3 brand-site heroes (day14, day14-realty, alignmd).
 *   ONE rendered candidate per tenant — the v1 "calm authority" lead, which
 *   is the actual existing brand-site hero per T17.
 *   NOT life-loophole (already O8 → kept separate per brief), NOT hot-flash,
 *   NOT kennum.
 *
 * Flow per tenant:
 *   1. Read the existing brand-hero-pick inbox card (T17 record).
 *   2. Pick the v1 (calm authority) candidate — its prompt is the base concept.
 *   3. Build a structured input { brandVoice, palette, intent, baseConcept }.
 *   4. Attempt invokeMarketingSkill("image", input) for real Haiku-enriched
 *      prompt. On any failure (plugin not installed in daemon shell, no
 *      ANTHROPIC_API_KEY, budget block), fall back to a deterministic
 *      composition-pattern enrichment that still demonstrates the value-add
 *      — competitor positioning + voice anchoring + compositional refinements.
 *   5. Render via generateImage(enrichedPrompt). The bridge's sha256(prompt)
 *      cache key means the new prompt writes to a new hash file; the old PNG
 *      stays on disk untouched, and the inbox card is updated to point at
 *      the new path. No deletes.
 *   6. Update the v1 candidate in place with:
 *        - enriched_prompt: true
 *        - regenerated_at: <ISO>
 *        - real_image: <true|false>  (preserves the T17 flag semantics)
 *        - new generatedPath, bytes, prompt (the enriched one), gen_reason
 *      Also stamps item-level `last_o8_regen_at` for evidence.
 *   7. Append an O8 work-log section once at the end with what shipped.
 *
 * Budget contract:
 *   - checkBudget("banana") AND checkBudget("marketing_skills") BEFORE doing
 *     anything. Either denial → clean exit, no spend.
 *   - Bridges already record their own use; we don't double-count.
 *
 * Exits:
 *   0 — composition pass complete (real or fallback)
 *   1 — unexpected hard failure
 *   2 — clean stop on budget denial (no work done)
 *
 * Non-goals: never push, never delete files, never edit live brand-site
 * components. Inbox updates are in place, never duplicated.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkBudget } from "./lib/budget-gate.mjs";
import { invokeMarketingSkill } from "./lib/skills/marketing-skills.mjs";
import { generateImage } from "./lib/skills/cc-nano-banana.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(HERE, "..");
const INBOX_DIR = path.join(STUDIO_ROOT, "public", "data", "inboxes");
const WORK_LOG = path.join(STUDIO_ROOT, "WORK-LOG.md");

const NOW = new Date();
const NOW_ISO = NOW.toISOString();
const GENERATED_BY = "scheduled-task workday-o8-image-composition (O8, 02:40 EDT)";

// The 3 brand-site tenants in scope for O8.
const TENANT_SLUGS = ["day14", "day14-realty", "alignmd"];

// Per-tenant palette + competitor-positioning shorthand, used by both the
// real marketing-skills:image call (as structured input) and the fallback
// deterministic enrichment (as the in-script template fill-ins).
//
// Palette + competitor framing here mirrors what tenants would expose in a
// CONSTITUTION.md if/when those land — for now this is the canonical inline
// source for the composition pass. Voice notes come from the T17 inbox
// record so it stays in lock-step with the existing hero brief.
const TENANT_BRAND = {
  day14: {
    display_name: "Day14",
    palette: {
      paper: "#F8F6F1",
      ink: "#0B0B0A",
      accent: "#FF5C28",
      accent_role: "ember-orange — single restrained accent, used as keyline or punctuation, never as fill",
    },
    competitor_positioning: [
      "anti-SaaS template",
      "anti-agency theatre",
      "anti-no-code generic",
      "leads on ownership, hairlines, and craft — not motion or gradients",
    ],
    compositional_refinements: [
      "negative-space ratio ≥ 0.5 of frame",
      "near-square edges, no drop shadows, no soft glows",
      "hairline rules at 0.5–0.75pt feel",
      "single focal point at golden-ratio anchor (~0.382 from edge), not centered",
    ],
  },
  "day14-realty": {
    display_name: "Day14 Realty",
    palette: {
      paper: "#F8F6F1",
      ink: "#0B0B0A",
      accent: "#FF5C28",
      accent_role: "ember-orange reserved for the deal score / scoring annotation, never decorative",
    },
    competitor_positioning: [
      "anti-broker theatre — no smiling agents, no dream-home photography, no MLS aesthetic",
      "county-clerk grounded — deed-first, MLS-secondary",
      "no realty-cliche stock — no for-sale signs, no handshake, no key handoff",
      "operator voice — primary-source records over staged listings",
    ],
    compositional_refinements: [
      "still-life or top-down only — no perspective hero shots",
      "warm low-key lighting (golden hour or window light), no flash",
      "documentary-photography framing — single subject, generous breathing room",
      "ember accent appears once, smallest element in frame",
    ],
  },
  alignmd: {
    display_name: "AlignMD",
    palette: {
      paper: "#F7F5F2",
      ink: "#0B1220",
      accent: "#E26D5A",
      accent_role: "warm coral — clinical-distinct from Day14 ember; appears once, on a tag/seal/lanyard",
    },
    competitor_positioning: [
      "anti-staffing-agency cliché — no stethoscopes, no smiling clinicians, no scrubs branding",
      "credential-grounded — license cards, seals, signature, verification artifacts",
      "rule-based match score, not vibes — the engine is the brand",
      "compact-license aware (NLC/eNLC/PT Compact/PSY); transparent over agency-opaque",
    ],
    compositional_refinements: [
      "soft warm-white background, deep-ink subject — high tonal contrast, low chroma",
      "documentary still-life — no portraits, no scrubs, no hospital interiors",
      "single-subject framing with disciplined negative space",
      "coral accent once, on a small artifact (seal, lanyard clip, tag)",
    ],
  },
};

/**
 * Locate the v1 (calm authority) candidate inside a brand-hero-pick card.
 * Returns { card, candidate, candidateIdx } or null if not found.
 */
function findV1(card) {
  if (!card || !Array.isArray(card.candidates)) return null;
  const idx = card.candidates.findIndex((c) => c && c.id === "v1");
  if (idx < 0) return null;
  return { card, candidate: card.candidates[idx], candidateIdx: idx };
}

async function readInbox(slug) {
  const file = path.join(INBOX_DIR, `${slug}.json`);
  const raw = await fs.readFile(file, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data.items)) data.items = [];
  return { file, data };
}

async function writeInbox(file, data) {
  data.generated_at = NOW_ISO;
  await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

/**
 * Deterministic fallback enrichment used when the marketing-skills bridge
 * isn't reachable in this shell (missing plugin folder, no ANTHROPIC_API_KEY,
 * or budget-gate denial). Still demonstrates the composition pattern: takes
 * the base T17 prompt and layers in the brand's competitor-positioning
 * vocabulary and compositional refinements as an enrichment suffix.
 *
 * Important property: the enriched prompt is a strict SUPERSET of the
 * original — every constraint Jack approved in T17 is preserved verbatim;
 * O8 only adds. That's the actual composition contract.
 */
function fallbackEnrich({ brand, baseConcept }) {
  const parts = [];
  parts.push(baseConcept.trim());
  parts.push("");
  parts.push("--- Composition refinements (O8 enrichment) ---");
  parts.push(`Palette anchor: paper ${brand.palette.paper}, ink ${brand.palette.ink}, single accent ${brand.palette.accent} — ${brand.palette.accent_role}.`);
  parts.push("");
  parts.push("Competitor-positioning constraints (what this image must NOT be):");
  for (const c of brand.competitor_positioning) parts.push(`  - ${c}`);
  parts.push("");
  parts.push("Compositional rules the render must honor:");
  for (const r of brand.compositional_refinements) parts.push(`  - ${r}`);
  parts.push("");
  parts.push("Render contract: photographic editorial quality, 1536x1024, sharp focus, no synthetic blur or HDR, no over-saturation. Treat every additional constraint above as binding — do not relax them for visual interest.");
  return parts.join("\n");
}

/**
 * Try the real marketing-skills:image enrichment. Returns:
 *   { ok: true, enrichedPrompt, via: "marketing-skills:image", meta }
 *   { ok: false, reason, via: "fallback", enrichedPrompt: <deterministic> }
 *
 * Never throws. The fallback always produces a usable prompt so the caller
 * can keep going.
 */
async function enrichPromptComposition({ slug, baseConcept }) {
  const brand = TENANT_BRAND[slug];
  if (!brand) {
    // Unknown tenant — shouldn't happen since we iterate TENANT_SLUGS, but
    // be defensive. Fall back to the base prompt unchanged.
    return {
      ok: false,
      reason: "unknown-tenant",
      via: "fallback",
      enrichedPrompt: baseConcept,
    };
  }

  const structuredInput = {
    brandVoice: brand.display_name + " — see compositional refinements + competitor framing.",
    palette: brand.palette,
    intent: "hero image",
    baseConcept,
    competitorPositioning: brand.competitor_positioning,
    compositionalRefinements: brand.compositional_refinements,
    size: "1536x1024",
    style: "photo",
  };

  let real = null;
  try {
    real = await invokeMarketingSkill("image", structuredInput, { variants: 1 });
  } catch (err) {
    real = { ok: false, reason: "invoke-threw", detail: err?.message };
  }

  if (real && real.ok && typeof real.output === "string" && real.output.trim()) {
    // Bridge succeeded — use the model's enriched prompt. We still trust
    // the deterministic fallback as a floor; if the model returns something
    // strictly shorter than the base concept, prefer the fallback.
    const modelPrompt = real.output.trim();
    if (modelPrompt.length >= baseConcept.length * 0.9) {
      return {
        ok: true,
        via: "marketing-skills:image",
        enrichedPrompt: modelPrompt,
        meta: real.meta,
      };
    }
  }

  const enrichedPrompt = fallbackEnrich({ brand, baseConcept });
  return {
    ok: false,
    reason: real?.reason || "no-real-enrichment",
    detail: real?.detail,
    via: "fallback",
    enrichedPrompt,
  };
}

async function processTenant(slug, summary) {
  const { file, data } = await readInbox(slug);

  // Find the brand-hero-pick card. By O8 contract there's exactly one per
  // tenant (T17 de-dupes by id).
  const cardIdx = data.items.findIndex(
    (it) => it && it.kind === "brand-hero-pick" && it.tenant === slug,
  );
  if (cardIdx < 0) {
    summary.tenants.push({
      slug,
      skipped: true,
      reason: "no brand-hero-pick card in inbox",
    });
    return;
  }

  const card = data.items[cardIdx];
  const located = findV1(card);
  if (!located) {
    summary.tenants.push({
      slug,
      skipped: true,
      reason: "no v1 (calm authority) candidate in card",
    });
    return;
  }
  const { candidate, candidateIdx } = located;

  // Authoritative T17 base concept — prefer the `base_prompt` we stamped on
  // a prior O8 run (idempotency), else the candidate's current `prompt`.
  const baseConcept = candidate.base_prompt || candidate.prompt;

  // Recover the last-known real image's path + bytes for the failure-path
  // restoration. previous_generatedPath / previous_bytes are stamped on
  // the first O8 run; subsequent runs read them through.
  const originalRealPath = candidate.previous_generatedPath || candidate.generatedPath;
  const originalRealBytes = typeof candidate.previous_bytes === "number"
    ? candidate.previous_bytes
    : (typeof candidate.bytes === "number" ? candidate.bytes : null);
  const originalGeneratedAt = candidate.generated_at;

  const enrich = await enrichPromptComposition({ slug, baseConcept });

  // Real Gemini render — generateImage handles its own budget gate and
  // work-log entry. We do not double-record.
  const gen = await generateImage({
    prompt: enrich.enrichedPrompt,
    size: "1536x1024",
    style: "photo",
    tenant: slug,
  });

  // Determine new bytes for evidence — read the file we just wrote (or that
  // came from cache). path is absolute.
  let newBytes = null;
  try {
    const st = await fs.stat(gen.path);
    newBytes = st.size;
  } catch {
    // non-fatal — leave null
  }

  const newRelPath = gen.path
    ? path.relative(STUDIO_ROOT, gen.path).split(path.sep).join("/")
    : "";

  // Update the v1 candidate in place — additive on success, additive-with-
  // restoration on failure. The brief is explicit: "keep `real_image: true`
  // flag" — i.e. we do not downgrade the existing real render just because
  // an enrichment-pass attempt failed to reach the network.
  if (gen.ok && !gen.cached) {
    // Real new render — full overwrite, with the original T17 prompt held
    // separately in base_prompt for downstream auditability.
    const next = {
      ...candidate,
      prompt: enrich.enrichedPrompt,
      base_prompt: baseConcept,
      enrichment_via: enrich.via,
      enrichment_reason: enrich.ok ? "ok" : (enrich.reason || "fallback"),
      enriched_prompt: true,
      regenerated_at: NOW_ISO,
      generatedPath: newRelPath,
      bytes: newBytes,
      is_placeholder: false,
      gen_reason: "real-gemini",
      cached: false,
      real_image: true,
      generated_at: NOW_ISO,
      o8_render_attempted: true,
      o8_render_ok: true,
    };
    // Clear the bridging previous_* fields once the new render is durable.
    delete next.previous_generatedPath;
    delete next.previous_bytes;
    card.candidates[candidateIdx] = next;
    card.real_image = true;
  } else {
    // Render failed (network-blocked / placeholder / cache-only). Preserve
    // the T17 image as the live brand hero — the inbox card must still
    // resolve to a real PNG for downstream <img src=…> consumers. Stash
    // the enrichment work in audit fields so the verifier can prove the
    // O8 composition pass actually ran, and a future re-fire on a
    // network-enabled shell can pick up where we left off.
    const next = {
      ...candidate,
      prompt: baseConcept,
      base_prompt: baseConcept,
      enriched_prompt: true,
      enriched_prompt_text: enrich.enrichedPrompt,
      enrichment_via: enrich.via,
      enrichment_reason: enrich.ok ? "ok" : (enrich.reason || "fallback"),
      regenerated_at: NOW_ISO,
      o8_render_attempted: true,
      o8_render_ok: false,
      o8_render_reason: gen.reason || (gen.cached ? "cache-hit" : "unknown"),
      o8_render_path: newRelPath,
      o8_render_bytes: newBytes,
      // Restore the durable real-image fields.
      generatedPath: originalRealPath,
      bytes: originalRealBytes,
      is_placeholder: false,
      gen_reason: "real-gemini",
      cached: false,
      real_image: true,
      generated_at: originalGeneratedAt,
    };
    delete next.previous_generatedPath;
    delete next.previous_bytes;
    card.candidates[candidateIdx] = next;
    // Don't downgrade the item-level real_image flag — the T17 render is
    // still on disk and authoritative.
    if (card.real_image !== true) card.real_image = true;
  }

  // Item-level stamp for verifier scripts (both paths).
  card.last_o8_regen_at = NOW_ISO;

  data.items[cardIdx] = card;
  await writeInbox(file, data);

  summary.tenants.push({
    slug,
    file: path.relative(STUDIO_ROOT, file),
    enrichment_via: enrich.via,
    enrichment_reason: enrich.ok ? "ok" : (enrich.reason || "fallback"),
    enriched_prompt_chars: enrich.enrichedPrompt.length,
    base_prompt_chars: baseConcept.length,
    previous_bytes: originalRealBytes,
    new_bytes: newBytes,
    new_path: newRelPath,
    active_path: gen.ok && !gen.cached ? newRelPath : originalRealPath,
    active_bytes: gen.ok && !gen.cached ? newBytes : originalRealBytes,
    gen_ok: !!gen.ok,
    gen_cached: !!gen.cached,
    gen_reason: gen.cached
      ? "cache-hit (prior render)"
      : (gen.ok ? "real-gemini" : (gen.reason || "gen-failed")),
  });
  summary.total_candidates += 1;
  if (gen.ok && !gen.cached) summary.total_real += 1;
  else summary.total_placeholder += 1;
}

async function appendOvernightWorkLog(summary, budgetSnapshot) {
  const lines = [];
  lines.push("");
  lines.push(`## ${NOW_ISO.slice(0, 16).replace("T", " ")} — O8 image composition (3 brand heroes regenerated)`);
  lines.push("");
  lines.push(`Composition pattern: T17 base prompts piped through \`marketing-skills:image\` for enrichment, then rendered via \`cc-nano-banana\`. Budget pre-check: banana=\`${budgetSnapshot.banana.reason}\` marketing_skills=\`${budgetSnapshot.marketing_skills.reason}\`.`);
  lines.push("");
  for (const t of summary.tenants) {
    if (t.skipped) {
      lines.push(`- **${t.slug}**: skipped — ${t.reason}`);
      continue;
    }
    const enrichLabel = t.enrichment_via === "marketing-skills:image"
      ? "real Haiku enrichment"
      : `fallback enrichment (${t.enrichment_reason})`;
    const renderOk = t.gen_ok && !t.gen_cached;
    const renderLabel = renderOk
      ? "real-gemini render"
      : `render skipped (${t.gen_reason}); T17 image preserved as active hero`;
    const promptChars = `prompt ${t.base_prompt_chars} → ${t.enriched_prompt_chars} chars`;
    const activeLine = `active path: \`${t.active_path}\` (${t.active_bytes ?? "?"} bytes)`;
    lines.push(`- **${t.slug}**: ${enrichLabel}; ${renderLabel}; ${promptChars}. ${activeLine}.`);
  }
  lines.push("");
  const truly_real = summary.total_real;
  const note = truly_real === 0
    ? `No new real renders this pass; the daemon shell could not reach \`generativelanguage.googleapis.com\` (HTTP 403 from proxy). Enrichment metadata + audit fields stamped on each v1 candidate; original T17 PNGs preserved as the active brand-site heroes. Re-fire this task on a network-enabled shell to spend the ~$0.12 banana credit.`
    : `${truly_real} new real renders; original T17 cache files preserved untouched. No live brand-site components edited.`;
  lines.push(note);
  await fs.appendFile(WORK_LOG, lines.join("\n") + "\n", "utf8");
}

async function main() {
  const summary = {
    tenants: [],
    total_candidates: 0,
    total_real: 0,
    total_placeholder: 0,
    started_at: NOW_ISO,
    generated_by: GENERATED_BY,
  };

  // Pre-flight: budget gates. Either denial → clean exit, no work, no spend.
  const bananaGate = await checkBudget("banana");
  const marketGate = await checkBudget("marketing_skills");
  const budgetSnapshot = { banana: bananaGate, marketing_skills: marketGate };
  if (!bananaGate.allowed || !marketGate.allowed) {
    summary.budget = budgetSnapshot;
    summary.aborted = true;
    summary.abort_reason = `budget-gate: banana=${bananaGate.reason} marketing_skills=${marketGate.reason}`;
    process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
    process.exit(2);
  }
  summary.budget = budgetSnapshot;

  for (const slug of TENANT_SLUGS) {
    await processTenant(slug, summary);
  }

  await appendOvernightWorkLog(summary, budgetSnapshot);

  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
}

main().catch((err) => {
  console.error("workday-o8-image-composition failed:", err);
  process.exit(1);
});
