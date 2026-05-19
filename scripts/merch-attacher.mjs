#!/usr/bin/env node
/**
 * merch-attacher.mjs
 *
 * Attaches print-on-demand merch capability to ANY existing tenant.
 * Day14 default: every business sells merch.
 *
 * Reads the tenant's CONSTITUTION + brand-identity.json + competitor-research.json
 * to generate 5-10 brand-aligned merch designs. Creates Printify products as
 * drafts. Updates tenant's site to surface merch.
 *
 * USAGE: node merch-attacher.mjs --slug X [--count 5] [--product-type mug]
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");
const SHARED_OUTBOX = path.join(BIZ, "_shared/telegram/outbox");
const GEMINI_MODEL = "gemini-2.5-flash";
const POLLINATIONS_MODEL = "flux";
const PRINTIFY_API = "https://api.printify.com/v1";

function args() {
  const a = process.argv.slice(2);
  const out = { count: 5, product_type: "mug" };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--slug") out.slug = a[++i];
    else if (a[i] === "--count") out.count = parseInt(a[++i], 10);
    else if (a[i] === "--product-type") out.product_type = a[++i];
  }
  if (!out.slug) {
    console.error("Usage: merch-attacher.mjs --slug X [--count 5] [--product-type mug]");
    process.exit(1);
  }
  return out;
}

async function loadEnv() {
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function callGemini(prompt, key, temp = 0.8) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: temp, maxOutputTokens: 5000 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function parseJson(raw) {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
  const arrS = cleaned.indexOf("["), arrE = cleaned.lastIndexOf("]");
  const objS = cleaned.indexOf("{"), objE = cleaned.lastIndexOf("}");
  if (arrS !== -1 && (objS === -1 || arrS < objS)) return JSON.parse(cleaned.slice(arrS, arrE + 1));
  return JSON.parse(cleaned.slice(objS, objE + 1));
}

async function callPollinations(prompt, seed) {
  const enhanced = prompt + " High resolution. Crisp clear typography. Print-ready quality. No misspellings.";
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced).slice(0, 1900)}?width=1024&height=1024&model=${POLLINATIONS_MODEL}&nologo=true&enhance=true&seed=${seed}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`pollinations ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 5000) throw new Error(`pollinations payload too small`);
  return buf;
}

async function getShopBlueprintProvider(key, productType) {
  const sR = await fetch(`${PRINTIFY_API}/shops.json`, { headers: { Authorization: `Bearer ${key}` } });
  const shops = await sR.json();
  if (!shops.length) throw new Error("no Printify shops");
  const shopId = shops[0].id;
  const bR = await fetch(`${PRINTIFY_API}/catalog/blueprints.json`, { headers: { Authorization: `Bearer ${key}` } });
  const bps = await bR.json();
  const target = productType === "mug" ? "mug" : productType === "tee" ? "t-shirt" : productType;
  const picked = bps
    .map((b) => {
      const t = (b.title || "").toLowerCase();
      if (!t.includes(target)) return null;
      let s = 0;
      if (productType === "mug" && (t.includes("11oz") || t.includes("11 oz"))) s += 10;
      if (productType === "mug" && t.includes("ceramic")) s += 5;
      if (productType === "tee" && t.includes("unisex")) s += 5;
      if (t.includes("travel") || t.includes("enamel") || t.includes("magic")) s -= 5;
      return { id: b.id, title: b.title, score: s };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)[0];
  if (!picked) throw new Error(`no ${target} blueprint`);
  const pR = await fetch(`${PRINTIFY_API}/catalog/blueprints/${picked.id}/print_providers.json`, { headers: { Authorization: `Bearer ${key}` } });
  const providers = await pR.json();
  const vR = await fetch(`${PRINTIFY_API}/catalog/blueprints/${picked.id}/print_providers/${providers[0].id}/variants.json`, { headers: { Authorization: `Bearer ${key}` } });
  const vData = await vR.json();
  return { shopId, blueprintId: picked.id, providerId: providers[0].id, variants: vData.variants || [] };
}

async function uploadImage(key, imagePath) {
  const buf = await fs.readFile(imagePath);
  const r = await fetch(`${PRINTIFY_API}/uploads/images.json`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ file_name: path.basename(imagePath), contents: buf.toString("base64") }),
  });
  if (!r.ok) throw new Error(`upload ${r.status}`);
  return (await r.json()).id;
}

async function createProduct(key, ctx, concept, imageId, priceCents) {
  const variantIds = ctx.variants.map((v) => v.id);
  const r = await fetch(`${PRINTIFY_API}/shops/${ctx.shopId}/products.json`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      title: concept.title,
      description: concept.description,
      blueprint_id: ctx.blueprintId,
      print_provider_id: ctx.providerId,
      tags: concept.tags,
      variants: variantIds.map((id) => ({ id, price: priceCents, is_enabled: true })),
      print_areas: [{ variant_ids: variantIds, placeholders: [{ position: "front", images: [{ id: imageId, x: 0.5, y: 0.5, scale: 1.0, angle: 0 }] }] }],
    }),
  });
  if (!r.ok) throw new Error(`create ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()).id;
}

async function loadTenantContext(slug) {
  const tenantDir = path.join(BIZ, slug);
  const out = { slug };
  const constPath = path.join(tenantDir, "CONSTITUTION.md");
  if (existsSync(constPath)) out.constitution = await fs.readFile(constPath, "utf8");
  const idPath = path.join(tenantDir, "brand-identity.json");
  if (existsSync(idPath)) out.identity = JSON.parse(await fs.readFile(idPath, "utf8"));
  const tenantsPath = path.join(BIZ, "_shared/tenants.json");
  if (existsSync(tenantsPath)) {
    const data = JSON.parse(await fs.readFile(tenantsPath, "utf8"));
    out.tenant = (data.tenants || []).find((t) => t.slug === slug);
  }
  out.tenantDir = tenantDir;
  return out;
}

async function main() {
  const { slug, count, product_type } = args();
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
  if (!env.PRINTIFY_API_KEY) throw new Error("PRINTIFY_API_KEY missing");

  const ctx = await loadTenantContext(slug);
  if (!ctx.constitution) throw new Error(`No CONSTITUTION.md at ${ctx.tenantDir} — run business-bootstrap first`);

  const display = ctx.tenant?.display_name || slug;
  console.log(`\n=== Attaching merch to ${display} (${slug}) ===\n`);

  // Generate concepts
  console.log(`→ Generating ${count} brand-aligned ${product_type} concepts...`);
  const prompt = `You are designing merch for "${display}". Read the constitution + brand identity. Match the voice exactly.

CONSTITUTION:
${ctx.constitution.slice(0, 3000)}

BRAND IDENTITY:
${ctx.identity ? JSON.stringify(ctx.identity, null, 2).slice(0, 1500) : "(none yet)"}

TASK: Generate ${count} ${product_type} designs. Each is ONE quote on a ${product_type}. The merch should:
- Feel like an inside-joke from this brand (not generic)
- Use a variety of visual styles (different aesthetics per item)
- Be giftable / sharable / Instagrammable

Return STRICT JSON array:
[
  {
    "slug": "kebab-case-3-to-5-words",
    "quote": "exact text on the merch (max 12 words)",
    "visual": "one-sentence visual style description",
    "title": "SEO product title (60-80 chars)",
    "description": "product description (80-150 words)",
    "tags": ["10 tags, max 20 chars each"]
  },
  ... ${count} total
]`;

  const concepts = parseJson(await callGemini(prompt, env.GEMINI_API_KEY));
  console.log(`  ✓ ${concepts.length} concepts`);

  // Discover Printify catalog
  console.log("→ Discovering Printify catalog...");
  const cat = await getShopBlueprintProvider(env.PRINTIFY_API_KEY, product_type);
  const priceCents = product_type === "mug" ? 1899 : product_type === "tee" ? 2499 : product_type === "hoodie" ? 3999 : 1999;

  // Generate + create
  const imgDir = path.join(ctx.tenantDir, "generated-images");
  await fs.mkdir(imgDir, { recursive: true });

  const results = [];
  for (let i = 0; i < concepts.length; i++) {
    const c = concepts[i];
    process.stdout.write(`[${i + 1}/${concepts.length}] ${c.slug.padEnd(30)} `);
    try {
      const imgPrompt = `Print-on-demand ${product_type} design. Square 1:1. Large readable typography: "${c.quote}". Visual style: ${c.visual}. White background. Print-ready. No watermarks.`;
      const imgBuf = await callPollinations(imgPrompt, 2000 + i);
      const imgPath = path.join(imgDir, `merch-${c.slug}.png`);
      await fs.writeFile(imgPath, imgBuf);
      const imageId = await uploadImage(env.PRINTIFY_API_KEY, imgPath);
      const productId = await createProduct(env.PRINTIFY_API_KEY, cat, c, imageId, priceCents);
      console.log(`✓ ${productId}`);
      results.push({ ok: true, slug: c.slug, productId, productUrl: `https://printify.com/app/products/${productId}` });
    } catch (err) {
      console.log(`✗ ${err.message.slice(0, 80)}`);
      results.push({ ok: false, slug: c.slug, error: err.message });
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  // Write manifest
  await fs.writeFile(
    path.join(ctx.tenantDir, "merch-manifest.json"),
    JSON.stringify({ attached_at: new Date().toISOString(), product_type, count: results.length, results }, null, 2)
  );

  // Telegram
  if (env.TELEGRAM_CHAT_ID) {
    await fs.mkdir(SHARED_OUTBOX, { recursive: true });
    const ok = results.filter((r) => r.ok).length;
    await fs.writeFile(
      path.join(SHARED_OUTBOX, `${Date.now()}-merch-${slug}.json`),
      JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `🛒 *Merch attached to ${display}*\n\n${ok}/${results.length} ${product_type} drafts created in Printify.\nTap publish on each to go live.`,
        parse_mode: "Markdown",
        urgency: "P3",
        queued_at: new Date().toISOString(),
        sent_at: null,
        tenant: slug,
      }, null, 2)
    );
  }

  const ok = results.filter((r) => r.ok).length;
  console.log(`\n=== ${ok}/${results.length} merch products created for ${display} ===`);
}

main().catch((err) => { console.error("FATAL:", err.message); process.exit(1); });
