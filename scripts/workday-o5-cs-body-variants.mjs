#!/usr/bin/env node
/**
 * scripts/workday-o5-cs-body-variants.mjs
 *
 * Overnight O5 (Day14, 2026-05-29 00:40 EDT) — wires
 * `marketing-skills:emails` into the CS template pipeline. Today the 6
 * CS templates carry subject-line picks but no body alternates. This
 * script generates 2 body variants per template anchored against the
 * existing T10 subject-line winner.
 *
 * Behavior:
 *   1. Reads the 6 CS templates from public/data/cs-templates/*.subjects.json.
 *   2. For each, calls invokeMarketingSkill("emails", { subjectLine,
 *      customerContext, brandVoice, intent: "alternate phrasing",
 *      originalBody }, { variants: 2 }) under a checkBudget("marketing_skills")
 *      gate.
 *   3. Writes public/data/cs-templates/<id>.body-variants.json with shape
 *      { originalBody, variants: [{ body, rationale, tone }] }.
 *   4. Appends 6 inbox items kind="cs-body-pick" to
 *      public/data/inboxes/day14.json (does not delete existing items).
 *
 * Constraints honored:
 *   - inbox-only (no publish).
 *   - hot-flash-co + kennum-lawn-care excluded (the directory only holds
 *     day14 templates today; the filter is explicit anyway).
 *   - no push, no delete.
 *   - budget gate fires before any external call; on !allowed the script
 *     still writes placeholder variants so the JSON shape + inbox items
 *     are stable and the run is evidence-trackable.
 *
 * Usage:
 *   node scripts/workday-o5-cs-body-variants.mjs [--dry-run]
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { invokeMarketingSkill } from "./lib/skills/marketing-skills.mjs";
import { checkBudget } from "./lib/budget-gate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(HERE, "..");
const TEMPLATES_DIR = path.join(STUDIO_ROOT, "public", "data", "cs-templates");
const INBOX_FILE = path.join(STUDIO_ROOT, "public", "data", "inboxes", "day14.json");
const WORK_LOG = path.join(STUDIO_ROOT, "WORK-LOG.md");

const RUN_TIMESTAMP = new Date().toISOString();
const RUN_LABEL = "2026-05-29 00:40 — O5 CS body variants";

// Hot-flash + kennum are excluded from all new work tonight. The CS
// templates directory only contains day14 today, but the filter is
// explicit so a future drop into the directory under another tenant
// cannot leak.
const EXCLUDED_TENANTS = new Set(["hot-flash-co", "kennum-lawn-care"]);

// ----------------------------------------------------------------------
// Originals — the canonical body text per template, lifted from
// docs/overnight/03-customer-comms-pack.md. Kept inline so the script
// is self-contained and the source-of-truth diff lives in one place.
// ----------------------------------------------------------------------

const ORIGINAL_BODIES = {
  "deposit-received": `Got your deposit. {{customer_first_name}}, the 14-day clock starts today.

Two things from me in the next 18 hours:

1. The intake form — one page, 8 minutes: {{intake_url}}
2. A preview URL on a *.day14.dev subdomain, by tomorrow 6pm ET

Then a one-paragraph update from me every weekday at 6pm ET until launch.

Faster than email for anything urgent: text me at {{jack_phone}}.

— Jack
Day14`,
  "intake-form-link": `Here's the intake: {{intake_url}}

One page. Logo, services, pricing, photos, service area. That's the whole input.

If you have brand assets already, drag them into the upload field. If you don't, I'll work from what's on your current site or your Instagram — say which.

Aim for tonight. The 14-day clock pauses until I have it, per the SOW.

— Jack
Day14`,
  "preview-ready": `Preview is live: {{preview_url}}

Built from your intake. Pages so far: {{pages_shipped_list}}. Mobile and desktop both done.

Things that look off, copy that's wrong, photos in the wrong spot — text me or reply here. I'd rather hear it now than on launch day.

Public build log (every commit, every change): {{buildlog_url}}.

More tomorrow.

— Jack
Day14`,
  "eod-update-good": `Today: shipped {{thing_1}} and {{thing_2}}.

Tomorrow: {{thing_3}}.

Preview: {{preview_url}}. Build log: {{buildlog_url}}.

On track for launch {{launch_date}}.

— Jack
Day14`,
  "eod-update-bad": `Slower day. {{blocker_short_description}} took longer than the estimate.

What's done: {{progress_made}}.
What slipped to tomorrow: {{slipped_item}}.

Still on track for launch {{launch_date}} — the buffer's there for exactly this.

Preview: {{preview_url}}.

— Jack
Day14`,
  "launched": `{{business_name}} is live at {{production_url}}.

Stripe is in live mode. SMS notifications are on. Customer portal magic-link login tested with a fake account and a real one.

I'll watch the first 72 hours of real traffic and ping you if anything looks off.

Balance invoice for \${{balance_amount}} is queued — Stripe sends it tomorrow at 9am ET. Monthly hosting (\${{monthly_amount}}/mo) starts today.

Welcome to Day14.

— Jack
Day14`,
};

const BRAND_VOICE = "Operator. Jack writes the email, not 'we'. No 'thank you for choosing us' — the deposit already cleared. Plain, concrete, no exclamation points. Signed '— Jack / Day14'.";

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function relFromStudio(absPath) {
  return path.relative(STUDIO_ROOT, absPath).split(path.sep).join("/");
}

function parseArgs(argv) {
  const out = { dryRun: false };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run" || a === "-n") out.dryRun = true;
  }
  return out;
}

async function listTemplateIds() {
  const entries = await fs.readdir(TEMPLATES_DIR);
  return entries
    .filter((f) => f.endsWith(".subjects.json"))
    .map((f) => f.replace(/\.subjects\.json$/, ""))
    .sort();
}

async function readSubjectsTemplate(id) {
  const p = path.join(TEMPLATES_DIR, `${id}.subjects.json`);
  const raw = await fs.readFile(p, "utf8");
  return JSON.parse(raw);
}

/**
 * Extract a JSON array from a model response. Returns null on parse fail.
 */
function extractJsonArray(text) {
  if (typeof text !== "string") return null;
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = text.slice(start, end + 1);
  try {
    const parsed = JSON.parse(slice);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function buildPlaceholderVariants(id, originalBody) {
  // Two clearly-tagged placeholder variants so the JSON shape is stable
  // even on a key-less / budget-gated / plugin-missing run. They are NOT
  // model output — the [needs-API-key] tag makes that explicit so the
  // approval UI never ships them.
  const head = originalBody.split("\n\n")[0] || originalBody.slice(0, 120);
  return [
    {
      body: `[needs-API-key] Variant 1 of ${id} — tighter receipt-style rewrite of:\n\n${head}\n\n[…rest of original preserved verbatim — re-run with marketing-skills:emails wired to populate.]`,
      rationale: "placeholder #1 — strategy: tight-receipt (one-line acknowledgement, numbered next steps)",
      tone: "tight-receipt",
    },
    {
      body: `[needs-API-key] Variant 2 of ${id} — warmer-ops rewrite of:\n\n${head}\n\n[…rest of original preserved verbatim — re-run with marketing-skills:emails wired to populate.]`,
      rationale: "placeholder #2 — strategy: warmer-ops (single sentence of context before the next step)",
      tone: "warmer-ops",
    },
  ];
}

/**
 * Run the emails sub-skill for one template. Returns { ok, source, variants, reason? }.
 * Falls back to placeholder variants on any of:
 *   - budget gate blocked
 *   - plugin not on disk
 *   - no API key
 *   - parse failure on model output
 */
async function generateBodyVariants({ templateId, subjectLine, originalBody, customerContext }) {
  // Budget gate first — no external call if blocked.
  const gate = await checkBudget("marketing_skills");
  if (!gate.allowed) {
    return {
      ok: false,
      reason: `budget-gate: ${gate.reason}`,
      source: "[budget-blocked]",
      variants: buildPlaceholderVariants(templateId, originalBody),
    };
  }

  let result;
  try {
    result = await invokeMarketingSkill(
      "emails",
      {
        subjectLine,
        customerContext,
        brandVoice: BRAND_VOICE,
        intent: "alternate phrasing",
        originalBody,
      },
      { variants: 2 },
    );
  } catch (err) {
    return {
      ok: false,
      reason: `invokeMarketingSkill threw: ${err?.message ?? String(err)}`,
      source: "[exception]",
      variants: buildPlaceholderVariants(templateId, originalBody),
    };
  }

  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason || "unknown",
      source: result.meta?.subSkill ? `[${result.meta.subSkill} unavailable]` : "[needs-API-key]",
      variants: buildPlaceholderVariants(templateId, originalBody),
    };
  }

  const arr = extractJsonArray(result.output);
  if (!Array.isArray(arr) || arr.length === 0) {
    return {
      ok: false,
      reason: "model output did not contain a valid JSON array",
      source: "[parse-failed]",
      variants: buildPlaceholderVariants(templateId, originalBody),
    };
  }

  const variants = arr
    .slice(0, 2)
    .filter((v) => v && typeof v === "object" && typeof v.body === "string")
    .map((v) => ({
      body: v.body,
      rationale: typeof v.rationale === "string" ? v.rationale : "",
      tone: typeof v.tone === "string" ? v.tone : "",
    }));

  if (variants.length === 0) {
    return {
      ok: false,
      reason: "no usable variants in parsed array",
      source: "[parse-empty]",
      variants: buildPlaceholderVariants(templateId, originalBody),
    };
  }

  return {
    ok: true,
    source: result.meta?.subSkill || "marketing-skills:emails",
    meta: result.meta,
    variants,
  };
}

// ----------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);
  const report = {
    run_label: RUN_LABEL,
    run_timestamp: RUN_TIMESTAMP,
    dry_run: args.dryRun,
    templates_scanned: 0,
    templates_processed: 0,
    templates_skipped: [],
    variants_files_written: [],
    inbox_items_written: 0,
    real_variants_count: 0,
    placeholder_variants_count: 0,
    errors: [],
  };

  const ids = await listTemplateIds();
  report.templates_scanned = ids.length;
  if (ids.length === 0) {
    console.log("o5-cs-body-variants: no CS templates found at", relFromStudio(TEMPLATES_DIR));
    return report;
  }

  const inboxItemsToAppend = [];

  for (const id of ids) {
    let template;
    try {
      template = await readSubjectsTemplate(id);
    } catch (err) {
      report.errors.push(`read ${id}: ${err?.message ?? String(err)}`);
      continue;
    }
    if (EXCLUDED_TENANTS.has(template.tenant)) {
      report.templates_skipped.push({ id, reason: `tenant ${template.tenant} excluded` });
      continue;
    }
    const originalBody = ORIGINAL_BODIES[id];
    if (!originalBody) {
      report.templates_skipped.push({ id, reason: "no original body inlined for this template id" });
      continue;
    }

    // Anchor subject = current_subject if set, else the first variant's subject.
    const subjectLine = template.current_subject
      || (Array.isArray(template.variants) && template.variants[0]?.subject)
      || "(no subject set)";

    const customerContext = {
      tenant: template.tenant,
      templateId: id,
      sourceRef: template.source_ref || null,
      scenario: template.input?.scenario || null,
      topic: template.input?.topic || null,
      constraints: Array.isArray(template.constraints) ? template.constraints : [],
    };

    const out = await generateBodyVariants({
      templateId: id,
      subjectLine,
      originalBody,
      customerContext,
    });

    const payload = {
      schema_version: 1,
      tenant: template.tenant,
      id,
      kind: "cs-reply-body-variants",
      source_ref: template.source_ref || null,
      generated_at: new Date().toISOString(),
      generated_by: "scheduled-task workday-o5-cs-body-variants",
      skill: "emails",
      skill_invocation: 'invokeMarketingSkill("emails", { subjectLine, customerContext, brandVoice, intent: "alternate phrasing", originalBody }, { variants: 2 })',
      skill_status: out.ok ? "ok" : "fallback-local",
      anchor_subject: subjectLine,
      brand_voice: BRAND_VOICE,
      input: {
        subjectLine,
        intent: "alternate phrasing",
        customerContext,
      },
      originalBody,
      variants: out.variants,
      source: out.source,
      ok: out.ok,
      reason: out.ok ? null : out.reason,
      meta: out.meta || null,
      approval: {
        status: "awaiting-jack",
        inbox_kind: "cs-body-pick",
        auto_replace_in_source: false,
      },
    };

    const outPath = path.join(TEMPLATES_DIR, `${id}.body-variants.json`);
    if (!args.dryRun) {
      await fs.writeFile(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
    }
    report.variants_files_written.push(relFromStudio(outPath));
    report.templates_processed += 1;
    if (out.ok) report.real_variants_count += out.variants.length;
    else report.placeholder_variants_count += out.variants.length;

    inboxItemsToAppend.push({
      id: `inbox-day14-2026-05-29-cs-body-${id}`,
      kind: "cs-body-pick",
      tenant: "day14",
      subject_kind: "cs-reply-template",
      title: `Pick a body variant — CS template: ${id}`,
      summary: out.ok
        ? `2 body variants generated via marketing-skills:emails (sub-skill: ${out.source}). Anchor subject: "${subjectLine}". Inbox-only — no auto-replacement.`
        : `[needs-API-key] 2 placeholder body variants written — re-run after wiring the emails sub-skill to populate. Anchor subject: "${subjectLine}". (reason: ${out.reason})`,
      source_ref: template.source_ref || null,
      variants_file: relFromStudio(outPath),
      variant_count: payload.variants.length,
      anchor_subject: subjectLine,
      current_body_excerpt: originalBody.split("\n\n")[0],
      is_placeholder: !out.ok,
      tags: ["day14", "cs-body", "O5", "marketing-skills:emails"],
      created_at: new Date().toISOString(),
      status: "awaiting-jack",
      priority: "medium",
      auto_replace_in_source: false,
    });
  }

  // ---- merge into the existing inbox file (append; never delete) -------
  if (inboxItemsToAppend.length > 0) {
    let inbox;
    try {
      const raw = await fs.readFile(INBOX_FILE, "utf8");
      inbox = JSON.parse(raw);
    } catch (err) {
      report.errors.push(`read inbox ${relFromStudio(INBOX_FILE)}: ${err?.message ?? String(err)}`);
      inbox = { schema_version: 1, tenant: "day14", items: [] };
    }
    if (!Array.isArray(inbox.items)) inbox.items = [];
    // Dedupe by id — re-running the script should not double-append.
    const existingIds = new Set(inbox.items.map((it) => it && it.id));
    let appended = 0;
    for (const it of inboxItemsToAppend) {
      if (existingIds.has(it.id)) continue;
      inbox.items.push(it);
      appended += 1;
    }
    inbox.generated_at = new Date().toISOString();
    if (!args.dryRun) {
      await fs.writeFile(INBOX_FILE, JSON.stringify(inbox, null, 2) + "\n", "utf8");
    }
    report.inbox_items_written = appended;
  }

  // ---- work-log section ------------------------------------------------
  const workLogEntry = [
    ``,
    `## ${RUN_LABEL}`,
    ``,
    `Wired \`marketing-skills:emails\` into the CS template pipeline via \`scripts/workday-o5-cs-body-variants.mjs\`. `,
    `Added an explicit-sub-skill switch case to \`scripts/lib/skills/marketing-skills.mjs\` `,
    `(\`pickSubSkillByName()\` + \`SUB_SKILL_PROMPT_BUILDERS.emails\`) so callers can route past the lexical scorer.`,
    ``,
    `- templates scanned: ${report.templates_scanned}`,
    `- templates processed: ${report.templates_processed}`,
    `- templates skipped: ${report.templates_skipped.length} (${report.templates_skipped.map((s) => `${s.id}: ${s.reason}`).join("; ") || "none"})`,
    `- variants files written: ${report.variants_files_written.length}`,
    `- real variants from emails sub-skill: ${report.real_variants_count}`,
    `- placeholder variants (key/budget/parse): ${report.placeholder_variants_count}`,
    `- inbox items appended (kind=cs-body-pick): ${report.inbox_items_written}`,
    `- inbox file: \`${relFromStudio(INBOX_FILE)}\``,
    `- errors: ${report.errors.length}${report.errors.length ? " — " + report.errors.join("; ") : ""}`,
    ``,
    `Constraints honored: inbox-only, no publish, hot-flash + kennum excluded, no push, no delete. `,
    `Budget gate (\`marketing_skills\`) fired before any external call.`,
    ``,
  ].join("\n");
  if (!args.dryRun) {
    try {
      await fs.appendFile(WORK_LOG, workLogEntry, "utf8");
    } catch (err) {
      report.errors.push(`append work-log: ${err?.message ?? String(err)}`);
    }
  }

  console.log(JSON.stringify(report, null, 2));
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error("o5-cs-body-variants failed:", e?.message ?? String(e));
    process.exit(1);
  });
}

export { main };
