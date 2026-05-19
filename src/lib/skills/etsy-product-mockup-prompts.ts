/**
 * etsy-product-mockup-prompts — hand-coded impl.
 *
 * Generates image-generator prompts (for Midjourney, DALL-E, Imagen, etc)
 * to produce Etsy product mockups. We don't generate the images here —
 * we produce 5-10 specific prompts Jack can paste into his image tool of
 * choice.
 *
 * Saves to ~/Documents/businesses/{tenant}/listings/mockups-{slug}.md.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { callGemini } from "../gemini-call";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();

interface MockupInput {
  product_name: string;
  product_description: string;
  format: "digital_planner" | "physical_print" | "physical_product" | "subscription" | "service";
  brand_style?: string; // "minimal pastel", "vintage warm", "modern editorial", etc.
  tenant?: string;
}

const SYSTEM_PROMPT = `You generate image-generator prompts for Etsy product mockups.

An Etsy listing typically has 10 image slots. The goals across the slots:
1. HERO — the product front-and-center on a clean background
2. LIFESTYLE — the product in use, in a real setting
3. DETAIL CLOSE-UP — texture, fine print, premium feel
4. SIZE / SCALE — show how big it is relative to common objects
5. WHAT'S INCLUDED — flat lay of all pieces if multiple
6. BEFORE/AFTER or COMPARISON — for trackers/planners showing filled-in example
7. IN-CONTEXT — being used by the target customer
8. CUSTOMER TESTIMONIAL TILE — image of a quote (Jack can drop this in)
9. INSTRUCTIONS / HOW IT WORKS — visual explainer
10. CTA / BRAND TILE — store name + tagline

For each image, write a complete, detailed image-generator prompt (works for Midjourney, DALL-E 3, Imagen). Each prompt should specify:
- Subject + composition
- Lighting + mood
- Color palette
- Background
- Style references (no copyrighted artists)
- Camera angle if relevant
- Aspect ratio (Etsy uses 4:3 or 5:4)

Return ONLY JSON, no preamble:
{
  "image_set": [
    {"slot": 1, "purpose": "hero", "prompt": "...", "ar": "4:3"},
    ...
  ]
}

Generate 6-10 prompts (skip slots that don't apply for digital products).`;

export async function generateMockupPrompts(input: MockupInput): Promise<{
  ok: boolean;
  path?: string;
  prompts?: Record<string, unknown>;
  error?: string;
}> {
  const tenant = input.tenant || "etsy-store-1";

  const prompt = `Product: ${input.product_name}
Description: ${input.product_description}
Format: ${input.format}
${input.brand_style ? `Brand style: ${input.brand_style}` : "Brand style: minimal, warm, premium feel"}

Generate the image set. JSON only.`;

  const result = await callGemini({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.75,
    maxOutputTokens: 4096,
  });

  if (!result.ok || !result.text) {
    return { ok: false, error: result.error };
  }

  let prompts: Record<string, unknown>;
  try {
    const cleaned = result.text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();
    prompts = JSON.parse(cleaned);
  } catch (err) {
    return {
      ok: false,
      error: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const imageSet = (prompts.image_set as Array<Record<string, string>>) || [];

  const slug = input.product_name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const listingsDir = path.join(HOME, "Documents/businesses", tenant, "listings");
  await fs.mkdir(listingsDir, { recursive: true });
  const filePath = path.join(listingsDir, `mockups-${slug}.md`);

  const lines: string[] = [];
  lines.push(`# Product mockup prompts: ${input.product_name}`);
  lines.push("");
  lines.push(`*${new Date().toISOString()}*`);
  lines.push("");
  lines.push(`Paste each prompt into Midjourney, DALL-E, or Imagen.`);
  lines.push(`Brand style: ${input.brand_style || "minimal, warm, premium feel"}`);
  lines.push("");
  for (const img of imageSet) {
    lines.push(`## Slot ${img.slot}: ${img.purpose}`);
    lines.push("");
    lines.push("```");
    lines.push(`${img.prompt} --ar ${img.ar || "4:3"}`);
    lines.push("```");
    lines.push("");
  }

  await fs.writeFile(filePath, lines.join("\n"), "utf8");

  await auditLog({
    action: "etsy_mockup_prompts_generated",
    actor: "automated:etsy-product-mockup-prompts",
    customer_slug: tenant,
    details: {
      product: input.product_name,
      prompt_count: imageSet.length,
      path: filePath,
    },
    skill_invoked: "etsy-product-mockup-prompts",
    actor_source: "skill-runner",
  });

  return { ok: true, path: filePath, prompts };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<MockupInput> | undefined;
  if (!inputs?.product_name || !inputs.product_description || !inputs.format) {
    return {
      ok: false,
      skill: "etsy-product-mockup-prompts",
      path: "hand-coded",
      error: "missing required inputs: product_name + product_description + format",
    };
  }
  const result = await generateMockupPrompts({
    product_name: inputs.product_name,
    product_description: inputs.product_description,
    format: inputs.format,
    brand_style: inputs.brand_style,
    tenant: inputs.tenant,
  });
  return {
    ok: result.ok,
    skill: "etsy-product-mockup-prompts",
    path: "hand-coded",
    result: {
      image_count: ((result.prompts?.image_set as unknown[]) || []).length,
    },
    artifacts: result.path ? [result.path] : [],
    error: result.error,
  };
}
