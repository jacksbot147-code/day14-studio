/**
 * printify-product-creator — hand-coded impl.
 *
 * Creates a Printify product from a design image + product type. Uses
 * Printify's REST API. Requires PRINTIFY_API_KEY in env (free tier
 * available with a Printify account).
 *
 * If no API key: writes a "ready-to-upload" manifest file instead so
 * Jack can paste-and-publish manually.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();
const PRINTIFY_API_BASE = "https://api.printify.com/v1";

interface PrintifyProductInput {
  title: string;
  description: string;
  design_image_path: string; // local PNG/JPG
  blueprint_id?: number; // Printify product blueprint (e.g., 5 = Bella Canvas 3001 tee)
  print_provider_id?: number;
  variants?: number[]; // variant IDs (color/size combos)
  tags?: string[];
  price_cents?: number;
  tenant?: string;
  // Catalog reference shortcuts:
  product_type?: "tee" | "mug" | "hoodie" | "sweatshirt" | "tote" | "poster";
}

// Common blueprint/provider mapping (Printify's catalog)
// These are well-tested defaults. Override with explicit IDs when needed.
const PRODUCT_DEFAULTS: Record<string, { blueprint_id: number; print_provider_id: number }> = {
  tee: { blueprint_id: 6, print_provider_id: 99 },          // Unisex Heavy Cotton Tee (Gildan)
  mug: { blueprint_id: 9, print_provider_id: 28 },          // Ceramic Mug 11oz
  hoodie: { blueprint_id: 77, print_provider_id: 99 },      // Heavy Blend Hoodie
  sweatshirt: { blueprint_id: 49, print_provider_id: 6 },   // Crewneck Sweatshirt
  tote: { blueprint_id: 19, print_provider_id: 99 },        // Tote Bag
  poster: { blueprint_id: 282, print_provider_id: 1 },      // Premium Matte Vertical Posters
};

async function getShops(apiKey: string): Promise<{ shopId: number | null; error?: string }> {
  const res = await fetch(`${PRINTIFY_API_BASE}/shops.json`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const errText = await res.text();
    return { shopId: null, error: `${res.status}: ${errText.slice(0, 200)}` };
  }
  const shops = (await res.json()) as Array<{ id: number; title: string }>;
  if (!shops.length) return { shopId: null, error: "no Printify shops connected" };
  return { shopId: shops[0]!.id };
}

async function uploadImage(apiKey: string, imagePath: string): Promise<{
  imageId: string | null;
  error?: string;
}> {
  const buf = await fs.readFile(imagePath);
  const filename = path.basename(imagePath);
  const res = await fetch(`${PRINTIFY_API_BASE}/uploads/images.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_name: filename,
      contents: buf.toString("base64"),
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    return { imageId: null, error: `${res.status}: ${errText.slice(0, 200)}` };
  }
  const data = (await res.json()) as { id?: string };
  return { imageId: data.id || null };
}

async function writeStubManifest(input: PrintifyProductInput): Promise<string> {
  const tenant = input.tenant || "pod-store-1";
  const draftsDir = path.join(HOME, "Documents/businesses", tenant, "printify-drafts");
  await fs.mkdir(draftsDir, { recursive: true });

  const slug = input.title.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  const filePath = path.join(draftsDir, `${slug}.md`);

  const lines: string[] = [];
  lines.push(`# Printify draft: ${input.title}`);
  lines.push("");
  lines.push(`*Generated ${new Date().toISOString()}*`);
  lines.push("");
  lines.push(`**PRINTIFY_API_KEY not set — this is a manual-upload manifest. Add the key to .env.local to enable real API upload.**`);
  lines.push("");
  lines.push(`## Product`);
  lines.push(`- Type: ${input.product_type || "?"}`);
  lines.push(`- Title: ${input.title}`);
  if (input.price_cents) lines.push(`- Price: $${(input.price_cents / 100).toFixed(2)}`);
  lines.push("");
  lines.push(`## Design`);
  lines.push(`- File: \`${input.design_image_path}\``);
  lines.push("");
  lines.push(`## Description`);
  lines.push(`${input.description}`);
  lines.push("");
  if (input.tags?.length) {
    lines.push(`## Tags`);
    for (const t of input.tags) lines.push(`- ${t}`);
    lines.push("");
  }
  lines.push(`## Manual upload steps`);
  lines.push(`1. Log into printify.com`);
  lines.push(`2. Pick "Add product" → choose ${input.product_type || "product type"}`);
  lines.push(`3. Upload \`${input.design_image_path}\``);
  lines.push(`4. Pick variants (colors + sizes)`);
  lines.push(`5. Paste title + description + tags above`);
  lines.push(`6. Set price`);
  lines.push(`7. Publish → push to Etsy/Shopify (if connected)`);

  await fs.writeFile(filePath, lines.join("\n"), "utf8");
  return filePath;
}

export async function createPrintifyProduct(input: PrintifyProductInput): Promise<{
  ok: boolean;
  printify_product_id?: string;
  draft_path?: string;
  error?: string;
}> {
  const apiKey = process.env.PRINTIFY_API_KEY;

  // No API key → write manual manifest
  if (!apiKey) {
    const draftPath = await writeStubManifest(input);
    await auditLog({
      action: "printify_draft_written_no_api",
      actor: "automated:printify-product-creator",
      customer_slug: input.tenant || "pod-store-1",
      details: { title: input.title, draft_path: draftPath },
      skill_invoked: "printify-product-creator",
      actor_source: "skill-runner",
    });
    return { ok: true, draft_path: draftPath };
  }

  // Verify image exists
  if (!existsSync(input.design_image_path)) {
    return { ok: false, error: `design image not found: ${input.design_image_path}` };
  }

  // Get shop
  const { shopId, error: shopErr } = await getShops(apiKey);
  if (!shopId) return { ok: false, error: shopErr || "no shop" };

  // Upload image
  const { imageId, error: uploadErr } = await uploadImage(apiKey, input.design_image_path);
  if (!imageId) return { ok: false, error: `image upload failed: ${uploadErr}` };

  // Resolve blueprint/provider
  let blueprintId = input.blueprint_id;
  let printProviderId = input.print_provider_id;
  if ((!blueprintId || !printProviderId) && input.product_type) {
    const def = PRODUCT_DEFAULTS[input.product_type];
    if (def) {
      blueprintId = blueprintId || def.blueprint_id;
      printProviderId = printProviderId || def.print_provider_id;
    }
  }
  if (!blueprintId || !printProviderId) {
    return { ok: false, error: "blueprint_id + print_provider_id (or product_type) required" };
  }

  // Build product payload — minimal viable; Jack reviews + publishes
  const variantIds = input.variants && input.variants.length > 0 ? input.variants : [];
  const productBody = {
    title: input.title,
    description: input.description,
    blueprint_id: blueprintId,
    print_provider_id: printProviderId,
    tags: input.tags || [],
    variants: variantIds.map((v) => ({
      id: v,
      price: input.price_cents || 2495,
      is_enabled: true,
    })),
    print_areas: [
      {
        variant_ids: variantIds,
        placeholders: [
          {
            position: "front",
            images: [{ id: imageId, x: 0.5, y: 0.5, scale: 1.0, angle: 0 }],
          },
        ],
      },
    ],
  };

  const createRes = await fetch(`${PRINTIFY_API_BASE}/shops/${shopId}/products.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(productBody),
  });
  if (!createRes.ok) {
    const errText = await createRes.text();
    return { ok: false, error: `create failed: ${createRes.status} ${errText.slice(0, 250)}` };
  }
  const data = (await createRes.json()) as { id?: string };

  await auditLog({
    action: "printify_product_created",
    actor: "automated:printify-product-creator",
    customer_slug: input.tenant || "pod-store-1",
    details: {
      title: input.title,
      product_id: data.id,
      shop_id: shopId,
    },
    skill_invoked: "printify-product-creator",
    actor_source: "skill-runner",
  });

  return { ok: true, printify_product_id: data.id };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<PrintifyProductInput> | undefined;
  if (!inputs?.title || !inputs.description || !inputs.design_image_path) {
    return {
      ok: false,
      skill: "printify-product-creator",
      path: "hand-coded",
      error: "missing inputs: title + description + design_image_path",
    };
  }
  const result = await createPrintifyProduct({
    title: inputs.title,
    description: inputs.description,
    design_image_path: inputs.design_image_path,
    blueprint_id: inputs.blueprint_id,
    print_provider_id: inputs.print_provider_id,
    variants: inputs.variants,
    tags: inputs.tags,
    price_cents: inputs.price_cents,
    tenant: inputs.tenant,
    product_type: inputs.product_type,
  });
  return {
    ok: result.ok,
    skill: "printify-product-creator",
    path: "hand-coded",
    result: {
      printify_product_id: result.printify_product_id,
      draft_path: result.draft_path,
    },
    artifacts: result.draft_path ? [result.draft_path] : [],
    error: result.error,
  };
}
