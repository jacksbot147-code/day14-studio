/**
 * pod-product-mix-recommender — hand-coded impl.
 *
 * Given a niche audience, recommend the right MIX of POD products.
 * Different audiences buy different things: gift-givers buy mugs +
 * frames, identity-bonded crowds buy tees + sweatshirts, decor-buyers
 * buy posters + wall art.
 *
 * Returns: recommended Printify product types + ratio + margin estimates.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { callGemini } from "../gemini-call";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();

interface MixInput {
  niche_audience: string;
  niche_buyer_intent?: "self" | "gift" | "both"; // do buyers buy for themselves or as gifts?
  budget_per_product_design?: number; // how many designs they'll commit to
  tenant?: string;
}

const SYSTEM_PROMPT = `You recommend the right Printify product mix for a given niche audience.

Printify product margin reality (typical Etsy retail):
- White Ceramic Mug 11oz: cost ~$5, sells $14-22, margin $8-15
- Premium Mug (15oz, black): cost ~$8, sells $18-28, margin $10-18
- Unisex Heavy Cotton Tee (Gildan 5000): cost ~$10, sells $22-32, margin $10-20
- Premium Tee (Bella+Canvas 3001): cost ~$13, sells $25-35, margin $10-20
- Unisex Heavy Blend Hoodie: cost ~$24, sells $42-55, margin $14-25
- Crewneck Sweatshirt: cost ~$20, sells $38-50, margin $14-25
- Tote Bag: cost ~$11, sells $22-30, margin $9-15
- Poster (12x18): cost ~$7, sells $18-28, margin $9-18
- Framed Poster (12x18): cost ~$22, sells $48-65, margin $20-35
- Phone Cases: cost ~$10, sells $22-32, margin $10-18
- Hat (embroidered): cost ~$13, sells $24-32, margin $9-15

Audience signals → product fit:
- Self-purchase identity ("I'm an X mom") → tees + hoodies (worn, signals identity)
- Humor → mugs (low risk gift, low commitment)
- Decor / wall art → posters + framed posters (premium)
- Outdoor/active → tees + totes + hats
- Office/desk → mugs + posters
- Gift-driven occasions → premium mugs + framed posters
- Practical jokes → mugs + cheap tees

Return ONLY JSON, no preamble:
{
  "recommended_mix": [
    {
      "printify_product": "Bella+Canvas 3001 Tee",
      "ratio_pct": NUMBER,   // % of total catalog focus
      "reason": "...",
      "target_price_usd": NUMBER,
      "expected_margin_usd": NUMBER
    }
  ],
  "skip_products": ["product types to avoid for this audience"],
  "design_count_recommendation": NUMBER,   // how many designs to start with
  "first_30_days_plan": "1-2 sentences on what to do first 30 days"
}`;

export async function recommendMix(input: MixInput): Promise<{
  ok: boolean;
  path?: string;
  mix?: Record<string, unknown>;
  error?: string;
}> {
  const tenant = input.tenant || "pod-store-1";

  const prompt = `Audience: ${input.niche_audience}
${input.niche_buyer_intent ? `Buyer intent: ${input.niche_buyer_intent}` : ""}
${input.budget_per_product_design ? `Design budget: ${input.budget_per_product_design} designs` : ""}

Recommend the product mix. JSON only.`;

  const result = await callGemini({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.5,
    maxOutputTokens: 2048,
  });

  if (!result.ok || !result.text) {
    return { ok: false, error: result.error };
  }

  let mix: Record<string, unknown>;
  try {
    const cleaned = result.text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();
    mix = JSON.parse(cleaned);
  } catch (err) {
    return {
      ok: false,
      error: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const slug = input.niche_audience
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  const mixDir = path.join(HOME, "Documents/businesses", tenant, "research");
  await fs.mkdir(mixDir, { recursive: true });
  const filePath = path.join(mixDir, `product-mix-${slug}.md`);

  const recommended = (mix.recommended_mix as Array<Record<string, unknown>>) || [];

  const lines: string[] = [];
  lines.push(`# Product mix recommendation: ${input.niche_audience}`);
  lines.push("");
  lines.push(`*${new Date().toISOString()}*`);
  if (input.niche_buyer_intent) lines.push(`*Buyer intent: ${input.niche_buyer_intent}*`);
  lines.push("");
  lines.push(`## Recommended catalog mix`);
  lines.push("");
  lines.push(`| Product | Catalog % | Target price | Margin | Why |`);
  lines.push(`|---------|----------:|-------------:|-------:|-----|`);
  for (const m of recommended) {
    lines.push(
      `| ${m.printify_product || "?"} | ${m.ratio_pct || "?"}% | $${m.target_price_usd || "?"} | $${m.expected_margin_usd || "?"} | ${m.reason || ""} |`
    );
  }
  lines.push("");
  if (Array.isArray(mix.skip_products) && mix.skip_products.length > 0) {
    lines.push(`## Skip these products`);
    for (const s of mix.skip_products) lines.push(`- ${s}`);
    lines.push("");
  }
  if (mix.design_count_recommendation) {
    lines.push(`## Starter design count: ${mix.design_count_recommendation}`);
    lines.push("");
  }
  if (mix.first_30_days_plan) {
    lines.push(`## First 30 days`);
    lines.push(`${mix.first_30_days_plan}`);
  }
  await fs.writeFile(filePath, lines.join("\n"), "utf8");

  await auditLog({
    action: "pod_product_mix_generated",
    actor: "automated:pod-product-mix-recommender",
    customer_slug: tenant,
    details: {
      audience: input.niche_audience,
      product_count: recommended.length,
      path: filePath,
    },
    skill_invoked: "pod-product-mix-recommender",
    actor_source: "skill-runner",
  });

  return { ok: true, path: filePath, mix };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<MixInput> | undefined;
  if (!inputs?.niche_audience) {
    return {
      ok: false,
      skill: "pod-product-mix-recommender",
      path: "hand-coded",
      error: "missing required input: niche_audience",
    };
  }
  const result = await recommendMix({
    niche_audience: inputs.niche_audience,
    niche_buyer_intent: inputs.niche_buyer_intent,
    budget_per_product_design: inputs.budget_per_product_design,
    tenant: inputs.tenant,
  });
  return {
    ok: result.ok,
    skill: "pod-product-mix-recommender",
    path: "hand-coded",
    result: {
      products_recommended: ((result.mix?.recommended_mix as unknown[]) || []).length,
    },
    artifacts: result.path ? [result.path] : [],
    error: result.error,
  };
}
