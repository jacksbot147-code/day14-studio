#!/usr/bin/env node
/**
 * scripts/workday-t16-banana-loophole-heroes.mjs
 *
 * Day14 Workday T16 (13:20 EDT, 2026-05-28).
 *
 * Goal: generate one hero image per Life Loophole article draft, write
 * inbox approval cards (tag: life-loophole, kind: "hero-image-pick").
 * No MDX/body insertion — inbox cards only.
 *
 * The materialized draft files (T3 + T8 outputs) do not yet exist on
 * disk at run time, so this task synthesizes 6 representative drafts
 * from the sourced Life Loophole catalog
 * (src/app/brands/life-loophole/catalog.ts). The picks below cover the
 * broadest-appeal entries — HSA, Traditional IRA, Roth IRA, 401(k),
 * Child Tax Credit, Education Credits — which align with the brand's
 * "every loophole legal & sourced" thesis. Each synthesized draft has
 * a stable `draftId` so downstream re-runs are idempotent.
 *
 * Constraints honored:
 * - No article MDX/body is touched.
 * - hot-flash-co + kennum-lawn-care are excluded (not relevant here;
 *   only life-loophole drafts are processed).
 * - Never push, never delete.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { generateImage } from "./lib/skills/cc-nano-banana.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// scripts/<this file> -> studio root is one dir up.
const STUDIO_ROOT = path.resolve(HERE, "..");
const INBOX_DIR = path.join(STUDIO_ROOT, "public", "data", "inboxes");
const INBOX_FILE = path.join(INBOX_DIR, "life-loophole.json");

// -----------------------------------------------------------------------
// Synthesized drafts (sourced from CATALOG entries; not materialized to
// disk because content/life-loophole/drafts/ doesn't exist yet).
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

// -----------------------------------------------------------------------
// Prompt builder (style-constrained per task brief)
// -----------------------------------------------------------------------

const STYLE_CONSTRAINT =
  "editorial illustration, clean, brand-tealwarm palette, no text";

function buildPrompt(draft) {
  return `${draft.title}. ${draft.intro} Style: ${STYLE_CONSTRAINT}.`;
}

// -----------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------

function isoNow() {
  return new Date().toISOString();
}

function relFromStudio(absPath) {
  return path.relative(STUDIO_ROOT, absPath).split(path.sep).join("/");
}

async function main() {
  await fs.mkdir(INBOX_DIR, { recursive: true });

  const items = [];
  let realCount = 0;
  let placeholderCount = 0;

  for (const draft of DRAFTS) {
    const prompt = buildPrompt(draft);
    const result = await generateImage({
      prompt,
      size: "1536x1024",
      style: "illustration",
      tenant: "life-loophole",
    });

    const isReal = Boolean(result.ok && !result.reason);
    if (isReal) realCount += 1;
    else placeholderCount += 1;

    const generatedPathRel = result.path
      ? relFromStudio(result.path)
      : "";

    items.push({
      id: `inbox-life-loophole-2026-05-28-hero-${draft.draftId}`,
      kind: "hero-image-pick",
      tenant: "life-loophole",
      tags: ["life-loophole"],
      title: `Pick a hero image — ${draft.title}`,
      summary: result.ok
        ? `Generated hero candidate for draft \`${draft.draftId}\`. ${result.cached ? "Cache hit." : "Fresh generation."} Not inserted into MDX — inbox card only.`
        : `Placeholder hero card written for draft \`${draft.draftId}\` (reason: ${result.reason || "unknown"}). Set GEMINI_API_KEY and re-run to get a real image at the same cache path.`,
      draftId: draft.draftId,
      catalogId: draft.catalogId,
      generatedPath: generatedPathRel,
      prompt,
      style_constraint: STYLE_CONSTRAINT,
      requested_size: "1536x1024",
      requested_style: "illustration",
      is_placeholder: !isReal,
      gen_reason: result.reason || null,
      cached: Boolean(result.cached),
      created_at: isoNow(),
      status: "awaiting-jack",
      priority: "medium",
      auto_insert_into_mdx: false,
    });
  }

  const payload = {
    schema_version: 1,
    tenant: "life-loophole",
    generated_at: isoNow(),
    generated_by:
      "scheduled-task workday-t16-banana-loophole-heroes — generateImage() via cc-nano-banana bridge",
    notes: [
      "Drafts synthesized from src/app/brands/life-loophole/catalog.ts because content/life-loophole/drafts/ is not yet materialized on disk.",
      "Article MDX/body is NOT modified by this task — inbox cards only.",
      "Each generatedPath is relative to the studio repo root.",
      "Placeholder cards (is_placeholder=true) appear when GEMINI_API_KEY is unset; cache path is stable so re-running with the key drops in the real image at the same location.",
    ],
    items,
  };

  await fs.writeFile(INBOX_FILE, JSON.stringify(payload, null, 2) + "\n", "utf8");

  // Stdout report (consumed by the scheduled-task runner).
  const report = {
    drafts_processed: DRAFTS.length,
    real_images: realCount,
    placeholders: placeholderCount,
    inbox_items_created: items.length,
    inbox_file: relFromStudio(INBOX_FILE),
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("workday-t16-banana-loophole-heroes failed:", err);
  process.exit(1);
});
