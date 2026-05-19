/**
 * etsy-shop-policies-generator — hand-coded impl.
 *
 * Produces the four required Etsy shop policy texts:
 *   - Shipping (for digital + physical)
 *   - Returns / Exchanges
 *   - Privacy / Data handling
 *   - About / Shop story
 *
 * Saves to ~/Documents/businesses/{tenant}/policies/.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { callGemini } from "../gemini-call";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();

interface PoliciesInput {
  shop_name: string;
  product_types: "digital" | "physical" | "mixed";
  shop_owner_first_name?: string;
  shop_story_brief?: string; // 1-2 sentences about why this shop exists
  tenant?: string;
}

const SYSTEM_PROMPT = `You write Etsy shop policies. They must be:
- Clear, plain language (no legalese)
- Warm but firm
- Reflect actual policy reality (digital = no returns, physical = 14-30 day window)
- 150-300 words each section
- Use first-person ("I" not "we") if owner_first_name is given

Required sections:

1. ABOUT — shop story, who's behind it, what makes it different (warm, ~200 words)
2. SHIPPING — for digital: instant delivery, file types, where to download; for physical: timeline, carrier, tracking, packing, international
3. RETURNS — for digital: clearly state "no refunds on instant downloads but I'll fix any issues"; for physical: 14-day return window, exceptions, who pays return shipping
4. PRIVACY — what data is collected, what's done with it, how to request deletion (GDPR/CCPA aware)

Return ONLY valid JSON, no preamble, no markdown fence:
{
  "about": "...",
  "shipping": "...",
  "returns": "...",
  "privacy": "..."
}`;

export async function generatePolicies(input: PoliciesInput): Promise<{
  ok: boolean;
  paths?: string[];
  policies?: Record<string, string>;
  error?: string;
}> {
  const tenant = input.tenant || "etsy-store-1";

  const prompt = `Shop name: ${input.shop_name}
Product type: ${input.product_types}
${input.shop_owner_first_name ? `Owner: ${input.shop_owner_first_name}` : ""}
${input.shop_story_brief ? `Story: ${input.shop_story_brief}` : ""}

Write all 4 policy sections. JSON only.`;

  const result = await callGemini({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.55,
    maxOutputTokens: 4096,
  });

  if (!result.ok || !result.text) {
    return { ok: false, error: result.error };
  }

  let policies: Record<string, string>;
  try {
    const cleaned = result.text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();
    policies = JSON.parse(cleaned);
  } catch (err) {
    return {
      ok: false,
      error: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const policiesDir = path.join(HOME, "Documents/businesses", tenant, "policies");
  await fs.mkdir(policiesDir, { recursive: true });
  const paths: string[] = [];

  for (const key of ["about", "shipping", "returns", "privacy"] as const) {
    const content = policies[key] || "";
    if (!content) continue;
    const p = path.join(policiesDir, `${key}.md`);
    await fs.writeFile(
      p,
      `# ${key.toUpperCase()} — ${input.shop_name}\n\n${content}\n\n---\n_Generated ${new Date().toISOString()}. Copy → Etsy shop settings._\n`,
      "utf8"
    );
    paths.push(p);
  }

  await auditLog({
    action: "etsy_policies_generated",
    actor: "automated:etsy-shop-policies-generator",
    customer_slug: tenant,
    details: {
      shop_name: input.shop_name,
      sections_written: paths.length,
    },
    skill_invoked: "etsy-shop-policies-generator",
    actor_source: "skill-runner",
  });

  return { ok: true, paths, policies };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<PoliciesInput> | undefined;
  if (!inputs?.shop_name || !inputs.product_types) {
    return {
      ok: false,
      skill: "etsy-shop-policies-generator",
      path: "hand-coded",
      error: "missing required inputs: shop_name + product_types",
    };
  }
  const result = await generatePolicies({
    shop_name: inputs.shop_name,
    product_types: inputs.product_types,
    shop_owner_first_name: inputs.shop_owner_first_name,
    shop_story_brief: inputs.shop_story_brief,
    tenant: inputs.tenant,
  });
  return {
    ok: result.ok,
    skill: "etsy-shop-policies-generator",
    path: "hand-coded",
    result: { sections_written: result.paths?.length ?? 0 },
    artifacts: result.paths || [],
    error: result.error,
  };
}
