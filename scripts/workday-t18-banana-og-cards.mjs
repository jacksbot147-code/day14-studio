#!/usr/bin/env node
/**
 * scripts/workday-t18-banana-og-cards.mjs
 *
 * Day14 Workday T18 (14:00 EDT, 2026-05-28).
 *
 * Goal: generate 1200x630 Open Graph / social cards for:
 *   - /work-with-us (single deterministic file: public/og/work-with-us.png)
 *   - the 6 Life Loophole article drafts synthesized in T16
 *     (public/og/life-loophole/<draftId>.png)
 *
 * Prompts:
 *   - /work-with-us: built from the live HERO headline + subhead in
 *     src/app/work-with-us/page.tsx (read by hand into PROMPT_WWU below;
 *     copy is in the script as a hard-coded mirror so this task does not
 *     need to import the page module). Source line numbers cited in the
 *     report for auditability.
 *   - Each loophole draft: title + intro from the T16 synthesized DRAFTS
 *     list, kept byte-identical so cache keys roll over consistently.
 *
 * After generating into the cc-nano-banana cache, we copy each image to
 * its static `public/og/...` landing spot (the cache lives in
 * `public/data/cache/banana/` and is keyed by hash; static OG URLs need a
 * predictable path Next/social-crawlers can fetch).
 *
 * Metadata wiring (Step 4 of the task brief):
 *   - /work-with-us: edits the existing `export const metadata` block to
 *     add `openGraph.images` + `twitter.images` pointing at
 *     "/og/work-with-us.png". Done out-of-band by Edit, not by this
 *     script (the script reports the absolute path so the wiring step
 *     can be verified after the fact).
 *   - Loophole drafts: the article MDX/pages do NOT yet exist on disk
 *     (per T16's note). To honor "metadata wired but page copy
 *     untouched", this task writes a JSON manifest at
 *     `public/data/sites/life-loophole/og-images.json` mapping draftId
 *     -> OG image path. When the drafts are materialized in a later
 *     run, the materializer can read this manifest and drop
 *     `openGraph.images` into the frontmatter automatically. No body
 *     copy is written.
 *
 * Constraints honored:
 *   - hot-flash-co + kennum-lawn-care excluded (this script touches
 *     only /work-with-us and life-loophole; no hot-flash/kennum
 *     references appear).
 *   - Never push, never delete. We only WRITE to public/og/... and the
 *     manifest, and we APPEND a single line per generation to
 *     WORK-LOG.md via the cc-nano-banana bridge.
 *   - Idempotent: re-running with the same prompts hits the bridge
 *     cache and just re-copies the same bytes to public/og/...
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateImage } from "./lib/skills/cc-nano-banana.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(HERE, "..");
const PUBLIC_DIR = path.join(STUDIO_ROOT, "public");
const OG_DIR = path.join(PUBLIC_DIR, "og");
const OG_LOOPHOLE_DIR = path.join(OG_DIR, "life-loophole");
const SITE_DATA_DIR = path.join(PUBLIC_DIR, "data", "sites", "life-loophole");
const OG_MANIFEST = path.join(SITE_DATA_DIR, "og-images.json");

const OG_SIZE = "1200x630";
const OG_STYLE = "illustration";
const STYLE_CONSTRAINT =
  "editorial open-graph social card, 1200x630 landscape, clean composition, brand-tealwarm palette, generous negative space, no text overlays";

// -----------------------------------------------------------------------
// /work-with-us — mirror of HERO copy in src/app/work-with-us/page.tsx
// (TITLE/DESCRIPTION block at lines 7-8, HERO heading + subhead at lines
//  51-60). Kept verbatim so prompt cache keys are stable.
// -----------------------------------------------------------------------

const WWU = {
  headline:
    "Hire Day14 to build your business — not a project.",
  subhead:
    "Day14 ships full-stack business platforms on a Next.js core with an autonomous-agent layer baked in. Marketing site, customer portal, billing, admin, AI agents — multi-tenant from day one, owned by you on day fourteen.",
  outName: "work-with-us.png",
  sourceFile: "src/app/work-with-us/page.tsx",
};

function buildWwuPrompt() {
  return `${WWU.headline} ${WWU.subhead} Style: ${STYLE_CONSTRAINT}.`;
}

// -----------------------------------------------------------------------
// 6 Life Loophole drafts — IDENTICAL to T16 to keep the inbox + OG cards
// in sync. Do not edit one without the other.
// -----------------------------------------------------------------------

const DRAFTS = [
  {
    draftId: "ll-2026-05-28-001-hsa-contribution",
    catalogId: "hsa-contribution",
    title: "The HSA is the only triple-tax-advantaged account in the code",
    intro:
      "If you have a qualifying high-deductible health plan, money you put in a Health Savings Account is the only kind of money the IRS gives you three breaks on — your contribution comes off taxable income, the balance grows tax-free, and qualified medical withdrawals are tax-free. Plain English: every dollar in does work three times.",
  },
  {
    draftId: "ll-2026-05-28-002-traditional-ira",
    catalogId: "traditional-ira-deduction",
    title: "The Traditional IRA deduction: a quiet line on Schedule 1 that pays for itself",
    intro:
      "A traditional IRA is a personal retirement account whose contribution can be subtracted from your taxable income this year if you qualify. The money then grows tax-deferred until retirement. Whether the deduction is full, partial, or zero depends on your income and whether you (or a spouse) have a workplace plan — and the thresholds move every year.",
  },
  {
    draftId: "ll-2026-05-28-003-roth-ira",
    catalogId: "roth-ira-contribution",
    title: "The Roth IRA trade: no break today, every break later",
    intro:
      "A Roth IRA does not give you a deduction this year. What it gives you is a future where the entire account — contributions plus decades of growth — comes out tax-free at retirement, provided you meet the qualified-withdrawal rules. It is especially valuable if you expect to be in the same or a higher tax bracket later, and contributions can be pulled back without penalty.",
  },
  {
    draftId: "ll-2026-05-28-004-employer-401k",
    catalogId: "employer-401k-contribution",
    title: "Workplace 401(k): the only loophole your employer pays you to use",
    intro:
      "A 401(k) (or 403(b) for nonprofit and public employees) lets you direct part of your paycheck into a retirement account before income tax is calculated, lowering your taxable wages for the year. Many employers also match a portion of what you contribute — that match is essentially free compensation that disappears if you do not enroll.",
  },
  {
    draftId: "ll-2026-05-28-005-child-tax-credit",
    catalogId: "child-tax-credit",
    title: "The Child Tax Credit, decoded: who qualifies and what's refundable",
    intro:
      "The Child Tax Credit reduces your tax bill for each qualifying child under the age threshold, and a portion may be refundable through the Additional Child Tax Credit — meaning families can receive value even if it exceeds the tax they owe. The per-child amount, age limit, and phase-out thresholds are set by law and have changed several times, so the rule for the year matters.",
  },
  {
    draftId: "ll-2026-05-28-006-education-credits",
    catalogId: "education-credits",
    title: "Two education credits, one tuition bill: how to pick AOTC vs Lifetime Learning",
    intro:
      "Two credits reward spending on higher education. The American Opportunity Tax Credit applies to the first several years of undergraduate study, is partly refundable, and is generally the more generous of the two. The Lifetime Learning Credit is broader — undergraduate, graduate, and job-skill courses with no year limit — but is non-refundable and smaller. You cannot claim both for the same student in the same year.",
  },
];

function buildLoopholePrompt(draft) {
  return `OG card for: ${draft.title}. ${draft.intro} Style: ${STYLE_CONSTRAINT}.`;
}

// -----------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------

function isoNow() {
  return new Date().toISOString();
}

function relFromStudio(absPath) {
  return path.relative(STUDIO_ROOT, absPath).split(path.sep).join("/");
}

function publicUrlFor(absPath) {
  const rel = path.relative(PUBLIC_DIR, absPath).split(path.sep).join("/");
  return `/${rel}`;
}

async function copyIfChanged(srcAbs, destAbs) {
  await fs.mkdir(path.dirname(destAbs), { recursive: true });
  await fs.copyFile(srcAbs, destAbs);
}

// -----------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------

async function main() {
  await fs.mkdir(OG_DIR, { recursive: true });
  await fs.mkdir(OG_LOOPHOLE_DIR, { recursive: true });
  await fs.mkdir(SITE_DATA_DIR, { recursive: true });

  let realCount = 0;
  let placeholderCount = 0;
  const generated = [];

  // ----- /work-with-us -----
  {
    const prompt = buildWwuPrompt();
    const result = await generateImage({
      prompt,
      size: OG_SIZE,
      style: OG_STYLE,
      tenant: "day14",
    });
    const destAbs = path.join(OG_DIR, WWU.outName);
    if (result.path) {
      await copyIfChanged(result.path, destAbs);
    }
    const isReal = Boolean(result.ok && !result.reason);
    if (isReal) realCount += 1;
    else placeholderCount += 1;
    generated.push({
      kind: "work-with-us",
      target: WWU.sourceFile,
      cache_path: result.path ? relFromStudio(result.path) : "",
      dest_path: relFromStudio(destAbs),
      public_url: publicUrlFor(destAbs),
      is_placeholder: !isReal,
      cached: Boolean(result.cached),
      gen_reason: result.reason || null,
      prompt,
    });
  }

  // ----- 6 loophole drafts -----
  const loopholeEntries = [];
  for (const draft of DRAFTS) {
    const prompt = buildLoopholePrompt(draft);
    const result = await generateImage({
      prompt,
      size: OG_SIZE,
      style: OG_STYLE,
      tenant: "life-loophole",
    });
    const destAbs = path.join(OG_LOOPHOLE_DIR, `${draft.draftId}.png`);
    if (result.path) {
      await copyIfChanged(result.path, destAbs);
    }
    const isReal = Boolean(result.ok && !result.reason);
    if (isReal) realCount += 1;
    else placeholderCount += 1;

    const entry = {
      draftId: draft.draftId,
      catalogId: draft.catalogId,
      title: draft.title,
      cache_path: result.path ? relFromStudio(result.path) : "",
      dest_path: relFromStudio(destAbs),
      public_url: publicUrlFor(destAbs),
      is_placeholder: !isReal,
      cached: Boolean(result.cached),
      gen_reason: result.reason || null,
      prompt,
    };
    loopholeEntries.push(entry);
    generated.push({ kind: "life-loophole-draft", ...entry });
  }

  // ----- write the loophole OG manifest -----
  const manifest = {
    schema_version: 1,
    tenant: "life-loophole",
    generated_at: isoNow(),
    generated_by:
      "scheduled-task workday-t18-banana-og-cards — generateImage() via cc-nano-banana bridge",
    notes: [
      "OG cards for the 6 synthesized Life Loophole drafts (mirrors T16 DRAFTS list).",
      "Article MDX/body is NOT modified by this task — manifest only.",
      "Each public_url is the path a future draft materializer should drop into the page's `export const metadata.openGraph.images` block (or MDX frontmatter `openGraph.images`).",
      "Size: 1200x630.",
    ],
    size: OG_SIZE,
    style: OG_STYLE,
    items: loopholeEntries,
  };
  await fs.writeFile(OG_MANIFEST, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const report = {
    og_cards_generated: generated.length,
    real_images: realCount,
    placeholders: placeholderCount,
    work_with_us_path: generated[0]?.dest_path || "",
    loophole_manifest: relFromStudio(OG_MANIFEST),
    items: generated.map((g) => ({
      kind: g.kind,
      dest_path: g.dest_path,
      public_url: g.public_url,
      is_placeholder: g.is_placeholder,
      cached: g.cached,
    })),
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("workday-t18-banana-og-cards failed:", err);
  process.exit(1);
});
