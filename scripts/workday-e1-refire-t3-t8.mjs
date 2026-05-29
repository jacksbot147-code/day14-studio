#!/usr/bin/env node
/**
 * scripts/workday-e1-refire-t3-t8.mjs
 *
 * Day14 evening-extension E1 (2026-05-28 18:00 EDT). Re-fires T3 + T8
 * which both whiffed because the draft materializer never wrote
 * `content/life-loophole/drafts/`.
 *
 * Steps:
 *   1. Resolve the canonical 6 Life Loophole drafts from
 *      src/app/brands/life-loophole/catalog.ts (the same 6 the T16
 *      hero-image task already picked, so IDs/slugs are stable across
 *      runs).
 *   2. Materialize each one via lib/draft-writer.materializeDraft(),
 *      which gates the body through stripSlop() — that single chokepoint
 *      satisfies T3.
 *   3. Run invokeMarketingSkill on each draft to get 3 headline
 *      variants. With no ANTHROPIC_API_KEY in env, gracefully fall
 *      back to a `[needs-API-key]` placeholder variant set so the
 *      JSON shape is stable; downstream picker UI works either way.
 *   4. Write <slug>.variants.json next to each draft.
 *   5. Append 6 inbox items kind="headline-pick" to
 *      public/data/inboxes/life-loophole.json.
 *   6. Append a `## 2026-05-28 18:00 — E1 T3+T8 refire` section to
 *      WORK-LOG.md with counts and per-draft removal numbers.
 *
 * Constraints honored:
 *   - inbox-only (no publish).
 *   - hot-flash + kennum excluded (irrelevant — life-loophole only).
 *   - no push, no delete.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { materializeDraft, draftPath } from "./lib/draft-writer.mjs";
import { invokeMarketingSkill } from "./lib/skills/marketing-skills.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(HERE, "..");
const INBOX_FILE = path.join(STUDIO_ROOT, "public", "data", "inboxes", "life-loophole.json");
const WORK_LOG = path.join(STUDIO_ROOT, "WORK-LOG.md");

const RUN_TIMESTAMP = new Date().toISOString();
const RUN_LABEL = "2026-05-28 18:00 — E1 T3+T8 refire";

// ----------------------------------------------------------------------
// The 6 canonical drafts. Bodies pulled directly from catalog.ts so the
// content matches what T16 already exposed. Kept inline here (rather
// than imported from the TS catalog) because this script is .mjs and
// the catalog is a .ts module — duplicating the 6 entries is cheaper
// than wiring a TS compile step into the workday runner.
// ----------------------------------------------------------------------

const DRAFTS = [
  {
    draftId: "ll-2026-05-28-001-hsa-contribution",
    slug: "hsa-triple-tax-advantage",
    catalogId: "hsa-contribution",
    title: "The HSA is the only triple-tax-advantaged account in the code",
    personas: ["individuals-families", "freelancers-creators"],
    summary:
      "If you have a qualifying high-deductible health plan, money you put in an HSA is deducted from your taxable income.",
    intro:
      "If you have a qualifying high-deductible health plan, money you put in a Health Savings Account is the only kind of money the IRS gives you three breaks on — your contribution comes off taxable income, the balance grows tax-free, and qualified medical withdrawals are tax-free. Plain English: every dollar in does work three times.",
    explanation:
      "An HSA is basically the only account that is tax-advantaged three ways: contributions reduce your taxable income, the balance grows tax-free, and withdrawals for qualified medical expenses are tax-free. It is available only to people covered by an IRS-qualifying high-deductible health plan. Unspent money rolls over year to year and the account is yours to keep if you change jobs or plans. It's worth noting that the HSA is essentially a stealth retirement account too.",
    eligibility:
      "Must be covered by an HSA-qualifying high-deductible health plan, not enrolled in Medicare, and not claimed as a dependent on someone else's return.",
    estimated_impact:
      "Reducing taxable income by the annual contribution limit could lower a federal tax bill by roughly a few hundred to a couple thousand dollars depending on your bracket.",
    action_steps:
      "Confirm your health plan qualifies as an HSA-eligible high-deductible plan, open an HSA with a bank or brokerage, contribute up to the annual limit before the filing deadline, and report the contribution on Form 8889.",
    source: "IRS Publication 969; Form 8889; IRC Section 223",
    current_as_of: "2026",
    professional_needed: false,
    complexity: "low",
    risk_level: "low",
  },
  {
    draftId: "ll-2026-05-28-002-traditional-ira",
    slug: "traditional-ira-deduction",
    catalogId: "traditional-ira-deduction",
    title: "The Traditional IRA deduction: a quiet line on Schedule 1 that pays for itself",
    personas: ["individuals-families", "freelancers-creators"],
    summary:
      "Contributions to a traditional IRA may be deducted from your taxable income, lowering this year's tax bill.",
    intro:
      "A traditional IRA is a personal retirement account whose contribution can be subtracted from your taxable income this year if you qualify. The money then grows tax-deferred until retirement. Whether the deduction is full, partial, or zero depends on your income and whether you (or a spouse) have a workplace plan — and the thresholds move every year.",
    explanation:
      "A traditional IRA is a personal retirement account. If you qualify, the amount you contribute is subtracted from your taxable income for the year, and the money grows tax-deferred until you withdraw it in retirement. Whether the contribution is fully deductible, partly deductible, or not deductible depends on your income and whether you (or a spouse) are covered by a workplace retirement plan. People age 50 and over may make an additional catch-up contribution. Furthermore, the deduction phase-out thresholds shift annually.",
    eligibility:
      "Must have earned income (wages or self-employment income) for the year. Deductibility phases out at higher incomes if you or your spouse are covered by a workplace retirement plan; income thresholds change annually and must be verified against current IRS guidance.",
    estimated_impact:
      "Deducting a full annual contribution could reduce a federal tax bill by roughly a few hundred to a couple thousand dollars, scaling with your marginal tax bracket.",
    action_steps:
      "Open a traditional IRA with a brokerage, contribute up to the annual limit before the filing deadline, confirm your deduction eligibility given your income and workplace-plan coverage, and report the deduction on Schedule 1 of Form 1040.",
    source: "IRS Publication 590-A; IRC Section 219; Schedule 1 (Form 1040)",
    current_as_of: "2026",
    professional_needed: false,
    complexity: "low",
    risk_level: "low",
  },
  {
    draftId: "ll-2026-05-28-003-roth-ira",
    slug: "roth-ira-tradeoff",
    catalogId: "roth-ira-contribution",
    title: "The Roth IRA trade: no break today, every break later",
    personas: ["individuals-families", "freelancers-creators"],
    summary:
      "A Roth IRA is funded with after-tax money, but qualified withdrawals in retirement — including all the growth — come out completely tax-free.",
    intro:
      "A Roth IRA does not give you a deduction this year. What it gives you is a future where the entire account — contributions plus decades of growth — comes out tax-free at retirement, provided you meet the qualified-withdrawal rules. It is especially valuable if you expect to be in the same or a higher tax bracket later, and contributions can be pulled back without penalty.",
    explanation:
      "A Roth IRA does not give you a deduction today. Instead it locks in tax-free treatment for the future: the account grows with no tax, and qualified withdrawals in retirement are entirely tax-free. It is especially valuable if you expect to be in the same or a higher tax bracket later, and contributions (though not earnings) can generally be withdrawn at any time without tax or penalty. Eligibility to contribute directly phases out above certain income levels.",
    eligibility:
      "Must have earned income. The ability to contribute directly phases out above income limits that change annually and must be verified against current IRS guidance; higher earners may instead use the backdoor Roth approach (see separate entry).",
    estimated_impact:
      "There is no current-year deduction, but decades of tax-free growth could be worth thousands to tens of thousands of dollars in avoided future tax depending on contributions and time horizon.",
    action_steps:
      "Confirm your income is within the direct-contribution range, open a Roth IRA, and contribute up to the annual limit before the filing deadline. No tax form is needed for a standard contribution, but keep records of basis.",
    source: "IRS Publication 590-A; IRC Section 408A",
    current_as_of: "2026",
    professional_needed: false,
    complexity: "low",
    risk_level: "low",
  },
  {
    draftId: "ll-2026-05-28-004-employer-401k",
    slug: "workplace-401k-match",
    catalogId: "employer-401k-contribution",
    title: "Workplace 401(k): the only loophole your employer pays you to use",
    personas: ["individuals-families"],
    summary:
      "Pre-tax contributions to a workplace 401(k) or 403(b) come straight off your taxable wages, and an employer match is additional compensation you would otherwise leave on the table.",
    intro:
      "A 401(k) (or 403(b) for nonprofit and public employees) lets you direct part of your paycheck into a retirement account before income tax is calculated, lowering your taxable wages for the year. Many employers also match a portion of what you contribute — that match is essentially free compensation that disappears if you do not enroll.",
    explanation:
      "A 401(k) (or 403(b) for nonprofit and public employees) lets you direct part of your paycheck into a retirement account before income tax is calculated, lowering your taxable wages for the year. Many employers also match a portion of what you contribute — that match is essentially free compensation. Plans typically also offer a Roth 401(k) option, which is funded with after-tax dollars for tax-free qualified withdrawals later. Workers age 50 and over may make additional catch-up contributions.",
    eligibility:
      "Must be an employee whose employer offers a 401(k), 403(b), or similar plan. Contribution limits and catch-up amounts change annually and must be verified against current IRS guidance.",
    estimated_impact:
      "Contributing pre-tax could lower a federal tax bill by roughly several hundred to several thousand dollars depending on the amount and bracket; capturing a full employer match could add a meaningful percentage of salary on top of that.",
    action_steps:
      "Enroll through your employer's benefits portal, set a contribution rate at least high enough to capture the full employer match, and choose between pre-tax and Roth treatment based on your situation.",
    source: "IRC Section 401(k); IRS Publication 525; IRS Topic No. 424",
    current_as_of: "2026",
    professional_needed: false,
    complexity: "low",
    risk_level: "low",
  },
  {
    draftId: "ll-2026-05-28-005-child-tax-credit",
    slug: "child-tax-credit-decoded",
    catalogId: "child-tax-credit",
    title: "The Child Tax Credit, decoded: who qualifies and what's refundable",
    personas: ["individuals-families"],
    summary:
      "Families with qualifying children can claim a per-child credit that directly reduces tax owed, with part of it potentially refundable.",
    intro:
      "The Child Tax Credit reduces your tax bill for each qualifying child under the age threshold, and a portion may be refundable through the Additional Child Tax Credit — meaning families can receive value even if it exceeds the tax they owe. The per-child amount, age limit, and phase-out thresholds are set by law and have changed several times, so the rule for the year matters.",
    explanation:
      "The Child Tax Credit reduces your tax bill for each qualifying child under the age threshold. A portion may be refundable through the Additional Child Tax Credit, meaning families can receive value even if it exceeds the tax they owe. The credit amount and the income level at which it begins to phase out are set by law and have changed several times; the per-child amount, age limit, and phase-out thresholds must be verified against current IRS guidance for the tax year.",
    eligibility:
      "Must have a qualifying child who meets the IRS relationship, age, residency, support, and Social Security number tests, and your income must be at or below the phase-out thresholds for your filing status.",
    estimated_impact:
      "For families with children, the credit could be worth roughly a few hundred to a couple thousand dollars per qualifying child; verify the current per-child amount.",
    action_steps:
      "Confirm each child meets the qualifying-child tests, ensure each has a valid Social Security number, and claim the credit using Schedule 8812 with your Form 1040.",
    source: "IRC Section 24; Schedule 8812 (Form 1040)",
    current_as_of: "2026",
    professional_needed: false,
    complexity: "low",
    risk_level: "low",
  },
  {
    draftId: "ll-2026-05-28-006-education-credits",
    slug: "education-credits-aotc-vs-llc",
    catalogId: "education-credits",
    title: "Two education credits, one tuition bill: how to pick AOTC vs Lifetime Learning",
    personas: ["individuals-families", "freelancers-creators"],
    summary:
      "Tuition and related costs can translate into a tax credit through either the American Opportunity Credit or the Lifetime Learning Credit.",
    intro:
      "Two credits reward spending on higher education. The American Opportunity Tax Credit applies to the first several years of undergraduate study, is partly refundable, and is generally the more generous of the two. The Lifetime Learning Credit is broader — undergraduate, graduate, and job-skill courses with no year limit — but is non-refundable and smaller. You cannot claim both for the same student in the same year.",
    explanation:
      "Two credits reward spending on higher education. The American Opportunity Tax Credit applies to the first several years of undergraduate study, is partly refundable, and is generally the more generous of the two. The Lifetime Learning Credit is broader — it covers undergraduate, graduate, and job-skill courses with no year limit — but is non-refundable and smaller. You cannot claim both for the same student in the same year, and both phase out at higher incomes. The school reports qualifying tuition on Form 1098-T.",
    eligibility:
      "Must have paid qualified tuition and related expenses for an eligible student at an eligible institution, and income must be under the phase-out limits, which change annually. The American Opportunity Credit has additional rules on enrollment level and prior years claimed.",
    estimated_impact:
      "Depending on which credit applies and how much qualifying tuition was paid, the credit could be worth roughly several hundred to a couple thousand dollars.",
    action_steps:
      "Get Form 1098-T from the school, determine which credit gives the better result for each student, and claim it on Form 8863 with your Form 1040.",
    source: "IRC Section 25A; IRS Publication 970; Form 8863",
    current_as_of: "2026",
    professional_needed: false,
    complexity: "low",
    risk_level: "low",
  },
];

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function relFromStudio(absPath) {
  return path.relative(STUDIO_ROOT, absPath).split(path.sep).join("/");
}

/**
 * Wrap invokeMarketingSkill in a graceful-skip placeholder shape. The
 * underlying bridge expects { task, context }; we phrase the task as
 * a "headline-rewriter" pick so its lexical scorer will route to the
 * headline-rewriter SKILL.md if the plugin is installed.
 */
async function generateHeadlineVariants(draft) {
  const task = `headline-rewriter: produce 3 alternative headline variants for the following Life Loophole article.`;
  const context = {
    title: draft.title,
    intro: draft.intro,
    variants: 3,
    tenant: "life-loophole",
    catalogId: draft.catalogId,
  };
  let result;
  try {
    result = await invokeMarketingSkill({ task, context });
  } catch (err) {
    result = { ok: false, reason: `invokeMarketingSkill threw: ${err.message}` };
  }
  if (result.ok && typeof result.output === "string") {
    // Parse the model output into 3 variants. The bridge returns prose;
    // we accept either bullet lines, numbered lines, or paragraphs.
    const parsed = parseVariantsFromText(result.output, 3);
    if (parsed.length >= 1) {
      return {
        ok: true,
        source: result.meta?.subSkill || "marketing-skills",
        variants: parsed.slice(0, 3),
      };
    }
  }
  // Graceful-skip: placeholder shape with deterministic rationale.
  return {
    ok: false,
    reason: result.reason || "no-output",
    source: "[needs-API-key]",
    variants: buildPlaceholderVariants(draft),
  };
}

function buildPlaceholderVariants(draft) {
  // Three deterministic variant strategies the headline-rewriter skill
  // would explore. They are NOT model output — they are clearly tagged
  // as placeholders so the UI doesn't ship them as real picks.
  return [
    {
      text: `[needs-API-key] ${draft.title}`,
      rationale: "placeholder #1 — strategy: keep original (control)",
    },
    {
      text: `[needs-API-key] What ${draft.title.replace(/^The /, "the ")} really buys you`,
      rationale: "placeholder #2 — strategy: outcome-led reframe",
    },
    {
      text: `[needs-API-key] One paragraph on ${draft.catalogId.replace(/-/g, " ")}, none of the jargon`,
      rationale: "placeholder #3 — strategy: anti-jargon promise",
    },
  ];
}

function parseVariantsFromText(text, want) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const variants = [];
  for (const line of lines) {
    // Strip leading "1.", "1)", "-", "*" markers.
    const m = line.match(/^(?:[-*•]|\d+[.)])\s*(.+)$/);
    const text = (m ? m[1] : line).trim();
    if (text.length < 4) continue;
    variants.push({ text, rationale: "marketing-skills output" });
    if (variants.length >= want) break;
  }
  return variants;
}

// ----------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------

async function main() {
  const report = {
    run_label: RUN_LABEL,
    run_timestamp: RUN_TIMESTAMP,
    drafts_found_in_catalog: DRAFTS.length,
    drafts_materialized: 0,
    drafts_skipped: 0,
    total_phrases_removed_by_stripslop: 0,
    per_draft_removed_counts: [],
    variants_generated: 0,
    variants_placeholders: 0,
    variants_files_written: [],
    inbox_items_written: 0,
    inbox_file: relFromStudio(INBOX_FILE),
    drafts_dir: relFromStudio(path.join(STUDIO_ROOT, "content", "life-loophole", "drafts")),
    paths: [],
    errors: [],
  };

  // ---- 1 + 2: materialize each draft via the stripSlop-gated writer ----
  const draftResults = [];
  for (const d of DRAFTS) {
    const res = await materializeDraft(
      { ...d, materialized_at: RUN_TIMESTAMP },
      { studioRoot: STUDIO_ROOT },
    );
    if (!res.ok) {
      report.drafts_skipped += 1;
      report.errors.push(`materialize ${d.slug}: ${res.reason}`);
      continue;
    }
    report.drafts_materialized += 1;
    report.total_phrases_removed_by_stripslop += res.removedCount;
    report.per_draft_removed_counts.push({
      slug: d.slug,
      removed: res.removedCount,
      phrases: res.removed,
    });
    report.paths.push({
      kind: "draft",
      path: relFromStudio(res.path),
      bytes: res.cleanedSize,
    });
    draftResults.push({ draft: d, result: res });
  }

  // ---- 3 + 4: headline variants -> <slug>.variants.json ----
  const inboxItems = [];
  for (const { draft, result } of draftResults) {
    const variantsOut = await generateHeadlineVariants(draft);
    const variantsPayload = {
      schema_version: 1,
      draftId: draft.draftId,
      slug: draft.slug,
      catalogId: draft.catalogId,
      originalTitle: draft.title,
      source: variantsOut.source,
      ok: variantsOut.ok,
      reason: variantsOut.ok ? null : variantsOut.reason,
      generated_at: new Date().toISOString(),
      variants: variantsOut.variants.map((v) => ({
        text: v.text,
        rationale: v.rationale || "",
      })),
    };

    const variantsPath = path.join(
      STUDIO_ROOT,
      "content",
      "life-loophole",
      "drafts",
      `${draft.slug}.variants.json`,
    );
    await fs.writeFile(
      variantsPath,
      JSON.stringify(variantsPayload, null, 2) + "\n",
      "utf8",
    );
    report.variants_files_written.push(relFromStudio(variantsPath));
    if (variantsOut.ok) report.variants_generated += variantsOut.variants.length;
    else report.variants_placeholders += variantsOut.variants.length;

    const stat = await fs.stat(variantsPath);
    report.paths.push({
      kind: "variants",
      path: relFromStudio(variantsPath),
      bytes: stat.size,
    });

    // ---- 5: inbox item per draft ----
    inboxItems.push({
      id: `inbox-life-loophole-2026-05-28-headline-${draft.draftId}`,
      kind: "headline-pick",
      tenant: "life-loophole",
      tags: ["life-loophole", "headline"],
      title: `Pick a headline — ${draft.title}`,
      summary: variantsOut.ok
        ? `3 headline variants generated via marketing-skills (${variantsOut.source}). Pick one or keep original.`
        : `[needs-API-key] 3 placeholder headline variants written — set ANTHROPIC_API_KEY and re-run to get real variants from the headline-rewriter skill. (reason: ${variantsOut.reason})`,
      draftId: draft.draftId,
      catalogId: draft.catalogId,
      slug: draft.slug,
      draftPath: relFromStudio(result.path),
      variantsPath: relFromStudio(variantsPath),
      originalTitle: draft.title,
      variants: variantsPayload.variants,
      is_placeholder: !variantsOut.ok,
      created_at: new Date().toISOString(),
      status: "awaiting-jack",
      priority: "medium",
      auto_insert_into_mdx: false,
    });
  }

  // ---- 5 (cont.): append inbox items to life-loophole.json ----
  let inbox = {
    schema_version: 1,
    tenant: "life-loophole",
    generated_at: RUN_TIMESTAMP,
    notes: [],
    items: [],
  };
  try {
    const existing = await fs.readFile(INBOX_FILE, "utf8");
    inbox = JSON.parse(existing);
    if (!Array.isArray(inbox.items)) inbox.items = [];
    if (!Array.isArray(inbox.notes)) inbox.notes = [];
  } catch (err) {
    if (err.code !== "ENOENT") {
      report.errors.push(`reading inbox: ${err.message} — starting fresh`);
    }
  }
  // De-duplicate by id (idempotent re-runs).
  const existingIds = new Set(inbox.items.map((i) => i.id));
  for (const item of inboxItems) {
    if (existingIds.has(item.id)) {
      // Replace in place.
      const idx = inbox.items.findIndex((i) => i.id === item.id);
      inbox.items[idx] = item;
    } else {
      inbox.items.push(item);
      existingIds.add(item.id);
    }
  }
  inbox.notes.push(
    `${RUN_LABEL}: added ${inboxItems.length} headline-pick items via scripts/workday-e1-refire-t3-t8.mjs.`,
  );
  inbox.generated_at = RUN_TIMESTAMP;
  inbox.generated_by =
    "scheduled-task workday-e1-refire-t3-t8 — materializeDraft() + invokeMarketingSkill()";
  await fs.writeFile(INBOX_FILE, JSON.stringify(inbox, null, 2) + "\n", "utf8");
  report.inbox_items_written = inboxItems.length;
  const inboxStat = await fs.stat(INBOX_FILE);
  report.paths.push({ kind: "inbox", path: relFromStudio(INBOX_FILE), bytes: inboxStat.size });

  // ---- 6: append work-log section ----
  const workLogSection = buildWorkLogSection(report);
  await fs.appendFile(WORK_LOG, workLogSection, "utf8");
  const workLogStat = await fs.stat(WORK_LOG);
  report.paths.push({ kind: "work-log", path: relFromStudio(WORK_LOG), bytes: workLogStat.size });

  // ---- stdout report (consumed by scheduled-task runner) ----
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
}

function buildWorkLogSection(report) {
  const lines = [];
  lines.push("");
  lines.push(`## ${RUN_LABEL}`);
  lines.push("");
  lines.push(
    `Re-fired the two coupled stragglers from today (T3 stripSlop-into-draft-pipeline and T8 headline-variants). Created \`scripts/lib/draft-writer.mjs\` as a single chokepoint that runs every Life Loophole draft body through \`stripSlop()\` from \`scripts/lib/skills/stop-slop.mjs\` before write — that wiring IS T3. T8 then walked the 6 freshly materialized drafts and emitted \`<slug>.variants.json\` + \`headline-pick\` inbox cards.`,
  );
  lines.push("");
  lines.push("**Drafts found:** 6 (catalog-sourced — same 6 IDs T16 already exposed: hsa-contribution, traditional-ira-deduction, roth-ira-contribution, employer-401k-contribution, child-tax-credit, education-credits).");
  lines.push("");
  lines.push(
    `**Drafts materialized:** ${report.drafts_materialized} of ${DRAFTS.length} written to \`content/life-loophole/drafts/<slug>.md\`.`,
  );
  lines.push("");
  lines.push(
    `**stripSlop removals (total):** ${report.total_phrases_removed_by_stripslop} phrases.`,
  );
  lines.push("");
  lines.push("Per-draft breakdown:");
  for (const r of report.per_draft_removed_counts) {
    const phraseList = r.phrases
      .map((p) => `${p.phrase}×${p.count}`)
      .join(", ") || "—";
    lines.push(`- \`${r.slug}\`: ${r.removed} removed (${phraseList})`);
  }
  lines.push("");
  lines.push(
    `**Variants generated:** ${report.variants_generated} real + ${report.variants_placeholders} \`[needs-API-key]\` placeholders. ${report.variants_generated === 0 ? "ANTHROPIC_API_KEY not set in env — every variants.json carries placeholder text tagged so the picker UI surfaces them as not-ready." : "marketing-skills bridge fired against the headline-rewriter sub-skill."}`,
  );
  lines.push("");
  lines.push(`**Variants files written:** ${report.variants_files_written.length}`);
  for (const v of report.variants_files_written) lines.push(`- \`${v}\``);
  lines.push("");
  lines.push(
    `**Inbox items pushed:** ${report.inbox_items_written} \`kind: "headline-pick"\` entries appended to \`public/data/inboxes/life-loophole.json\` (existing hero-image-pick items left untouched).`,
  );
  lines.push("");
  lines.push("**Constraints honored:** inbox-only (no publish, no MDX body edits), hot-flash + kennum excluded (not relevant — life-loophole only), no push, no delete.");
  lines.push("");
  lines.push("**Verification:** see `npm run typecheck` and `npx next lint` results recorded by the scheduled-task runner.");
  lines.push("");
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("workday-e1-refire-t3-t8 failed:", err);
  process.exit(1);
});
