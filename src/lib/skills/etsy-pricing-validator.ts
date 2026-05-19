/**
 * etsy-pricing-validator — hand-coded impl.
 *
 * Given a product + proposed price, uses web search to find what
 * similar live Etsy listings are priced at. Returns recommended price
 * range + competitor benchmarks.
 *
 * Saves to ~/Documents/businesses/{tenant}/research/pricing-{slug}.md.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { callGemini } from "../gemini-call";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();

interface PricingInput {
  product_name: string;
  product_description: string;
  proposed_price_usd?: number;
  tenant?: string;
}

const SYSTEM_PROMPT = `You research Etsy pricing using web search.

For a given product, find:
- 5-8 similar live listings with their actual prices
- The price range (low / median / high)
- Top-seller benchmarks (what shops with 1000+ sales charge)
- Any premium pricing strategies that work in this category
- Whether the proposed price (if given) is appropriate

Return ONLY JSON, no preamble:
{
  "competitor_examples": [
    {"title": "...", "price_usd": NUMBER, "shop_sales": "if findable, else null", "url": "..."}
  ],
  "price_range": {"low": NUMBER, "median": NUMBER, "high": NUMBER},
  "recommended_price_usd": NUMBER,
  "recommended_reasoning": "...",
  "verdict_on_proposed": "appropriate|too_low|too_high|null if not provided",
  "premium_positioning_advice": "1-2 sentences",
  "sources_cited": ["..."]
}`;

export async function validatePricing(input: PricingInput): Promise<{
  ok: boolean;
  path?: string;
  pricing?: Record<string, unknown>;
  error?: string;
}> {
  const tenant = input.tenant || "etsy-store-1";

  const prompt = `Product: ${input.product_name}
Description: ${input.product_description}
${input.proposed_price_usd ? `Proposed price: $${input.proposed_price_usd}` : ""}

Research what similar products on Etsy sell for right now. Find specific examples with prices. JSON only.`;

  const result = await callGemini({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.4,
    maxOutputTokens: 3072,
    useGrounding: true,
    model: "gemini-2.5-flash",
  });

  if (!result.ok || !result.text) {
    return { ok: false, error: result.error };
  }

  let pricing: Record<string, unknown>;
  try {
    const cleaned = result.text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();
    pricing = JSON.parse(cleaned);
  } catch (err) {
    return {
      ok: false,
      error: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (result.sources && result.sources.length > 0) {
    pricing.sources_cited = pricing.sources_cited || result.sources;
  }

  const slug = input.product_name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const researchDir = path.join(HOME, "Documents/businesses", tenant, "research");
  await fs.mkdir(researchDir, { recursive: true });
  const filePath = path.join(researchDir, `pricing-${slug}.md`);

  const range = pricing.price_range as { low?: number; median?: number; high?: number } | undefined;
  const competitors = (pricing.competitor_examples as Array<Record<string, unknown>>) || [];

  const lines: string[] = [];
  lines.push(`# Pricing research: ${input.product_name}`);
  lines.push("");
  lines.push(`*${new Date().toISOString()}*`);
  lines.push("");
  if (input.proposed_price_usd) {
    lines.push(`**Proposed price**: $${input.proposed_price_usd}`);
    if (pricing.verdict_on_proposed) {
      const verdict = pricing.verdict_on_proposed as string;
      const emoji = verdict === "appropriate" ? "✅" : verdict === "too_low" ? "⬆️" : "⬇️";
      lines.push(`**Verdict**: ${emoji} ${verdict.replace("_", " ")}`);
    }
    lines.push("");
  }
  if (range) {
    lines.push(`## Market price range`);
    lines.push(`- Low: $${range.low ?? "?"}`);
    lines.push(`- Median: $${range.median ?? "?"}`);
    lines.push(`- High: $${range.high ?? "?"}`);
    lines.push("");
  }
  if (pricing.recommended_price_usd) {
    lines.push(`## Recommended price: $${pricing.recommended_price_usd}`);
    lines.push(`${pricing.recommended_reasoning}`);
    lines.push("");
  }
  if (competitors.length > 0) {
    lines.push(`## Competitor examples`);
    lines.push("");
    lines.push(`| Title | Price | Shop sales | Link |`);
    lines.push(`|-------|------:|------------|------|`);
    for (const c of competitors) {
      lines.push(
        `| ${c.title || "?"} | $${c.price_usd || "?"} | ${c.shop_sales || "?"} | ${c.url || "—"} |`
      );
    }
    lines.push("");
  }
  if (pricing.premium_positioning_advice) {
    lines.push(`## Premium positioning`);
    lines.push(`${pricing.premium_positioning_advice}`);
    lines.push("");
  }
  if (Array.isArray(pricing.sources_cited) && pricing.sources_cited.length > 0) {
    lines.push(`## Sources`);
    for (const s of pricing.sources_cited) lines.push(`- ${s}`);
  }
  await fs.writeFile(filePath, lines.join("\n"), "utf8");

  await auditLog({
    action: "etsy_pricing_validated",
    actor: "automated:etsy-pricing-validator",
    customer_slug: tenant,
    details: {
      product: input.product_name,
      proposed: input.proposed_price_usd,
      recommended: pricing.recommended_price_usd,
      path: filePath,
    },
    skill_invoked: "etsy-pricing-validator",
    actor_source: "skill-runner",
  });

  return { ok: true, path: filePath, pricing };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<PricingInput> | undefined;
  if (!inputs?.product_name || !inputs.product_description) {
    return {
      ok: false,
      skill: "etsy-pricing-validator",
      path: "hand-coded",
      error: "missing required inputs: product_name + product_description",
    };
  }
  const result = await validatePricing({
    product_name: inputs.product_name,
    product_description: inputs.product_description,
    proposed_price_usd: inputs.proposed_price_usd,
    tenant: inputs.tenant,
  });
  return {
    ok: result.ok,
    skill: "etsy-pricing-validator",
    path: "hand-coded",
    result: {
      recommended_price: result.pricing?.recommended_price_usd,
      verdict: result.pricing?.verdict_on_proposed,
    },
    artifacts: result.path ? [result.path] : [],
    error: result.error,
  };
}
