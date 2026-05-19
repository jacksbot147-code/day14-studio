/**
 * etsy-listing-writer — hand-coded impl.
 *
 * Given a product concept, generate a complete Etsy listing:
 *   - Title (140 chars max, SEO-optimized, front-loaded keywords)
 *   - Description (sections: who it's for, what's inside, how to use, format, FAQ)
 *   - 13 tags (all slots, mix of long-tail + short)
 *   - Materials list
 *   - Target price + reasoning
 *
 * Saves to ~/Documents/businesses/{tenant}/listings/{slug}.md.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { callGemini } from "../gemini-call";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();

interface ListingInput {
  product_name: string;
  product_description: string; // 1-2 sentences about what it is
  target_customer: string;
  format?: string; // "digital download", "physical print", "PDF + Notion template", etc.
  tenant?: string;
}

const SYSTEM_PROMPT = `You write production-ready Etsy listings for digital + physical products.

Rules:
- TITLE: max 140 chars, front-load the strongest keyword, 3-5 keywords total separated by | or comma. NO emojis. NO ALL CAPS. Real shoppers search for things like "perimenopause symptom tracker pdf doctor visit prep printable" — write for them.
- DESCRIPTION: sections in this order: HOOK (1-2 sentences, why this matters), WHO IT'S FOR (bulleted), WHAT'S INSIDE (bulleted, specific page counts / features), HOW TO USE (numbered, simple), FORMAT & DELIVERY (file types, sizes, delivery time), FAQ (3-4 common questions), TERMS (no refunds on digital, contact for issues).
- TAGS: exactly 13. Mix: 60% long-tail (3-4 words), 30% medium (2 words), 10% short (1 word). Each tag must be 20 chars or less. Lowercase. No special chars. Order them by relevance/intent.
- MATERIALS: if digital, list "PDF", "JPG", "PNG", "Notion template" etc. If physical, list real materials.
- PRICE: pick a number and explain in 1 sentence why (based on similar shop benchmarks, perceived value, completion time).

Return ONLY valid JSON, no preamble, no markdown fence:
{
  "title": "...",
  "description": "...",
  "tags": ["tag1", "tag2", ..., "tag13"],
  "materials": ["..."],
  "price_usd": NUMBER,
  "price_reasoning": "..."
}`;

export async function generateListing(input: ListingInput): Promise<{
  ok: boolean;
  path?: string;
  listing?: Record<string, unknown>;
  error?: string;
}> {
  const tenant = input.tenant || "etsy-store-1";

  const prompt = `Product: ${input.product_name}
Description: ${input.product_description}
Target customer: ${input.target_customer}
${input.format ? `Format: ${input.format}` : ""}

Generate the full Etsy listing. JSON only.`;

  const result = await callGemini({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.65,
    maxOutputTokens: 3072,
  });

  if (!result.ok || !result.text) {
    return { ok: false, error: result.error };
  }

  let listing: Record<string, unknown>;
  try {
    const cleaned = result.text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();
    listing = JSON.parse(cleaned);
  } catch (err) {
    return {
      ok: false,
      error: `JSON parse failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Validate tag count
  const tags = listing.tags as string[] | undefined;
  if (!Array.isArray(tags) || tags.length !== 13) {
    return {
      ok: false,
      error: `Expected 13 tags, got ${Array.isArray(tags) ? tags.length : "none"}`,
    };
  }
  // Check title length
  const title = String(listing.title || "");
  if (title.length > 140) {
    listing.title = title.slice(0, 137) + "...";
  }

  // Save
  const slug = input.product_name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const listingsDir = path.join(HOME, "Documents/businesses", tenant, "listings");
  await fs.mkdir(listingsDir, { recursive: true });
  const filePath = path.join(listingsDir, `${slug}.md`);

  const lines: string[] = [];
  lines.push(`---`);
  lines.push(`product: ${JSON.stringify(input.product_name)}`);
  lines.push(`status: draft`);
  lines.push(`tenant: ${tenant}`);
  lines.push(`generated_by: etsy-listing-writer`);
  lines.push(`generated_at: ${new Date().toISOString()}`);
  lines.push(`price_usd: ${listing.price_usd}`);
  lines.push(`---`);
  lines.push("");
  lines.push(`# Etsy Listing: ${input.product_name}`);
  lines.push("");
  lines.push(`## Title (${(listing.title as string).length}/140 chars)`);
  lines.push("");
  lines.push(`${listing.title}`);
  lines.push("");
  lines.push(`## Description`);
  lines.push("");
  lines.push(`${listing.description}`);
  lines.push("");
  lines.push(`## Tags (13/13)`);
  lines.push("");
  for (const t of tags) {
    lines.push(`- ${t}`);
  }
  lines.push("");
  lines.push(`## Materials`);
  for (const m of (listing.materials as string[]) || []) {
    lines.push(`- ${m}`);
  }
  lines.push("");
  lines.push(`## Price: $${listing.price_usd}`);
  lines.push("");
  lines.push(`*${listing.price_reasoning}*`);
  lines.push("");
  lines.push(`---`);
  lines.push(`_Ready to copy → Etsy listing form_`);

  await fs.writeFile(filePath, lines.join("\n"), "utf8");

  await auditLog({
    action: "etsy_listing_drafted",
    actor: "automated:etsy-listing-writer",
    customer_slug: tenant,
    details: {
      product: input.product_name,
      price: listing.price_usd,
      path: filePath,
    },
    skill_invoked: "etsy-listing-writer",
    actor_source: "skill-runner",
  });

  return { ok: true, path: filePath, listing };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<ListingInput> | undefined;
  if (!inputs?.product_name || !inputs.product_description || !inputs.target_customer) {
    return {
      ok: false,
      skill: "etsy-listing-writer",
      path: "hand-coded",
      error: "missing required inputs: product_name + product_description + target_customer",
    };
  }
  const result = await generateListing({
    product_name: inputs.product_name,
    product_description: inputs.product_description,
    target_customer: inputs.target_customer,
    format: inputs.format,
    tenant: inputs.tenant,
  });
  return {
    ok: result.ok,
    skill: "etsy-listing-writer",
    path: "hand-coded",
    result: result.listing,
    artifacts: result.path ? [result.path] : [],
    error: result.error,
  };
}
