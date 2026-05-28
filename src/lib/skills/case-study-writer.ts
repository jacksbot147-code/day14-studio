/**
 * case-study-writer — hand-coded impl.
 *
 * Builds a Day14 case-study page (Markdown) from a launched customer's
 * dossier + caller-supplied quote/metrics. Pure-Node template filler;
 * never auto-publishes. Output written to docs/case-studies-drafts/.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();

export interface CaseStudyInput {
  customer_slug: string;
  customer_name: string;
  tagline: string; // "Pool service in Naples"
  sku: "site" | "portal" | "platform";
  build_duration_days: number;
  launch_date: string; // ISO
  problem: string; // 2-3 sentence problem framing
  features_shipped: string[]; // 3-5 bullets
  metrics: Array<{ label: string; value: string }>;
  customer_quote?: string;
  customer_quote_attribution?: string;
  hero_image_url?: string;
  tenant?: string;
  output_dir?: string;
}

export interface CaseStudyResult {
  ok: boolean;
  draft_path?: string;
  markdown?: string;
  word_count?: number;
  error?: string;
}

function renderMarkdown(input: CaseStudyInput): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`slug: ${input.customer_slug}`);
  lines.push(`title: ${input.customer_name} — ${input.tagline}`);
  lines.push(`sku: ${input.sku}`);
  lines.push(`build_duration_days: ${input.build_duration_days}`);
  lines.push(`launch_date: ${input.launch_date}`);
  lines.push(`status: draft`);
  lines.push(`generated_by: case-study-writer`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${input.customer_name}`);
  lines.push("");
  lines.push(`*${input.tagline}*`);
  lines.push("");
  if (input.hero_image_url) {
    lines.push(`![${input.customer_name} site screenshot](${input.hero_image_url})`);
    lines.push("");
  }
  lines.push(`## The problem`);
  lines.push("");
  lines.push(input.problem.trim());
  lines.push("");
  lines.push(`## What we built`);
  lines.push("");
  lines.push(`A ${input.sku} build, shipped in ${input.build_duration_days} days. Headline features:`);
  lines.push("");
  for (const f of input.features_shipped) {
    lines.push(`- ${f}`);
  }
  lines.push("");
  if (input.metrics.length > 0) {
    lines.push(`## Outcomes`);
    lines.push("");
    for (const m of input.metrics) {
      lines.push(`- **${m.label}:** ${m.value}`);
    }
    lines.push("");
  }
  if (input.customer_quote) {
    lines.push(`## In their words`);
    lines.push("");
    lines.push(`> ${input.customer_quote}`);
    if (input.customer_quote_attribution) {
      lines.push(`> — ${input.customer_quote_attribution}`);
    }
    lines.push("");
  }
  lines.push(`## Want one of these?`);
  lines.push("");
  lines.push(`[Book a build call →](https://day14.us/book)`);
  return lines.join("\n");
}

export async function invokeCaseStudyWriter(input: CaseStudyInput): Promise<CaseStudyResult> {
  const md = renderMarkdown(input);
  const draftsDir = input.output_dir || path.join(HOME, "Documents/studio/docs/case-studies-drafts");
  await fs.mkdir(draftsDir, { recursive: true });
  const fileName = `${input.customer_slug}.md`;
  const draftPath = path.join(draftsDir, fileName);
  // If file exists, suffix with timestamp to avoid overwriting prior drafts.
  let finalPath = draftPath;
  if (existsSync(draftPath)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    finalPath = path.join(draftsDir, `${input.customer_slug}-${stamp}.md`);
  }
  try {
    await fs.writeFile(finalPath, md, "utf8");
    const wordCount = md.split(/\s+/).length;
    await auditLog({
      action: "case_study_drafted",
      actor: "automated:case-study-writer",
      customer_slug: input.customer_slug,
      details: { path: finalPath, words: wordCount },
      skill_invoked: "case-study-writer",
      actor_source: "skill-runner",
    });
    return { ok: true, draft_path: finalPath, markdown: md, word_count: wordCount };
  } catch (err) {
    return { ok: false, markdown: md, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<CaseStudyInput> | undefined;
  if (!input?.customer_slug || !input.customer_name || !input.sku) {
    return {
      ok: false,
      skill: "case-study-writer",
      path: "hand-coded",
      error: "missing required inputs: customer_slug, customer_name, sku",
    };
  }
  const result = await invokeCaseStudyWriter({
    customer_slug: input.customer_slug,
    customer_name: input.customer_name,
    tagline: input.tagline ?? "",
    sku: input.sku,
    build_duration_days: input.build_duration_days ?? 14,
    launch_date: input.launch_date ?? new Date().toISOString().slice(0, 10),
    problem: input.problem ?? "",
    features_shipped: input.features_shipped ?? [],
    metrics: input.metrics ?? [],
    customer_quote: input.customer_quote,
    customer_quote_attribution: input.customer_quote_attribution,
    hero_image_url: input.hero_image_url,
    tenant: input.tenant,
    output_dir: input.output_dir,
  });
  return {
    ok: result.ok,
    skill: "case-study-writer",
    path: "hand-coded",
    result: { path: result.draft_path, word_count: result.word_count },
    artifacts: result.draft_path ? [result.draft_path] : [],
    jack_tap_required: true,
    error: result.error,
  };
}
