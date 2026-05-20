#!/usr/bin/env node
/**
 * new-store-bootstrap.mjs
 *
 * One command to launch an entire POD store + autopilot.
 *
 * USAGE:
 *   node scripts/new-store-bootstrap.mjs \
 *     --slug "quiet-revolt" \
 *     --display-name "Quiet Revolt" \
 *     --niche "introvert humor for the chronically over-stimulated" \
 *     [--product-type mug] \
 *     [--voice-notes-file path/to/notes.md] \
 *     [--skip-products]   (only generate constitution + site)
 *
 * WHAT IT DOES:
 *   1. Validates the slug doesn't collide with an existing tenant
 *   2. Generates a brand CONSTITUTION via Gemini using the hot-flash-co
 *      constitution as the structural template
 *   3. Creates the tenant directory + registers in tenants.json
 *   4. Generates 10 product concepts via Gemini (using the constitution)
 *   5. Generates 10 images via Imagen → nano-banana fallback
 *   6. Creates 10 Printify products as DRAFTS (Jack publishes manually)
 *   7. Drops tenant-specific copies of daily-engine + orders-watcher +
 *      marketing-engine into scripts/<slug>-*.mjs
 *   8. Installs LaunchAgents for those 3 scripts
 *   9. Scaffolds a brand page at src/app/brands/<slug>/page.tsx
 *  10. Sends Telegram summary: "Store launched, X products live, Y/10 designs ok"
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import process from "node:process";
import { llmCall } from "./_generic/llm-call.mjs";

const HOME = homedir();
const STUDIO = path.join(HOME, "Documents/studio");
const SCRIPTS = path.join(STUDIO, "scripts");
const BIZ = path.join(HOME, "Documents/businesses");
const SHARED = path.join(BIZ, "_shared");
const TENANTS_FILE = path.join(SHARED, "tenants.json");
const SHARED_OUTBOX = path.join(SHARED, "telegram/outbox");
const ENV_FILE = path.join(STUDIO, ".env.local");
const TEMPLATE_CONSTITUTION = path.join(BIZ, "hot-flash-co/CONSTITUTION.md");

const IMAGEN_MODEL = "imagen-4.0-generate-001";
const NANO_BANANA_MODEL = "gemini-2.5-flash-image";
const GEMINI_MODEL = "gemini-2.5-flash";
const PRINTIFY_API = "https://api.printify.com/v1";

// ===== CLI parsing =====
function parseArgs() {
  const args = { product_type: "mug", skip_products: false };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === "--slug") args.slug = a[++i];
    else if (k === "--display-name") args.display_name = a[++i];
    else if (k === "--niche") args.niche = a[++i];
    else if (k === "--product-type") args.product_type = a[++i];
    else if (k === "--voice-notes-file") args.voice_notes_file = a[++i];
    else if (k === "--skip-products") args.skip_products = true;
  }
  if (!args.slug || !args.display_name || !args.niche) {
    console.error(`Usage: new-store-bootstrap.mjs --slug X --display-name "X" --niche "X"`);
    process.exit(1);
  }
  return args;
}

// ===== Env =====
async function loadEnv() {
  const text = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

// ===== LLM — Gemini first, automatic Claude fallback on quota/429 =====
async function callGemini(prompt, _apiKey, temperature = 0.7, maxTokens = 4000) {
  const r = await llmCall({ prompt, temperature, maxTokens });
  if (!r.ok) throw new Error(r.error || "llm call failed");
  return r.text;
}

function parseJsonFromText(raw) {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const arrStart = cleaned.indexOf("[");
  const arrEnd = cleaned.lastIndexOf("]");
  // Prefer the larger of object vs array
  if (arrStart !== -1 && (start === -1 || arrStart < start)) {
    return JSON.parse(cleaned.slice(arrStart, arrEnd + 1));
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

// ===== Image gen with fallback =====
async function generateImage(prompt, geminiKey, outPath) {
  // Try Imagen 4
  const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict?key=${geminiKey}`;
  const imagenRes = await fetch(imagenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: "1:1", personGeneration: "allow_adult" },
    }),
  });
  if (imagenRes.ok) {
    const data = await imagenRes.json();
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    if (b64) {
      await fs.writeFile(outPath, Buffer.from(b64, "base64"));
      return { ok: true, model: "imagen-4" };
    }
  }
  // Fallback: nano-banana
  const nbUrl = `https://generativelanguage.googleapis.com/v1beta/models/${NANO_BANANA_MODEL}:generateContent?key=${geminiKey}`;
  const nbRes = await fetch(nbUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  if (!nbRes.ok) return { ok: false, error: `nano-banana ${nbRes.status}` };
  const data = await nbRes.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    const b64 = p?.inlineData?.data || p?.inline_data?.data;
    if (b64) {
      await fs.writeFile(outPath, Buffer.from(b64, "base64"));
      return { ok: true, model: "nano-banana" };
    }
  }
  return { ok: false, error: "no image bytes from either model" };
}

// ===== Steps =====

async function validateSlug(slug) {
  if (!/^[a-z][a-z0-9-]{2,30}$/.test(slug)) {
    throw new Error(`slug "${slug}" invalid (must be lowercase alphanumeric+hyphens, 3-30 chars)`);
  }
  if (existsSync(path.join(BIZ, slug))) {
    throw new Error(`tenant "${slug}" already exists at ${path.join(BIZ, slug)}`);
  }
}

async function generateConstitution(args, env) {
  const template = await fs.readFile(TEMPLATE_CONSTITUTION, "utf8");
  let voiceNotes = "";
  if (args.voice_notes_file && existsSync(args.voice_notes_file)) {
    voiceNotes = await fs.readFile(args.voice_notes_file, "utf8");
  }
  const prompt = `You are writing the operating constitution for a brand-new Day14 tenant called "${args.display_name}" (slug: ${args.slug}).

NICHE: ${args.niche}

USER NOTES ON VOICE/STYLE:
${voiceNotes || "(none — pick a voice that fits the niche, stay specific, avoid clichés)"}

STRUCTURAL TEMPLATE (mirror this format exactly but with content tailored to ${args.display_name}):
${template}

Write the new constitution. Replace EVERY reference to "Hot Flash Co", "perimenopause", "menopause", "Pause Lab" etc. with content appropriate to "${args.display_name}" and its niche. Keep the headings, structure, and inheritance section IDENTICAL. The voice rules should be 8-12 specific yes/no items, not generic. The visual library should have 6-10 niche-appropriate styles.

Output ONLY the markdown content. No code fences. Begin with the title line.`;
  const out = await callGemini(prompt, env.GEMINI_API_KEY, 0.6, 4000);
  return out.replace(/^```markdown\s*/, "").replace(/```\s*$/, "").trim();
}

async function generateProductConcepts(args, constitution, env, n = 10) {
  const prompt = `You are designing the launch lineup for "${args.display_name}" (${args.niche}).

CONSTITUTION (read carefully — voice + rules):
${constitution.slice(0, 4000)}

Generate exactly ${n} product concepts. Each is one ${args.product_type} design with a single quote on it. Use a VARIETY of visual styles from the visual library (do not repeat any style).

Return STRICT JSON array, no preamble:
[
  {
    "slug": "kebab-case-3-to-5-words",
    "quote": "exact mug text (max 12 words)",
    "visual": "one-sentence visual style description",
    "title": "SEO product title (60-80 chars)",
    "description": "product description (80-150 words)",
    "tags": ["tag1", "tag2", ... 10 tags total, each max 20 chars]
  },
  ... ${n} total
]`;
  const raw = await callGemini(prompt, env.GEMINI_API_KEY, 0.85, 6000);
  return parseJsonFromText(raw);
}

async function getShopBlueprintProvider(printifyKey, productType) {
  const shopsRes = await fetch(`${PRINTIFY_API}/shops.json`, {
    headers: { Authorization: `Bearer ${printifyKey}` },
  });
  if (!shopsRes.ok) throw new Error(`shops ${shopsRes.status}`);
  const shops = await shopsRes.json();
  if (!shops.length) throw new Error("no Printify shops — create a Pop-Up Store first");
  const shopId = shops[0].id;

  const bpRes = await fetch(`${PRINTIFY_API}/catalog/blueprints.json`, {
    headers: { Authorization: `Bearer ${printifyKey}` },
  });
  const blueprints = await bpRes.json();
  const targetWord = productType === "mug" ? "mug"
    : productType === "tee" ? "t-shirt"
    : productType === "hoodie" ? "hoodie"
    : productType === "tote" ? "tote"
    : productType === "poster" ? "poster"
    : productType;
  const picked = blueprints
    .map((b) => {
      const t = (b.title || "").toLowerCase();
      if (!t.includes(targetWord)) return null;
      let s = 0;
      if (productType === "mug" && (t.includes("11oz") || t.includes("11 oz"))) s += 10;
      if (productType === "mug" && t.includes("ceramic")) s += 5;
      if (productType === "tee" && t.includes("unisex")) s += 5;
      if (productType === "tee" && t.includes("cotton")) s += 5;
      if (t.includes("white") && !t.includes("inside")) s += 2;
      if (t.includes("travel") || t.includes("enamel") || t.includes("magic")) s -= 5;
      return { id: b.id, title: b.title, score: s };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)[0];
  if (!picked) throw new Error(`no ${targetWord} blueprint found`);

  const ppRes = await fetch(
    `${PRINTIFY_API}/catalog/blueprints/${picked.id}/print_providers.json`,
    { headers: { Authorization: `Bearer ${printifyKey}` } }
  );
  const providers = await ppRes.json();
  if (!providers.length) throw new Error(`no providers for blueprint ${picked.id}`);

  const vRes = await fetch(
    `${PRINTIFY_API}/catalog/blueprints/${picked.id}/print_providers/${providers[0].id}/variants.json`,
    { headers: { Authorization: `Bearer ${printifyKey}` } }
  );
  const vData = await vRes.json();
  return {
    shopId,
    blueprintId: picked.id,
    blueprintTitle: picked.title,
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
  if (!res.ok) throw new Error(`upload ${res.status}`);
  const data = await res.json();
  return data.id;
}

async function createProduct(printifyKey, ctx, concept, imageId, priceCents) {
  const variantIds = ctx.variants.map((v) => v.id);
  const body = {
    title: concept.title,
    description: concept.description,
    blueprint_id: ctx.blueprintId,
    print_provider_id: ctx.providerId,
    tags: concept.tags,
    variants: variantIds.map((id) => ({ id, price: priceCents, is_enabled: true })),
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
  if (!res.ok) throw new Error(`create ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.id;
}

async function generateTenantScript(args, sourceFile, targetFile) {
  let src = await fs.readFile(sourceFile, "utf8");
  src = src
    .replace(/const TENANT = "hot-flash-co";/g, `const TENANT = "${args.slug}";`)
    .replace(/hot-flash-co/g, args.slug)
    .replace(/Hot Flash Co/g, args.display_name);
  await fs.writeFile(targetFile, src);
  await fs.chmod(targetFile, 0o755);
}

async function generateBrandSitePage(args, constitution) {
  const dir = path.join(STUDIO, `src/app/brands/${args.slug}`);
  await fs.mkdir(dir, { recursive: true });

  const tagline = constitution.match(/^[A-Z].*?\n\n([^\n]+)/m)?.[1]?.slice(0, 200) || `${args.display_name} — ${args.niche}`;

  const page = `import type { Metadata } from "next";
import { BrandStorefront } from "@/components/BrandStorefront";

export const metadata: Metadata = {
  title: "${args.display_name} — ${args.niche}",
  description: ${JSON.stringify(tagline)},
};

export default function ${args.slug.replace(/-/g, "_").replace(/^./, c => c.toUpperCase())}Page() {
  return <BrandStorefront tenantSlug="${args.slug}" displayName="${args.display_name}" niche="${args.niche.replace(/"/g, '\\"')}" />;
}
`;
  await fs.writeFile(path.join(dir, "page.tsx"), page);
  return path.join(dir, "page.tsx");
}

async function registerTenant(args) {
  let data = { tenants: [], tenant_types: {} };
  if (existsSync(TENANTS_FILE)) {
    data = JSON.parse(await fs.readFile(TENANTS_FILE, "utf8"));
  }
  if (data.tenants.some((t) => t.slug === args.slug)) return; // idempotent
  data.tenants.push({
    slug: args.slug,
    display_name: args.display_name,
    type: "pod-store",
    domain: null,
    tagline: args.niche,
    stage: "launching",
    channels: ["printify-popup"],
    notes: `Auto-bootstrapped via new-store-bootstrap.mjs on ${new Date().toISOString()}`,
  });
  await fs.writeFile(TENANTS_FILE, JSON.stringify(data, null, 2));
}

async function queueLaunchTelegram(args, env, summary) {
  if (!env.TELEGRAM_CHAT_ID) return;
  await fs.mkdir(SHARED_OUTBOX, { recursive: true });
  const text =
    `🎉 *New store launched: ${args.display_name}*\n\n` +
    `Niche: ${args.niche}\n` +
    `Products created: ${summary.productsCreated}/${summary.productsAttempted}\n` +
    `Image model used: ${summary.imageModel}\n` +
    `Brand site: day14.us/brands/${args.slug}\n` +
    `Printify: https://printify.com/app/store/products/1\n\n` +
    `LaunchAgents installed:\n` +
    `• Daily product engine (9am)\n` +
    `• Marketing engine (11am)\n` +
    `• Orders watcher (continuous)\n\n` +
    `Tap publish on each Printify draft to go live.`;
  await fs.writeFile(
    path.join(SHARED_OUTBOX, `${Date.now()}-new-store-${args.slug}.json`),
    JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: "Markdown",
      urgency: "P2",
      queued_at: new Date().toISOString(),
      sent_at: null,
      tenant: args.slug,
    }, null, 2)
  );
}

// ===== Main =====
async function main() {
  const args = parseArgs();
  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
  if (!args.skip_products && !env.PRINTIFY_API_KEY) throw new Error("PRINTIFY_API_KEY missing");

  console.log(`\n=== Bootstrapping ${args.display_name} (${args.slug}) ===\n`);
  await validateSlug(args.slug);

  // 1. Constitution
  console.log("→ Generating CONSTITUTION...");
  const constitution = await generateConstitution(args, env);
  const tenantDir = path.join(BIZ, args.slug);
  await fs.mkdir(path.join(tenantDir, "generated-images"), { recursive: true });
  await fs.mkdir(path.join(tenantDir, "cs-drafts"), { recursive: true });
  await fs.mkdir(path.join(tenantDir, "marketing-drafts"), { recursive: true });
  await fs.mkdir(path.join(tenantDir, "raw-footage"), { recursive: true });
  await fs.writeFile(path.join(tenantDir, "CONSTITUTION.md"), constitution);
  console.log(`  ✓ ${path.join(tenantDir, "CONSTITUTION.md")}`);

  // 2. Register in tenants.json
  await registerTenant(args);
  console.log(`  ✓ registered in tenants.json`);

  // 3. Brand site
  console.log("→ Scaffolding brand site...");
  const sitePath = await generateBrandSitePage(args, constitution);
  console.log(`  ✓ ${sitePath}`);

  // 4. Tenant-specific scripts (copies of hot-flash-co-* with slug rewritten)
  console.log("→ Generating tenant-specific automation scripts...");
  const templates = [
    ["hot-flash-co-daily-engine.mjs", `${args.slug}-daily-engine.mjs`],
    ["hot-flash-co-orders-watcher.mjs", `${args.slug}-orders-watcher.mjs`],
    ["hot-flash-co-marketing-engine.mjs", `${args.slug}-marketing-engine.mjs`],
    ["hot-flash-co-dashboard.mjs", `${args.slug}-dashboard.mjs`],
  ];
  for (const [src, dst] of templates) {
    await generateTenantScript(args, path.join(SCRIPTS, src), path.join(SCRIPTS, dst));
    console.log(`  ✓ scripts/${dst}`);
  }

  // 5. LaunchAgents
  console.log("→ Installing LaunchAgents...");
  const installer = await fs.readFile(path.join(SCRIPTS, "install-hot-flash-co-agents.sh"), "utf8");
  const tenantInstaller = installer
    .replace(/hot-flash-co/g, args.slug)
    .replace(/Hot Flash Co/g, args.display_name);
  const installerPath = path.join(SCRIPTS, `install-${args.slug}-agents.sh`);
  await fs.writeFile(installerPath, tenantInstaller);
  await fs.chmod(installerPath, 0o755);
  try {
    execSync(`bash ${installerPath}`, { stdio: "inherit" });
  } catch (e) {
    console.warn(`  ! LaunchAgent install warning: ${e.message}`);
  }

  let summary = { productsCreated: 0, productsAttempted: 0, imageModel: "skipped" };

  if (!args.skip_products) {
    // 6. Product concepts
    console.log("→ Generating 10 product concepts via Gemini...");
    const concepts = await generateProductConcepts(args, constitution, env, 10);
    console.log(`  ✓ ${concepts.length} concepts`);

    // 7. Discover Printify shop/blueprint/provider
    console.log("→ Discovering Printify catalog...");
    const ctx = await getShopBlueprintProvider(env.PRINTIFY_API_KEY, args.product_type);
    console.log(`  blueprint ${ctx.blueprintId} (${ctx.blueprintTitle}), provider ${ctx.providerId}`);

    const priceCents = args.product_type === "mug" ? 1899
      : args.product_type === "tee" ? 2499
      : args.product_type === "hoodie" ? 3999
      : 1999;

    // 8. Generate + upload + create
    summary.productsAttempted = concepts.length;
    let imageModelUsed = null;
    for (let i = 0; i < concepts.length; i++) {
      const c = concepts[i];
      process.stdout.write(`[${i + 1}/${concepts.length}] ${c.slug.padEnd(30)} `);
      try {
        const prompt = `Print-on-demand ${args.product_type} design. Square 1:1. Large readable typography: "${c.quote}". Visual style: ${c.visual}. White or transparent background. Print-ready. No watermarks.`;
        const imgPath = path.join(tenantDir, "generated-images", `${c.slug}.png`);
        const gen = await generateImage(prompt, env.GEMINI_API_KEY, imgPath);
        if (!gen.ok) { console.log(`✗ image: ${gen.error}`); continue; }
        imageModelUsed = gen.model;
        const imageId = await uploadImage(env.PRINTIFY_API_KEY, imgPath);
        const productId = await createProduct(env.PRINTIFY_API_KEY, ctx, c, imageId, priceCents);
        console.log(`✓ ${productId}`);
        summary.productsCreated += 1;
      } catch (err) {
        console.log(`✗ ${err.message.slice(0, 80)}`);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    summary.imageModel = imageModelUsed || "none";
  }

  // 9. Final manifest
  await fs.writeFile(
    path.join(tenantDir, "bootstrap-manifest.json"),
    JSON.stringify({ bootstrapped_at: new Date().toISOString(), args, summary }, null, 2)
  );

  // 10. Telegram celebration
  await queueLaunchTelegram(args, env, summary);

  console.log(`\n=== ${args.display_name} launched ===`);
  console.log(`Products: ${summary.productsCreated}/${summary.productsAttempted}`);
  console.log(`Brand site: src/app/brands/${args.slug}/page.tsx`);
  console.log(`Constitution: ${path.join(tenantDir, "CONSTITUTION.md")}`);
  console.log(`Next: tap publish on each Printify draft.\n`);
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  console.error(err.stack);
  process.exit(1);
});
