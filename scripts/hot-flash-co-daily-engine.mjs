#!/usr/bin/env node
/**
 * hot-flash-co-daily-engine.mjs
 *
 * Daily content engine for Hot Flash Co. Runs once/day (LaunchAgent).
 *
 * Each run:
 *   1. Reads the constitution + recent design slugs (avoid duplicates)
 *   2. Generates 1 new design concept via Gemini (grounded search for trending
 *      menopause humor topics)
 *   3. Generates the image via Imagen 4
 *   4. Uploads to Printify, creates a product DRAFT on the auto-discovered
 *      mug blueprint
 *   5. Queues a Telegram Jack-tap card: "Publish or skip?"
 *
 * Jack taps publish in Printify when he likes it.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const TENANT = "hot-flash-co";
const TENANT_DIR = path.join(HOME, "Documents/businesses", TENANT);
const DESIGNS_DIR = path.join(TENANT_DIR, "generated-images");
const AUDIT_LOG = path.join(TENANT_DIR, "audit-log.jsonl");
const CONSTITUTION = path.join(TENANT_DIR, "CONSTITUTION.md");
const SHARED_OUTBOX = path.join(HOME, "Documents/businesses/_shared/telegram/outbox");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");

const PRINTIFY_API = "https://api.printify.com/v1";
const IMAGEN_MODEL = "imagen-4.0-generate-001";
const NANO_BANANA_MODEL = "gemini-2.5-flash-image"; // free-tier image fallback
const GEMINI_MODEL = "gemini-2.5-flash"; // grounded search needs this

async function loadEnv() {
  const text = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function audit(record) {
  const line = JSON.stringify({ ts: new Date().toISOString(), tenant: TENANT, ...record }) + "\n";
  await fs.mkdir(TENANT_DIR, { recursive: true });
  await fs.appendFile(AUDIT_LOG, line);
}

async function recentDesigns() {
  if (!existsSync(DESIGNS_DIR)) return [];
  const files = await fs.readdir(DESIGNS_DIR);
  return files.filter((f) => f.endsWith(".png")).map((f) => f.replace(".png", ""));
}

async function callGemini(prompt, apiKey, useGrounding = false) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 800 },
  };
  if (useGrounding) {
    body.tools = [{ google_search: {} }];
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function planNewDesign(env, existingSlugs) {
  const constitution = await fs.readFile(CONSTITUTION, "utf8");
  const prompt = `You are designing today's new mug for Hot Flash Co. Read the constitution carefully — voice, what's banned, what works.

CONSTITUTION:
${constitution.slice(0, 4000)}

DESIGNS ALREADY MADE (do NOT repeat themes):
${existingSlugs.join("\n")}

TASK:
1. Pick ONE specific perimenopause/menopause humor angle that's NOT covered above.
2. Write the exact quote (max 12 words, in the brand voice).
3. Pick ONE visual style from the library (don't repeat the most-recently used style).
4. Write a slug (lowercase, hyphens, 3-5 words).
5. Write an SEO-optimized Etsy/POD title (60-80 chars).
6. Write a product description (80-150 words).
7. Write 10 SEO tags (lowercase, max 20 chars each, comma-separated).

Return STRICT JSON only, no preamble:
{
  "slug": "...",
  "quote": "...",
  "visual": "...",
  "title": "...",
  "description": "...",
  "tags": ["...", "...", ...]
}`;

  const raw = await callGemini(prompt, env.GEMINI_API_KEY, true);
  // Strip ```json fences if present
  const json = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
  // Find the first { and last } in case there's extra prose
  const start = json.indexOf("{");
  const end = json.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`could not parse JSON from: ${raw.slice(0, 200)}`);
  return JSON.parse(json.slice(start, end + 1));
}

async function generateImage(design, env) {
  const fullPrompt = `Print-on-demand mug design. Square 1:1 composition centered for an 11oz ceramic mug. Large readable typography says exactly: "${design.quote}". Visual style: ${design.visual}. White or transparent background, no mug mockup, just the artwork itself. Print-ready, high contrast, no text outside the quote. No watermarks, no logos.`;

  // Try Imagen 4 (paid) first
  const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict?key=${env.GEMINI_API_KEY}`;
  const imagenRes = await fetch(imagenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: fullPrompt }],
      parameters: { sampleCount: 1, aspectRatio: "1:1", personGeneration: "allow_adult" },
    }),
  });

  let bytes;
  if (imagenRes.ok) {
    const data = await imagenRes.json();
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    if (b64) bytes = Buffer.from(b64, "base64");
  }

  // Fall back to nano-banana (free tier)
  if (!bytes) {
    const nbUrl = `https://generativelanguage.googleapis.com/v1beta/models/${NANO_BANANA_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
    const nbRes = await fetch(nbUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    });
    if (!nbRes.ok) throw new Error(`nano-banana ${nbRes.status}: ${(await nbRes.text()).slice(0, 200)}`);
    const data = await nbRes.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) {
      const b64 = p?.inlineData?.data || p?.inline_data?.data;
      if (b64) { bytes = Buffer.from(b64, "base64"); break; }
    }
    if (!bytes) throw new Error("nano-banana returned no image bytes");
  }

  const outPath = path.join(DESIGNS_DIR, `${design.slug}.png`);
  await fs.mkdir(DESIGNS_DIR, { recursive: true });
  await fs.writeFile(outPath, bytes);
  return outPath;
}

async function getShopBlueprintProvider(printifyKey) {
  // shop
  const shopsRes = await fetch(`${PRINTIFY_API}/shops.json`, {
    headers: { Authorization: `Bearer ${printifyKey}` },
  });
  if (!shopsRes.ok) throw new Error(`shops ${shopsRes.status}`);
  const shops = await shopsRes.json();
  if (!shops.length) throw new Error("no shops connected");
  const shopId = shops[0].id;

  // blueprints — find best mug
  const bpRes = await fetch(`${PRINTIFY_API}/catalog/blueprints.json`, {
    headers: { Authorization: `Bearer ${printifyKey}` },
  });
  const blueprints = await bpRes.json();
  const mug = blueprints
    .map((b) => {
      const t = (b.title || "").toLowerCase();
      if (!t.includes("mug")) return null;
      let s = 0;
      if (t.includes("11oz") || t.includes("11 oz")) s += 10;
      if (t.includes("ceramic")) s += 5;
      if (t.includes("white") && !t.includes("inside")) s += 3;
      if (t.includes("travel") || t.includes("enamel") || t.includes("magic") || t.includes("color")) s -= 5;
      return { id: b.id, title: b.title, score: s };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)[0];
  if (!mug) throw new Error("no mug blueprint found");

  // first provider for that blueprint
  const ppRes = await fetch(
    `${PRINTIFY_API}/catalog/blueprints/${mug.id}/print_providers.json`,
    { headers: { Authorization: `Bearer ${printifyKey}` } }
  );
  const providers = await ppRes.json();
  if (!providers.length) throw new Error(`no providers for blueprint ${mug.id}`);

  // variants
  const vRes = await fetch(
    `${PRINTIFY_API}/catalog/blueprints/${mug.id}/print_providers/${providers[0].id}/variants.json`,
    { headers: { Authorization: `Bearer ${printifyKey}` } }
  );
  const vData = await vRes.json();
  return {
    shopId,
    blueprintId: mug.id,
    blueprintTitle: mug.title,
    providerId: providers[0].id,
    providerTitle: providers[0].title,
    variants: vData.variants || [],
  };
}

async function uploadImage(printifyKey, imagePath) {
  const buf = await fs.readFile(imagePath);
  const res = await fetch(`${PRINTIFY_API}/uploads/images.json`, {
    method: "POST",
    headers: { Authorization: `Bearer ${printifyKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ file_name: path.basename(imagePath), contents: buf.toString("base64") }),
  });
  if (!res.ok) throw new Error(`upload ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.id;
}

async function createProductDraft(printifyKey, ctx, design, imageId) {
  const variantIds = ctx.variants.map((v) => v.id);
  const body = {
    title: design.title,
    description: design.description,
    blueprint_id: ctx.blueprintId,
    print_provider_id: ctx.providerId,
    tags: design.tags,
    variants: variantIds.map((id) => ({ id, price: 1899, is_enabled: true })),
    print_areas: [
      {
        variant_ids: variantIds,
        placeholders: [
          { position: "front", images: [{ id: imageId, x: 0.5, y: 0.5, scale: 1.0, angle: 0 }] },
        ],
      },
    ],
  };
  const res = await fetch(`${PRINTIFY_API}/shops/${ctx.shopId}/products.json`, {
    method: "POST",
    headers: { Authorization: `Bearer ${printifyKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`create ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.id;
}

async function queueJackTap(env, design, productId) {
  if (!env.TELEGRAM_CHAT_ID) return;
  await fs.mkdir(SHARED_OUTBOX, { recursive: true });
  const url = `https://printify.com/app/editor/${productId}`;
  const text =
    `📦 *New Hot Flash Co draft*\n\n` +
    `_"${design.quote}"_\n\n` +
    `Title: ${design.title}\n` +
    `Tags: ${design.tags.slice(0, 5).join(", ")}\n\n` +
    `Review & Publish: ${url}\n\n` +
    `Reply *skip ${design.slug}* to retire.`;
  const filename = `${Date.now()}-hot-flash-daily-${design.slug}.json`;
  await fs.writeFile(
    path.join(SHARED_OUTBOX, filename),
    JSON.stringify(
      {
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown",
        urgency: "P3",
        queued_at: new Date().toISOString(),
        sent_at: null,
        tap_required: true,
        tenant: TENANT,
      },
      null,
      2
    )
  );
}

async function main() {
  await audit({ actor: "daily-engine", action: "run_started" });
  console.log("=== Hot Flash Co daily engine ===");

  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
  if (!env.PRINTIFY_API_KEY) throw new Error("PRINTIFY_API_KEY missing");

  const existing = await recentDesigns();
  console.log(`Existing designs: ${existing.length}`);

  console.log("→ Planning new design via Gemini (grounded search)...");
  const design = await planNewDesign(env, existing);
  console.log(`  slug:  ${design.slug}`);
  console.log(`  quote: "${design.quote}"`);
  console.log(`  visual: ${design.visual.slice(0, 80)}...`);

  console.log("→ Generating image via Imagen 4...");
  const imagePath = await generateImage(design, env);
  console.log(`  saved ${imagePath}`);

  console.log("→ Fetching Printify shop + catalog...");
  const ctx = await getShopBlueprintProvider(env.PRINTIFY_API_KEY);
  console.log(`  shop ${ctx.shopId}, blueprint ${ctx.blueprintId} (${ctx.blueprintTitle}), provider ${ctx.providerId} (${ctx.providerTitle})`);

  console.log("→ Uploading to Printify...");
  const imageId = await uploadImage(env.PRINTIFY_API_KEY, imagePath);

  console.log("→ Creating product draft...");
  const productId = await createProductDraft(env.PRINTIFY_API_KEY, ctx, design, imageId);
  console.log(`  draft created: https://printify.com/app/editor/${productId}`);

  await queueJackTap(env, design, productId);
  await audit({
    actor: "daily-engine",
    action: "draft_created",
    slug: design.slug,
    product_id: productId,
    quote: design.quote,
  });
  console.log("\n✓ Jack-tap queued.");
}

main().catch(async (err) => {
  await audit({ actor: "daily-engine", action: "fatal_error", error: err.message }).catch(() => {});
  console.error("\nFATAL:", err.message);
  process.exit(1);
});
