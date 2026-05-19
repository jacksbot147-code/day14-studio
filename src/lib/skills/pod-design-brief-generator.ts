/**
 * pod-design-brief-generator — hand-coded impl.
 *
 * Given a niche + product type, generates 5-8 design briefs ready for
 * Midjourney/DALL-E/Imagen image generation. Each brief is a complete
 * prompt with style, mood, colors, typography hints.
 *
 * Saves to ~/Documents/businesses/{tenant}/design-briefs/{niche-slug}.md.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { callGemini } from "../gemini-call";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();

interface DesignBriefInput {
  niche: string; // "perimenopausal moms with humor", "single dads", etc.
  product_type: "mug" | "tee" | "sweatshirt" | "poster" | "tote" | "all";
  design_voice?: "humor" | "defiant" | "warm" | "minimal" | "vintage" | "bold";
  tenant?: string;
}

const SYSTEM_PROMPT = `You generate POD design briefs — ready-to-paste prompts for Midjourney/DALL-E/Imagen.

POD design rules:
- Designs must work at small (mug-size) and large (poster-size) scales
- Text on apparel: BIG, BOLD, readable from 6 feet away
- Avoid copyrighted refs, celebrity faces, trademarked phrases
- Mug designs: wrap-around or center-front, work on white + colored mugs
- T-shirt designs: simple high-contrast, work on black AND white shirts
- Poster designs: more detail OK; portrait orientation common
- Tote designs: single graphic, NOT busy
- Color limits: 3-4 max colors for printability

For each brief, specify:
- The CORE LINE/PHRASE (if text-based) — has to be tight, no AI-stink
- Visual direction (illustration style, typography style, colors)
- Mood
- Variations (e.g. same design but blue/pink/black versions)

Return ONLY JSON, no preamble:
{
  "design_set": [
    {
      "number": 1,
      "concept": "1-line summary",
      "headline_text": "the actual words on the design (if any)",
      "midjourney_prompt": "full prompt ready to paste",
      "dall_e_prompt": "alternate prompt for DALL-E",
      "color_palette": ["#hex1", "#hex2", "#hex3"],
      "product_fit": ["mug", "tee", "tote"],
      "ar": "1:1 for mug, 4:5 for poster"
    }
  ]
}

Generate 5-8 design briefs. Each should be DIFFERENT angle/concept, not 8 variants of the same thing.`;

export async function generateDesignBriefs(input: DesignBriefInput): Promise<{
  ok: boolean;
  path?: string;
  briefs?: Record<string, unknown>;
  error?: string;
}> {
  const tenant = input.tenant || "pod-store-1";

  const prompt = `Niche: ${input.niche}
Product type: ${input.product_type}
${input.design_voice ? `Design voice: ${input.design_voice}` : "Design voice: pick what fits best (humor often wins for POD)"}

Generate 5-8 design briefs. Each must be a different concept angle. JSON only.`;

  const result = await callGemini({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.85,
    maxOutputTokens: 4096,
  });

  if (!result.ok || !result.text) {
    return { ok: false, error: result.error };
  }

  let briefs: Record<string, unknown>;
  try {
    const cleaned = result.text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();
    briefs = JSON.parse(cleaned);
  } catch (err) {
    return {
      ok: false,
      error: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const designSet = (briefs.design_set as Array<Record<string, unknown>>) || [];

  const slug = input.niche
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  const briefsDir = path.join(HOME, "Documents/businesses", tenant, "design-briefs");
  await fs.mkdir(briefsDir, { recursive: true });
  const filePath = path.join(briefsDir, `${slug}-${input.product_type}.md`);

  const lines: string[] = [];
  lines.push(`# Design briefs: ${input.niche} × ${input.product_type}`);
  lines.push("");
  lines.push(`*${new Date().toISOString()}*`);
  lines.push(`Voice: ${input.design_voice || "auto"}`);
  lines.push("");

  designSet.forEach((d, i) => {
    lines.push(`## Brief ${d.number || i + 1}: ${d.concept}`);
    lines.push("");
    if (d.headline_text) {
      lines.push(`**Headline text:** _"${d.headline_text}"_`);
      lines.push("");
    }
    lines.push(`**Color palette:** ${Array.isArray(d.color_palette) ? (d.color_palette as string[]).join(" · ") : "?"}`);
    lines.push(`**Product fit:** ${Array.isArray(d.product_fit) ? (d.product_fit as string[]).join(", ") : "?"}`);
    lines.push("");
    lines.push(`### Midjourney prompt`);
    lines.push("```");
    lines.push(`${d.midjourney_prompt} --ar ${d.ar || "1:1"}`);
    lines.push("```");
    lines.push("");
    if (d.dall_e_prompt) {
      lines.push(`### DALL-E prompt (alternate)`);
      lines.push("```");
      lines.push(`${d.dall_e_prompt}`);
      lines.push("```");
      lines.push("");
    }
  });

  await fs.writeFile(filePath, lines.join("\n"), "utf8");

  await auditLog({
    action: "pod_design_briefs_generated",
    actor: "automated:pod-design-brief-generator",
    customer_slug: tenant,
    details: {
      niche: input.niche,
      product_type: input.product_type,
      brief_count: designSet.length,
      path: filePath,
    },
    skill_invoked: "pod-design-brief-generator",
    actor_source: "skill-runner",
  });

  return { ok: true, path: filePath, briefs };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<DesignBriefInput> | undefined;
  if (!inputs?.niche || !inputs.product_type) {
    return {
      ok: false,
      skill: "pod-design-brief-generator",
      path: "hand-coded",
      error: "missing required inputs: niche + product_type",
    };
  }
  const result = await generateDesignBriefs({
    niche: inputs.niche,
    product_type: inputs.product_type,
    design_voice: inputs.design_voice,
    tenant: inputs.tenant,
  });
  return {
    ok: result.ok,
    skill: "pod-design-brief-generator",
    path: "hand-coded",
    result: {
      brief_count: ((result.briefs?.design_set as unknown[]) || []).length,
    },
    artifacts: result.path ? [result.path] : [],
    error: result.error,
  };
}
