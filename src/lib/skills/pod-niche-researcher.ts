/**
 * pod-niche-researcher — hand-coded impl.
 *
 * Web-grounded research to find underserved POD niches with high
 * willingness-to-pay. Different from Etsy digital research — POD niches
 * are about identity ("I'm a {X} mom", "I survived {Y}", in-group jokes)
 * rather than pure utility.
 *
 * Returns 5-8 niche candidates with audience-size estimates, competition
 * levels, suggested product mixes, and example design directions.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { callGemini } from "../gemini-call";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();

interface PodResearchInput {
  audience_seed?: string; // optional: anchor research to an audience (e.g. "perimenopausal women", "single dads")
  product_seed?: string;  // optional: anchor to a product type (e.g. "mugs", "totes")
  tenant?: string;
}

const SYSTEM_PROMPT = `You research print-on-demand niches via web search.

POD economics rule of thumb (be honest):
- Mugs ($10-15 base cost, $20-28 sell, ~$10 margin)
- Posters/prints (cheap base, $15-25 sell, ~$8-12 margin)
- T-shirts ($10-14 base, $22-32 sell, ~$10-15 margin)
- Sweatshirts ($24-30 base, $40-55 sell, ~$12-20 margin)
- Tote bags ($10-14 base, $20-28 sell, ~$8-12 margin)

Strong POD niches share these traits:
1. STRONG IDENTITY ("I'm an X" — perimenopausal moms, single dads, recovering migraines, dog owners of breed Y)
2. HUMOR or DEFIANCE (in-group jokes that outsiders don't get)
3. LIFE EVENT MARKERS (graduations, retirements, recovery milestones, sobriety)
4. LOCAL/REGIONAL PRIDE (less saturated than national)
5. ANNIVERSARY/GIFT-DRIVEN (someone buying for someone else)

Avoid: anything mass-market (just "dog moms", "coffee lovers", "wine") — too saturated.

For each candidate niche, find:
- Estimated audience size (rough)
- Competition level on Etsy ("few shops" / "moderate" / "saturated")
- Best product types (which of mugs/posters/tees/sweatshirts/totes fit this audience)
- 3 design direction examples (just descriptions of concepts, not the designs themselves)
- Why this niche has buying power

Return ONLY JSON, no preamble:
{
  "niches": [
    {
      "name": "...",
      "audience_size_estimate": "...",
      "competition_level": "low|medium|high",
      "best_products": ["mug", "poster", ...],
      "design_concepts": ["concept 1", "concept 2", "concept 3"],
      "buying_power_reason": "...",
      "estimated_monthly_revenue_potential": "$X-$Y"
    }
  ],
  "sources_cited": ["..."]
}

Find 5-8 niches. Be specific. No generic "fitness lovers" — go narrow.`;

export async function researchPodNiches(input: PodResearchInput): Promise<{
  ok: boolean;
  path?: string;
  research?: Record<string, unknown>;
  error?: string;
}> {
  const tenant = input.tenant || "pod-store-1";

  let promptContext = "";
  if (input.audience_seed) {
    promptContext += `Anchor research around this audience: ${input.audience_seed}\n`;
  }
  if (input.product_seed) {
    promptContext += `Anchor research around this product type: ${input.product_seed}\n`;
  }
  if (!promptContext) {
    promptContext = "Find any 5-8 strong POD niches. Bias toward identity-driven, life-event-driven, and regional niches.";
  }

  const prompt = `${promptContext}

Return JSON only with 5-8 niche recommendations.`;

  const result = await callGemini({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.55,
    maxOutputTokens: 4096,
    useGrounding: true,
    model: "gemini-2.5-flash",
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

  if (result.sources && result.sources.length > 0) {
    research.sources_cited = research.sources_cited || result.sources;
  }

  const slug = input.audience_seed
    ? input.audience_seed.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50)
    : "general";
  const researchDir = path.join(HOME, "Documents/businesses", tenant, "research");
  await fs.mkdir(researchDir, { recursive: true });
  const filePath = path.join(researchDir, `pod-niches-${slug}.md`);

  const niches = (research.niches as Array<Record<string, unknown>>) || [];

  const lines: string[] = [];
  lines.push(`# POD niche research`);
  lines.push("");
  lines.push(`*${new Date().toISOString()}*`);
  if (input.audience_seed) lines.push(`*Audience seed: ${input.audience_seed}*`);
  if (input.product_seed) lines.push(`*Product seed: ${input.product_seed}*`);
  lines.push("");

  niches.forEach((n, i) => {
    lines.push(`## ${i + 1}. ${n.name}`);
    lines.push("");
    lines.push(`- **Audience size**: ${n.audience_size_estimate || "?"}`);
    lines.push(`- **Competition**: ${n.competition_level || "?"}`);
    lines.push(`- **Best products**: ${Array.isArray(n.best_products) ? (n.best_products as string[]).join(", ") : "?"}`);
    lines.push(`- **Revenue potential**: ${n.estimated_monthly_revenue_potential || "?"}`);
    lines.push(`- **Why buyers buy**: ${n.buying_power_reason || "?"}`);
    lines.push("");
    lines.push(`**Design concept ideas**:`);
    if (Array.isArray(n.design_concepts)) {
      for (const c of n.design_concepts as string[]) {
        lines.push(`- ${c}`);
      }
    }
    lines.push("");
  });

  if (Array.isArray(research.sources_cited) && research.sources_cited.length > 0) {
    lines.push(`## Sources`);
    for (const s of research.sources_cited) lines.push(`- ${s}`);
  }

  await fs.writeFile(filePath, lines.join("\n"), "utf8");

  await auditLog({
    action: "pod_niches_researched",
    actor: "automated:pod-niche-researcher",
    customer_slug: tenant,
    details: {
      audience_seed: input.audience_seed,
      product_seed: input.product_seed,
      niches_found: niches.length,
      path: filePath,
    },
    skill_invoked: "pod-niche-researcher",
    actor_source: "skill-runner",
  });

  return { ok: true, path: filePath, research };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<PodResearchInput> | undefined;
  const result = await researchPodNiches({
    audience_seed: inputs?.audience_seed,
    product_seed: inputs?.product_seed,
    tenant: inputs?.tenant,
  });
  return {
    ok: result.ok,
    skill: "pod-niche-researcher",
    path: "hand-coded",
    result: { niches_found: ((result.research?.niches as unknown[]) || []).length },
    artifacts: result.path ? [result.path] : [],
    error: result.error,
  };
}
