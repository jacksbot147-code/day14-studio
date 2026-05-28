#!/usr/bin/env node
/**
 * Workday T17 — brand-hero candidates for Day14 core / Day14 Realty / AlignMD.
 *
 * For each tenant we construct 3 prompt variants emphasizing a differentiated
 * mood (calm authority / data-rich / human-warm), call generateImage(), and
 * write a single `kind: "brand-hero-pick"` inbox card per tenant carrying the
 * three candidates. Nothing is auto-applied — sign-off is required.
 *
 * Excluded tenants (per workday constraints): hot-flash-co, kennum-lawn-care.
 *
 * Side effects:
 *   - 9 PNGs written under public/data/cache/banana/<hash>.png (real or
 *     placeholder depending on GEMINI_API_KEY presence).
 *   - public/data/inboxes/<tenant>.json updated/created with a single new
 *     brand-hero-pick item per tenant.
 *   - WORK-LOG.md gets 9 audit lines via the bridge + 1 summary line here.
 *
 * Live brand-site components are NOT edited.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { generateImage } from "../lib/skills/cc-nano-banana.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(HERE, "..", "..");
const INBOX_DIR = path.join(STUDIO_ROOT, "public", "data", "inboxes");
const WORK_LOG = path.join(STUDIO_ROOT, "WORK-LOG.md");

const NOW_ISO = new Date().toISOString();
const DATE_TAG = NOW_ISO.slice(0, 10);
const GENERATED_BY = "scheduled-task workday-t17-brand-hero-heroes (T17, 13:40 EDT)";

/**
 * Per-tenant prompt set. The three variants per tenant deliberately span
 * mood: (a) calm authority, (b) data-rich, (c) human-warm. Each prompt names
 * the palette + the rendering style so the model has the constraints inline.
 */
const TENANTS = [
  {
    slug: "day14",
    display_name: "Day14",
    title_for_inbox: "Pick a hero image — Day14 core landing",
    voice_summary:
      "Editorial, confident, anti-SaaS, anti-agency. Sharp, line-driven design. Single ember-orange accent (#FF5C28) against paper (#F8F6F1) and ink (#0B0B0A). Hairline rules, near-square edges, premium builder-y feel.",
    size: "1536x1024",
    style: "photo",
    variants: [
      {
        id: "v1",
        mood: "calm authority",
        rationale:
          "Confident, premium, restraint. The hero leads on craft + ownership, not motion. One bold ember accent against paper.",
        prompt:
          "Editorial brand hero image for Day14 — a productized build studio that ships full branded business platforms (marketing site, customer portal, billing, admin app, AI chatbot) in 14 days. MOOD: calm authority. A single oversized industrial schematic drawing of a stack of layered platforms rendered in fine hairline ink linework on warm paper (#F8F6F1) — architectural blueprint feeling without any actual text labels. The composition is asymmetric and confident, with generous negative space, near-square edges, no drop shadows. A single restrained ember-orange (#FF5C28) accent appears as a thin keyline or punctuating shape — used with restraint, not as a fill. No words, no logos, no UI mockups. Photographic-quality editorial render, premium, builder-y, anti-SaaS.",
      },
      {
        id: "v2",
        mood: "data-rich",
        rationale:
          "Foregrounds the productized stack (3 SKUs, fixed price, 14-day timeline). Reads as evidence, not vibes.",
        prompt:
          "Editorial brand hero image for Day14. MOOD: data-rich. A precise top-down arrangement of small architectural diagrams — exploded views of components like a marketing site, a customer portal, a billing flow, an admin app, an AI chatbot — drawn in fine ink linework on warm paper (#F8F6F1) and arranged on an underlying 8-pt grid that is faintly visible. Components float on the grid with hairline connecting rules between them; the negative space dominates. One element — the smallest one — glows in restrained ember-orange (#FF5C28). No legible text, no logos, no real product UI. Premium editorial illustration, 1536x1024, anti-SaaS, anti-agency, builder-y. Inspiration: technical drawings, naval architecture plates, Eames furniture diagrams.",
      },
      {
        id: "v3",
        mood: "human-warm",
        rationale:
          "Same palette + voice, but reads as a person at work — softens the brand without losing the editorial spine.",
        prompt:
          "Editorial brand hero image for Day14. MOOD: human-warm. A wide overhead photograph of a single operator's workspace at golden hour: warm paper-colored desk (#F8F6F1), an open mechanical notebook with hand-drawn architecture sketches in ink, a small unbranded laptop showing only abstract ink-on-paper interface lines, a ceramic mug, a fountain pen — all arranged with generous negative space. The light is low and warm but the composition is still architectural and disciplined. One small object on the desk — a paper clip or a tag — is bright ember-orange (#FF5C28), the only saturated color in the frame. No visible text, no logos, no real product. 1536x1024. Premium magazine-feature photography style, confident, restrained.",
      },
    ],
  },
  {
    slug: "day14-realty",
    display_name: "Day14 Realty",
    title_for_inbox: "Pick a hero image — Day14 Realty landing",
    voice_summary:
      "Operator voice — real records, not vibes. SW Florida county feeds (Collier, Lee, Charlotte, Sarasota, Manatee). Hourly scout + transparent deal score. No broker theatre. Inherits Day14 paper/ink palette with the ember accent reserved for the deal score itself.",
    size: "1536x1024",
    style: "photo",
    variants: [
      {
        id: "v1",
        mood: "calm authority",
        rationale:
          "Reads like a primary-source record. Foregrounds 'we work from the deed, not the MLS.'",
        prompt:
          "Editorial brand hero image for Day14 Realty — a Southwest Florida real estate intelligence brand that scores deals hourly from real county property records. MOOD: calm authority. A still-life overhead photograph of a manila county property record folder, slightly weathered, a corner of a hand-marked parcel map visible, a small ink stamp, a pen — laid out on warm paper (#F8F6F1) with disciplined negative space. The framing is architectural and confident, low warm light, no clutter. A single small ember-orange (#FF5C28) stamp or tag appears on the corner of the folder — the only saturated color. No legible text in the image, no logos, no broker imagery, no stock-photo houses, no smiling agents. 1536x1024, premium documentary photography, anti-broker, county-clerk-grounded.",
      },
      {
        id: "v2",
        mood: "data-rich",
        rationale:
          "The hourly scout + transparent deal score is the brand. This variant looks like the proof — five counties, parcel after parcel, every move recorded.",
        prompt:
          "Editorial brand hero illustration for Day14 Realty. MOOD: data-rich. A top-down stylized cartographic plate of the five Southwest Florida counties — Collier, Lee, Charlotte, Sarasota, Manatee — drawn in fine hairline ink on warm paper (#F8F6F1). The map is abstract and architectural, not literal: parcels appear as a fine grid of small squares with hairline rules connecting them. A small set of those parcels — perhaps a dozen, scattered — glow in restrained ember-orange (#FF5C28), as if scored. The negative space carries weight. No county names visible, no legible text, no logos. Inspired by old USGS plates, naval-architecture drawings, and editorial financial graphics. 1536x1024, premium editorial illustration, operator-grade.",
      },
      {
        id: "v3",
        mood: "human-warm",
        rationale:
          "Reads as a person reviewing real records — softens the brand without slipping into broker theatre.",
        prompt:
          "Editorial brand hero photograph for Day14 Realty. MOOD: human-warm. A close, slightly-angled overhead view of a single operator's hands (no face) working through a stack of printed county parcel reports on a warm paper-colored desk (#F8F6F1) at low warm late-afternoon light. A felt-tip pen rests on a marked-up page. One small tab on the corner of a page glows ember-orange (#FF5C28) — the only saturated color in the frame. The vibe is calm, disciplined, evidence-grade — not a 'real estate agent' photograph, not a smiling broker, not a 'dream home.' 1536x1024, magazine documentary photography, anti-broker, premium.",
      },
    ],
  },
  {
    slug: "alignmd",
    display_name: "AlignMD",
    title_for_inbox: "Pick a hero image — AlignMD landing",
    voice_summary:
      "Precise, healthcare-professional, credential-aware. Concrete on the role types (NP/PA/MD/DO/CRNA/PT/OT/SLP) and compact-license logic. Leads with rules + verification, not vibes. Clean clinical palette — soft warm whites, deep ink, a calm cyan or warm coral accent (not the Day14 ember).",
    size: "1536x1024",
    style: "photo",
    variants: [
      {
        id: "v1",
        mood: "calm authority",
        rationale:
          "Reads as the credential layer — the brand's actual moat. Disciplined and quiet, not staffing-agency.",
        prompt:
          "Editorial brand hero image for AlignMD — a credential-aware healthcare staffing platform that matches clinicians (NP, PA, MD, DO, CRNA, PT, OT, SLP) to facility roles using a transparent, rule-based match score. MOOD: calm authority. A still-life overhead photograph of a clean clinical desk in soft warm-white light: a stack of fanned-out license cards (blank, no real names or numbers, no legible text), a small magnifying loupe, a fountain pen, a single sealed envelope. Disciplined negative space, near-square edges, no drop shadows. Color palette: soft warm-white (#F7F5F2), deep ink (#0B1220), and a single restrained warm-coral accent (#E26D5A) on one small object (a tag or seal). No visible text, no logos, no stock-medical imagery (no stethoscopes, no smiling doctors). 1536x1024, premium documentary photography, credential-grade.",
      },
      {
        id: "v2",
        mood: "data-rich",
        rationale:
          "Foregrounds the match engine + the compact-license + expiration-tracking logic that the category usually fudges.",
        prompt:
          "Editorial brand hero illustration for AlignMD. MOOD: data-rich. A top-down architectural diagram of a credential-match engine, rendered in fine hairline ink on soft warm-white (#F7F5F2). Eight small numbered cards represent the role classes (NP, PA, MD, DO, CRNA, PT, OT, SLP) without showing the letters — they are arranged on an 8-pt grid with hairline connecting rules to a central ranked-shortlist column. A few of the connecting rules glow restrained warm-coral (#E26D5A). The negative space dominates. No legible text, no logos, no real product UI. Inspired by editorial financial diagrams, US census plates, and Swiss medical infographics. 1536x1024, premium editorial illustration, rules-first.",
      },
      {
        id: "v3",
        mood: "human-warm",
        rationale:
          "Anchors the brand in the clinician — the actual person behind the credentials — without slipping into staffing-agency cliche.",
        prompt:
          "Editorial brand hero photograph for AlignMD. MOOD: human-warm. A close, candid overhead view of a single clinician's hands (no face, no scrubs branding) signing a clean unbranded document on a soft warm-white desk (#F7F5F2) in low natural light. A laminated credential tag rests beside it (no legible text, no real names). One small element — the tag's lanyard clip or the corner of the seal — is warm coral (#E26D5A), the only saturated color. The frame is calm and architectural; this is NOT a stock 'doctor smiling at camera' photo. 1536x1024, premium documentary photography, human-warm, credential-grounded.",
      },
    ],
  },
];

async function readInbox(slug) {
  const file = path.join(INBOX_DIR, `${slug}.json`);
  if (!existsSync(file)) {
    return {
      file,
      data: {
        schema_version: 1,
        tenant: slug,
        generated_at: NOW_ISO,
        generated_by: GENERATED_BY,
        items: [],
      },
    };
  }
  const raw = await fs.readFile(file, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data.items)) data.items = [];
  return { file, data };
}

async function writeInbox(file, data) {
  data.generated_at = NOW_ISO;
  // Preserve the original generated_by if it's already set; T17 doesn't claim
  // authorship of the whole file, only the new card it appended.
  if (!data.generated_by) data.generated_by = GENERATED_BY;
  await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function appendWorkLog(line) {
  try {
    await fs.appendFile(WORK_LOG, line.endsWith("\n") ? line : line + "\n", "utf8");
  } catch {
    /* non-fatal */
  }
}

async function main() {
  await fs.mkdir(INBOX_DIR, { recursive: true });

  const summary = { tenants: [], total_candidates: 0, total_real: 0, total_placeholder: 0 };

  for (const tenant of TENANTS) {
    const candidates = [];

    for (const variant of tenant.variants) {
      const res = await generateImage({
        prompt: variant.prompt,
        size: tenant.size,
        style: tenant.style,
        tenant: tenant.slug,
      });

      // Store the path RELATIVE to the studio root so the inbox card is portable.
      const relPath = res.path
        ? path.relative(STUDIO_ROOT, res.path).split(path.sep).join("/")
        : "";

      candidates.push({
        id: variant.id,
        mood: variant.mood,
        rationale: variant.rationale,
        prompt: variant.prompt,
        requested_size: tenant.size,
        requested_style: tenant.style,
        generatedPath: relPath,
        is_placeholder: !res.ok,
        gen_reason: res.reason || (res.ok ? "ok" : "unknown"),
        cached: !!res.cached,
      });

      if (res.ok) summary.total_real += 1;
      else summary.total_placeholder += 1;
      summary.total_candidates += 1;
    }

    const { file, data } = await readInbox(tenant.slug);
    const cardId = `inbox-${tenant.slug}-${DATE_TAG}-brand-hero-pick`;

    // De-dupe: if the same card id is already present (re-run within day), replace it.
    const existingIdx = data.items.findIndex((it) => it && it.id === cardId);
    const card = {
      id: cardId,
      kind: "brand-hero-pick",
      tenant: tenant.slug,
      tags: [tenant.slug, "brand-hero", "T17"],
      title: tenant.title_for_inbox,
      summary: `Three brand-hero candidates generated by cc-nano-banana for ${tenant.display_name}, one per mood (calm authority / data-rich / human-warm). ${
        summary.total_real === 0 ? "GEMINI_API_KEY missing — all three are placeholder cards at the cached path; re-run after setting the key to populate real PNGs at the same paths." : "Real images written where possible; any placeholders are flagged per-candidate."
      } Sign-off required — nothing was auto-applied to the live brand site.`,
      voice_notes: tenant.voice_summary,
      candidates,
      created_at: NOW_ISO,
      status: "awaiting-jack",
      priority: "medium",
      auto_apply_to_landing: false,
    };

    if (existingIdx >= 0) data.items[existingIdx] = card;
    else data.items.push(card);

    await writeInbox(file, data);

    summary.tenants.push({
      slug: tenant.slug,
      file: path.relative(STUDIO_ROOT, file),
      candidate_count: candidates.length,
      placeholder_count: candidates.filter((c) => c.is_placeholder).length,
    });
  }

  await appendWorkLog(
    `${NOW_ISO} workday-t17 brand-hero-heroes tenants=${summary.tenants
      .map((t) => t.slug)
      .join(",")} candidates=${summary.total_candidates} real=${summary.total_real} placeholder=${summary.total_placeholder}`,
  );

  // Emit a structured report on stdout — keeps the scheduled-task report deterministic.
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
}

main().catch((err) => {
  console.error("t17-brand-heroes failed:", err);
  process.exitCode = 1;
});
