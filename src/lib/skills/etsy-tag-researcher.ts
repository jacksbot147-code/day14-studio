/**
 * etsy-tag-researcher — hand-coded impl.
 *
 * Given a niche/keyword, uses Gemini's Google Search grounding to find
 * real Etsy long-tail tags with strong demand + low competition. Returns
 * a ranked list with rationale.
 *
 * Saves research to ~/Documents/businesses/{tenant}/research/tags-{slug}.md.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { callGemini } from "../gemini-call";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();

interface ResearchInput {
  niche: string;
  product_type?: string;
  tenant?: string;
}

const SYSTEM_PROMPT = `You are an Etsy SEO researcher. You use web search to find current data on:

1. Long-tail search terms shoppers actually use (3-5 word phrases, intent-clear)
2. Listing counts per term (lower = less competition)
3. Buyer intent signals (purchases vs browses)
4. Seasonal patterns

For the given niche/product, find:
- 8-12 specific long-tail tags with under 5,000 competing listings
- For each: estimated competition (low/med/high), buyer intent (high/med/low), seasonal note

Return ONLY JSON, no preamble:
{
  "niche_summary": "1-2 sentences",
  "top_long_tail_tags": [
    {
      "tag": "20 chars max, lowercase",
      "competition": "low|medium|high",
      "buyer_intent": "high|medium|low",
      "monthly_searches_estimate": "if known, else null",
      "seasonal_note": "if relevant, else null",
      "reasoning": "1 sentence"
    }
  ],
  "avoid_tags": ["overly broad terms to skip — like 'planner' alone"],
  "sources_cited": ["..."]
}`;

export async function researchTags(input: ResearchInput): Promise<{
  ok: boolean;
  path?: string;
  research?: Record<string, unknown>;
  error?: string;
}> {
  const tenant = input.tenant || "etsy-store-1";

  const prompt = `Niche: ${input.niche}${input.product_type ? `\nProduct type: ${input.product_type}` : ""}

Research Etsy tags. Use Google Search to find current data on Etsy listings, eRank/Marmalead insights if available, and Reddit/Pinterest discussions about what buyers in this niche actually search for.

Find tags with strong intent + low competition. Return JSON only.`;

  const result = await callGemini({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.5,
    maxOutputTokens: 4096,
    useGrounding: true,
    model: "gemini-2.5-flash", // grounding works best with the heavier model
  });

  if (!result.ok || !result.text) {
    return { ok: false, error: result.error };
  }

  let research: Record<string, unknown>;
  try {
    const cleaned = result.text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();
    research = JSON.parse(cleaned);
  } catch (err) {
    return {
      ok: false,
      error: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Inject the grounding sources if not already present
  if (result.sources && result.sources.length > 0) {
    research.sources_cited = research.sources_cited || result.sources;
  }

  // Save
  const slug = input.niche
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const researchDir = path.join(HOME, "Documents/businesses", tenant, "research");
  await fs.mkdir(researchDir, { recursive: true });
  const filePath = path.join(researchDir, `tags-${slug}.md`);

  const lines: string[] = [];
  lines.push(`# Tag research: ${input.niche}`);
  lines.push("");
  lines.push(`*${new Date().toISOString()}*`);
  lines.push("");
  if (research.niche_summary) {
    lines.push(`## Summary`);
    lines.push(`${research.niche_summary}`);
    lines.push("");
  }
  lines.push(`## Top long-tail tags`);
  lines.push("");
  lines.push(`| Tag | Competition | Intent | Monthly | Notes |`);
  lines.push(`|-----|:-----------:|:------:|:-------:|-------|`);
  const tags = (research.top_long_tail_tags as Array<Record<string, string>>) || [];
  for (const t of tags) {
    lines.push(
      `| \`${t.tag}\` | ${t.competition || "?"} | ${t.buyer_intent || "?"} | ${t.monthly_searches_estimate || "?"} | ${t.seasonal_note || t.reasoning || ""} |`
    );
  }
  lines.push("");
  if (Array.isArray(research.avoid_tags) && research.avoid_tags.length > 0) {
    lines.push(`## Avoid (too broad)`);
    for (const a of research.avoid_tags) {
      lines.push(`- ${a}`);
    }
    lines.push("");
  }
  if (Array.isArray(research.sources_cited) && research.sources_cited.length > 0) {
    lines.push(`## Sources`);
    for (const s of research.sources_cited) {
      lines.push(`- ${s}`);
    }
  }
  await fs.writeFile(filePath, lines.join("\n"), "utf8");

  await auditLog({
    action: "etsy_tags_researched",
    actor: "automated:etsy-tag-researcher",
    customer_slug: tenant,
    details: {
      niche: input.niche,
      tag_count: tags.length,
      path: filePath,
    },
    skill_invoked: "etsy-tag-researcher",
    actor_source: "skill-runner",
  });

  return { ok: true, path: filePath, research };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<ResearchInput> | undefined;
  if (!inputs?.niche) {
    return {
      ok: false,
      skill: "etsy-tag-researcher",
      path: "hand-coded",
      error: "missing required input: niche",
    };
  }
  const result = await researchTags({
    niche: inputs.niche,
    product_type: inputs.product_type,
    tenant: inputs.tenant,
  });
  return {
    ok: result.ok,
    skill: "etsy-tag-researcher",
    path: "hand-coded",
    result: { tags_found: ((result.research?.top_long_tail_tags as unknown[]) || []).length },
    artifacts: result.path ? [result.path] : [],
    error: result.error,
  };
}
