#!/usr/bin/env node
/**
 * launch-hot-flash-co.mjs
 *
 * ONE COMMAND to ship Hot Flash Co's first 10 mug products:
 *   1. Generate 10 designs via Imagen 4 (using GEMINI_API_KEY)
 *   2. Upload each design to Printify (using PRINTIFY_API_KEY)
 *   3. Create a product on 11oz mug (blueprint 9, provider 28) for each
 *   4. Write a manifest with all Printify product URLs
 *
 * Run:  node scripts/launch-hot-flash-co.mjs
 *
 * Products are saved as DRAFTS in Printify — Jack reviews + publishes manually.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

const HOME = homedir();
const TENANT = "hot-flash-co";
const OUT_DIR = path.join(HOME, "Documents/businesses", TENANT, "generated-images");
const MANIFEST_PATH = path.join(HOME, "Documents/businesses", TENANT, "launch-manifest.json");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");

const IMAGEN_MODEL = "imagen-4.0-generate-001";
const NANO_BANANA_MODEL = "gemini-2.5-flash-image"; // free-tier Gemini image fallback
const POLLINATIONS_MODEL = "flux"; // free Stable Diffusion proxy, no auth needed
const PRINTIFY_API = "https://api.printify.com/v1";

// Auto-discovered from Printify catalog at runtime
let BLUEPRINT_ID = null;
let PRINT_PROVIDER_ID = null;

// ---- The lineup ----
const DESIGNS = [
  {
    slug: "perimenopausal-not-crazy",
    quote: "She is perimenopausal, not crazy.",
    visual: "Bold serif typography, hand-lettered feel, deep aubergine ink on cream background. Subtle hot-flash sun rays radiating behind text.",
    title: "She Is Perimenopausal, Not Crazy Mug | Funny Menopause Gift",
    description: "For the woman handling more than anyone knows. Funny perimenopause humor mug — perfect gift for a sister, friend, partner, or co-worker who's been quietly battling the symptoms no one warned her about. Dishwasher and microwave safe. 11oz ceramic.",
    tags: ["perimenopause gift", "menopause humor", "funny mug", "hot flash gift", "midlife humor", "menopause survival", "perimenopause mug", "gift for her", "funny coffee mug", "midlife crisis"],
  },
  {
    slug: "personal-summer",
    quote: "Currently experiencing a personal summer.",
    visual: "Vintage thermometer climbing past 100°F, retro postcard style, sun-bleached coral and dusty pink palette.",
    title: "Personal Summer Mug | Hot Flash Humor Coffee Cup",
    description: "Vintage-style hot flash humor mug. The polite way to announce you're sweating through your shirt in a meeting. 11oz dishwasher and microwave safe ceramic. Funny menopause gift.",
    tags: ["hot flash mug", "menopause humor", "personal summer", "funny coffee mug", "vintage mug", "perimenopause gift", "menopause gift", "midlife humor", "summer gift", "thermometer mug"],
  },
  {
    slug: "estrogen-called-in-sick",
    quote: "My estrogen called in sick.",
    visual: "Vintage clipart of phone off the hook, mid-century modern style, muted sage and rust tones.",
    title: "My Estrogen Called In Sick Mug | Funny Menopause Coffee Cup",
    description: "Mid-century style funny menopause mug. Explains everything without explaining anything. Perfect gift for a friend in perimenopause. 11oz ceramic, dishwasher and microwave safe.",
    tags: ["estrogen mug", "menopause humor", "funny menopause gift", "perimenopause gift", "mid-century mug", "hormone humor", "midlife crisis", "funny coffee mug", "hot flash gift", "gift for her"],
  },
  {
    slug: "power-surge",
    quote: "Power surge in progress.",
    visual: "Retro electrical warning sign aesthetic, bold lightning bolt, mustard yellow and charcoal black, riso-print texture.",
    title: "Power Surge In Progress Mug | Hot Flash Warning Sign Humor",
    description: "Industrial warning-sign humor for the menopause crowd. Vintage riso-print style. 11oz ceramic mug, dishwasher and microwave safe. Funny gift for menopause, perimenopause, midlife women.",
    tags: ["power surge mug", "hot flash humor", "menopause mug", "perimenopause gift", "warning sign mug", "funny coffee mug", "riso print", "midlife humor", "lightning bolt", "menopause gift"],
  },
  {
    slug: "decaf-hate-crime",
    quote: "Decaf is a hate crime.",
    visual: "Hand-drawn coffee cup with steam rising, vintage diner sign style, espresso brown on cream.",
    title: "Decaf Is A Hate Crime Mug | Funny Coffee Lover Gift",
    description: "Vintage diner-sign humor for the woman who needs her caffeine. 11oz ceramic mug, dishwasher and microwave safe. Funny coffee lover gift, perimenopause humor, midlife mom gift.",
    tags: ["funny coffee mug", "coffee lover gift", "decaf hater", "diner mug", "vintage coffee mug", "perimenopause humor", "menopause gift", "caffeine addict", "funny mom mug", "coffee humor"],
  },
  {
    slug: "not-yelling",
    quote: "I'm not yelling. I'm perimenopausal.",
    visual: "Speech bubble in bold sans-serif, riso-print texture, terracotta and dusty blue palette.",
    title: "I'm Not Yelling I'm Perimenopausal Mug | Funny Menopause Gift",
    description: "Self-aware perimenopause humor mug — for the woman whose volume knob is non-functional this week. 11oz ceramic, dishwasher and microwave safe. Perfect gift for a friend, sister, or yourself.",
    tags: ["perimenopause humor", "menopause mug", "yelling mug", "funny gift for her", "perimenopause gift", "midlife humor", "hot flash mug", "menopause survival", "funny mom gift", "speech bubble mug"],
  },
  {
    slug: "menopause-plot-twist",
    quote: "Menopause: nature's plot twist.",
    visual: "Vintage paperback book cover aesthetic, dramatic serif type, deep plum and gold ink.",
    title: "Menopause Nature's Plot Twist Mug | Vintage Book Lover Gift",
    description: "Vintage paperback cover aesthetic. Funny menopause mug for the woman who reads. 11oz ceramic, dishwasher and microwave safe. Great gift for book club, sister, or friend.",
    tags: ["menopause mug", "vintage book mug", "book lover gift", "plot twist", "menopause humor", "perimenopause gift", "funny mug", "midlife humor", "literary mug", "gift for reader"],
  },
  {
    slug: "sweating-since",
    quote: "Sweating for no reason since 2024.",
    visual: "Faux-vintage event tour shirt graphic, distressed type, rust orange on bone.",
    title: "Sweating For No Reason Since 2024 Mug | Hot Flash Humor",
    description: "Tour-shirt-style hot flash humor mug. The unwanted tour you never asked to be on. 11oz ceramic, dishwasher and microwave safe. Funny gift for menopause, perimenopause.",
    tags: ["hot flash mug", "menopause humor", "sweating mug", "tour shirt style", "perimenopause gift", "funny mug 2024", "midlife humor", "menopause survival", "funny coffee mug", "menopause gift"],
  },
  {
    slug: "menopause-survivor-club",
    quote: "Menopause Survivor Club. Members only.",
    visual: "1970s varsity patch aesthetic, embroidered look, sage green and burnt sienna.",
    title: "Menopause Survivor Club Mug | Vintage Varsity Patch Humor",
    description: "1970s varsity patch style. Members-only club for the women who've made it through. 11oz ceramic mug, dishwasher and microwave safe. Great gift for friend, sister, mother.",
    tags: ["menopause survivor", "menopause club mug", "varsity patch", "vintage mug", "menopause humor", "midlife humor", "perimenopause gift", "funny mug", "members only", "menopause gift"],
  },
  {
    slug: "fan-on-please",
    quote: "Yes the fan stays on. No I'm not cold.",
    visual: "Hand-drawn vintage table fan illustration, riso-print blue and warm coral, art deco border.",
    title: "Yes The Fan Stays On Mug | Hot Flash Humor For Menopause",
    description: "Vintage table fan illustration with riso-print color. For the woman whose thermostat is permanently at war with everyone else's. 11oz ceramic mug, dishwasher and microwave safe.",
    tags: ["hot flash mug", "fan mug", "menopause humor", "perimenopause gift", "vintage fan", "midlife humor", "menopause gift", "funny mug for her", "thermostat war", "menopause survival"],
  },
];

// ---- Helpers ----

async function loadEnv() {
  const text = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

async function callImagen(fullPrompt, geminiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict?key=${geminiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: fullPrompt }],
      parameters: { sampleCount: 1, aspectRatio: "1:1", personGeneration: "allow_adult" },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: `imagen ${res.status}: ${err.slice(0, 200)}` };
  }
  const data = await res.json();
  const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) return { ok: false, error: "imagen returned no bytes" };
  return { ok: true, bytes: Buffer.from(b64, "base64") };
}

async function callNanoBanana(fullPrompt, geminiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${NANO_BANANA_MODEL}:generateContent?key=${geminiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: `nano-banana ${res.status}: ${err.slice(0, 200)}` };
  }
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    const b64 = p?.inlineData?.data || p?.inline_data?.data;
    if (b64) return { ok: true, bytes: Buffer.from(b64, "base64") };
  }
  return { ok: false, error: "nano-banana returned no image bytes" };
}

async function callPollinations(fullPrompt, seed) {
  // Free Stable Diffusion proxy. No auth. Returns PNG bytes directly.
  // Bias prompt toward clear typography rendering.
  const enhancedPrompt =
    fullPrompt +
    " High resolution. Crisp clear typography. Print-ready quality. Centered composition. No misspellings.";
  const enc = encodeURIComponent(enhancedPrompt).slice(0, 1900);
  const url = `https://image.pollinations.ai/prompt/${enc}?width=1024&height=1024&model=${POLLINATIONS_MODEL}&nologo=true&enhance=true&seed=${seed}`;
  const res = await fetch(url);
  if (!res.ok) {
    return { ok: false, error: `pollinations ${res.status}: ${(await res.text()).slice(0, 200)}` };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 5000) {
    return { ok: false, error: `pollinations returned too-small payload (${buf.length} bytes)` };
  }
  return { ok: true, bytes: buf };
}

async function generateDesign(design, geminiKey, index) {
  const fullPrompt = `Print-on-demand mug design. Square 1:1 composition centered for an 11oz ceramic mug. Large readable typography says exactly: "${design.quote}". Visual style: ${design.visual}. White or off-white background. No mug mockup, just the artwork itself. Print-ready, high contrast, no text outside the quote. No watermarks, no logos.`;

  // Order: Pollinations (free, working) → Imagen (if paid) → nano-banana (free fallback)
  const seed = 1000 + (index || 0);
  let result = await callPollinations(fullPrompt, seed);
  let model = "pollinations-flux";

  if (!result.ok) {
    result = await callImagen(fullPrompt, geminiKey);
    model = "imagen-4";
  }
  if (!result.ok) {
    result = await callNanoBanana(fullPrompt, geminiKey);
    model = "nano-banana";
  }

  if (!result.ok) return { ok: false, error: result.error };

  const outPath = path.join(OUT_DIR, `${design.slug}.png`);
  await fs.writeFile(outPath, result.bytes);
  return { ok: true, imagePath: outPath, bytes: result.bytes.length, model };
}

async function getShopId(printifyKey) {
  const res = await fetch(`${PRINTIFY_API}/shops.json`, {
    headers: { Authorization: `Bearer ${printifyKey}` },
  });
  if (!res.ok) throw new Error(`shops ${res.status}: ${await res.text()}`);
  const shops = await res.json();
  if (!shops.length) throw new Error("no Printify shops connected — set up Pop-Up Store first");
  return shops[0].id;
}

async function discoverMugBlueprint(printifyKey) {
  // Find an 11oz white ceramic mug blueprint
  const res = await fetch(`${PRINTIFY_API}/catalog/blueprints.json`, {
    headers: { Authorization: `Bearer ${printifyKey}` },
  });
  if (!res.ok) throw new Error(`blueprints ${res.status}: ${await res.text()}`);
  const blueprints = await res.json();

  // Prefer 11oz / ceramic / white mug — score each candidate
  const candidates = blueprints
    .map((b) => {
      const t = (b.title || "").toLowerCase();
      if (!t.includes("mug")) return null;
      let score = 0;
      if (t.includes("11oz") || t.includes("11 oz")) score += 10;
      if (t.includes("ceramic")) score += 5;
      if (t.includes("white") && !t.includes("inside")) score += 3;
      if (t.includes("glossy")) score += 2;
      // Penalize unusual mugs (travel, enamel, latte, color-changing)
      if (t.includes("travel")) score -= 5;
      if (t.includes("enamel")) score -= 5;
      if (t.includes("latte")) score -= 5;
      if (t.includes("color")) score -= 3;
      if (t.includes("magic")) score -= 5;
      return { id: b.id, title: b.title, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  if (!candidates.length) throw new Error("no mug blueprints found in catalog");
  return candidates[0]; // { id, title, score }
}

async function discoverPrintProvider(printifyKey, blueprintId) {
  const res = await fetch(
    `${PRINTIFY_API}/catalog/blueprints/${blueprintId}/print_providers.json`,
    { headers: { Authorization: `Bearer ${printifyKey}` } }
  );
  if (!res.ok) throw new Error(`providers ${res.status}: ${await res.text()}`);
  const providers = await res.json();
  if (!providers.length) throw new Error(`no providers for blueprint ${blueprintId}`);
  // Prefer US-based providers with high rating; for now just take first
  return providers[0]; // { id, title }
}

async function getMugVariants(printifyKey) {
  const res = await fetch(
    `${PRINTIFY_API}/catalog/blueprints/${BLUEPRINT_ID}/print_providers/${PRINT_PROVIDER_ID}/variants.json`,
    { headers: { Authorization: `Bearer ${printifyKey}` } }
  );
  if (!res.ok) throw new Error(`variants ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.variants || [];
}

async function uploadImage(printifyKey, imagePath) {
  const buf = await fs.readFile(imagePath);
  const filename = path.basename(imagePath);
  const res = await fetch(`${PRINTIFY_API}/uploads/images.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${printifyKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_name: filename, contents: buf.toString("base64") }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: `upload ${res.status}: ${err.slice(0, 200)}` };
  }
  const data = await res.json();
  return { ok: true, imageId: data.id };
}

async function createProduct(printifyKey, shopId, design, imageId, variants) {
  const variantIds = variants.map((v) => v.id);
  const body = {
    title: design.title,
    description: design.description,
    blueprint_id: BLUEPRINT_ID,
    print_provider_id: PRINT_PROVIDER_ID,
    tags: design.tags,
    variants: variantIds.map((id) => ({ id, price: 1899, is_enabled: true })), // $18.99
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
  const res = await fetch(`${PRINTIFY_API}/shops/${shopId}/products.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${printifyKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: `create ${res.status}: ${err.slice(0, 300)}` };
  }
  const data = await res.json();
  return {
    ok: true,
    productId: data.id,
    productUrl: `https://printify.com/app/products/${data.id}`,
  };
}

async function processOne(design, env, shopId, variants, index) {
  const result = { slug: design.slug, quote: design.quote, title: design.title };

  // 1. Generate image (Pollinations primary, Imagen/nano-banana fallback)
  const gen = await generateDesign(design, env.GEMINI_API_KEY, index);
  if (!gen.ok) return { ...result, ok: false, stage: "imagen", error: gen.error };
  result.imagePath = gen.imagePath;
  result.imageBytes = gen.bytes;
  result.imageModel = gen.model;

  // 2. Upload to Printify
  const up = await uploadImage(env.PRINTIFY_API_KEY, gen.imagePath);
  if (!up.ok) return { ...result, ok: false, stage: "upload", error: up.error };
  result.printifyImageId = up.imageId;

  // 3. Create product
  const prod = await createProduct(env.PRINTIFY_API_KEY, shopId, design, up.imageId, variants);
  if (!prod.ok) return { ...result, ok: false, stage: "create", error: prod.error };
  result.productId = prod.productId;
  result.productUrl = prod.productUrl;
  result.ok = true;
  return result;
}

async function main() {
  console.log("=== Hot Flash Co launch — 10 mug products ===\n");
  await fs.mkdir(OUT_DIR, { recursive: true });

  const env = await loadEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing from .env.local");
  if (!env.PRINTIFY_API_KEY) throw new Error("PRINTIFY_API_KEY missing from .env.local");

  console.log("→ Fetching Printify shop + discovering mug catalog...");
  const shopId = await getShopId(env.PRINTIFY_API_KEY);
  const blueprint = await discoverMugBlueprint(env.PRINTIFY_API_KEY);
  BLUEPRINT_ID = blueprint.id;
  console.log(`  blueprint: [${BLUEPRINT_ID}] ${blueprint.title} (score ${blueprint.score})`);
  const provider = await discoverPrintProvider(env.PRINTIFY_API_KEY, BLUEPRINT_ID);
  PRINT_PROVIDER_ID = provider.id;
  console.log(`  provider:  [${PRINT_PROVIDER_ID}] ${provider.title}`);
  const variants = await getMugVariants(env.PRINTIFY_API_KEY);
  console.log(`  variants:  ${variants.length}\n`);

  const results = [];
  for (let i = 0; i < DESIGNS.length; i++) {
    const d = DESIGNS[i];
    process.stdout.write(`[${i + 1}/${DESIGNS.length}] ${d.slug.padEnd(28)} `);
    const r = await processOne(d, env, shopId, variants, i);
    results.push(r);
    if (r.ok) {
      console.log(`✓ ${r.productUrl}`);
    } else {
      console.log(`✗ ${r.stage}: ${r.error}`);
    }
    // breathe between products
    await new Promise((res) => setTimeout(res, 1500));
  }

  await fs.writeFile(
    MANIFEST_PATH,
    JSON.stringify(
      {
        launched_at: new Date().toISOString(),
        tenant: TENANT,
        shop_id: shopId,
        blueprint_id: BLUEPRINT_ID,
        print_provider_id: PRINT_PROVIDER_ID,
        results,
      },
      null,
      2
    )
  );

  const ok = results.filter((r) => r.ok).length;
  console.log(`\n=== ${ok}/${results.length} products created ===`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
  console.log(`\nNext: open Printify → My Products → review + Publish the keepers.`);
  console.log(`Dashboard: https://printify.com/app/store/products/1`);
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  process.exit(1);
});
