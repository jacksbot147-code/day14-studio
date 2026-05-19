#!/usr/bin/env node
/**
 * generate-hot-flash-designs.mjs
 *
 * Generates 10 mug-friendly perimenopause/menopause humor designs via Imagen 4,
 * saves PNGs to ~/Documents/businesses/hot-flash-co/generated-images/.
 *
 * Each design = bold-typography quote on a transparent-feeling minimal background,
 * suitable for a white 11oz ceramic mug.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";

const HOME = homedir();
const OUT_DIR = path.join(HOME, "Documents/businesses/hot-flash-co/generated-images");
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");
const IMAGEN_MODEL = "imagen-4.0-generate-001";

async function loadEnv() {
  const text = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

// The lineup — 10 SKUs to ship Day 1
const DESIGNS = [
  {
    slug: "perimenopausal-not-crazy",
    quote: "She is perimenopausal, not crazy.",
    visual: "Bold serif typography, hand-lettered feel, deep aubergine ink on cream background. Subtle hot-flash sun rays radiating behind text.",
  },
  {
    slug: "personal-summer",
    quote: "Currently experiencing a personal summer.",
    visual: "Vintage thermometer climbing past 100°F, retro postcard style, sun-bleached coral and dusty pink palette.",
  },
  {
    slug: "estrogen-called-in-sick",
    quote: "My estrogen called in sick.",
    visual: "Vintage clipart of phone off the hook, mid-century modern style, muted sage and rust tones.",
  },
  {
    slug: "power-surge",
    quote: "Power surge in progress.",
    visual: "Retro electrical warning sign aesthetic, bold lightning bolt, mustard yellow and charcoal black, riso-print texture.",
  },
  {
    slug: "decaf-hate-crime",
    quote: "Decaf is a hate crime.",
    visual: "Hand-drawn coffee cup with steam rising, vintage diner sign style, espresso brown on cream.",
  },
  {
    slug: "not-yelling",
    quote: "I'm not yelling. I'm perimenopausal.",
    visual: "Speech bubble in bold sans-serif, riso-print texture, terracotta and dusty blue palette.",
  },
  {
    slug: "menopause-plot-twist",
    quote: "Menopause: nature's plot twist.",
    visual: "Vintage paperback book cover aesthetic, dramatic serif type, deep plum and gold ink.",
  },
  {
    slug: "sweating-since",
    quote: "Sweating for no reason since 2024.",
    visual: "Faux-vintage event tour shirt graphic, distressed type, rust orange on bone.",
  },
  {
    slug: "menopause-survivor-club",
    quote: "Menopause Survivor Club. Members only.",
    visual: "1970s varsity patch aesthetic, embroidered look, sage green and burnt sienna.",
  },
  {
    slug: "fan-on-please",
    quote: "Yes the fan stays on. No I'm not cold.",
    visual: "Hand-drawn vintage table fan illustration, riso-print blue and warm coral, art deco border.",
  },
];

async function generateOne(design, apiKey) {
  const fullPrompt = `Print-on-demand mug design. Square 1:1 composition centered for an 11oz ceramic mug. Large readable typography says exactly: "${design.quote}". Visual style: ${design.visual}. White or transparent background, no mug mockup, just the artwork itself. Print-ready, high contrast, no text outside the quote. No watermarks, no logos.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict?key=${apiKey}`;
  const body = {
    instances: [{ prompt: fullPrompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: "1:1",
      personGeneration: "allow_adult",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { slug: design.slug, ok: false, error: `${res.status}: ${errText.slice(0, 200)}` };
  }

  const data = await res.json();
  const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) return { slug: design.slug, ok: false, error: "no image bytes returned" };

  const outPath = path.join(OUT_DIR, `${design.slug}.png`);
  await fs.writeFile(outPath, Buffer.from(b64, "base64"));
  return { slug: design.slug, ok: true, path: outPath, bytes: Buffer.from(b64, "base64").length };
}

async function main() {
  const env = await loadEnv();
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY missing from .env.local");
    process.exit(1);
  }
  await fs.mkdir(OUT_DIR, { recursive: true });

  console.log(`Generating ${DESIGNS.length} designs to ${OUT_DIR}`);
  console.log(`Model: ${IMAGEN_MODEL}\n`);

  // Run 3 at a time to avoid rate limits
  const results = [];
  for (let i = 0; i < DESIGNS.length; i += 3) {
    const batch = DESIGNS.slice(i, i + 3);
    process.stdout.write(`Batch ${Math.floor(i / 3) + 1}/${Math.ceil(DESIGNS.length / 3)}: `);
    const out = await Promise.all(batch.map((d) => generateOne(d, apiKey)));
    for (const r of out) {
      results.push(r);
      process.stdout.write(r.ok ? "✓" : "✗");
    }
    process.stdout.write("\n");
    // breathe between batches
    if (i + 3 < DESIGNS.length) await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("\n--- Results ---");
  for (const r of results) {
    if (r.ok) {
      console.log(`✓ ${r.slug.padEnd(28)} ${(r.bytes / 1024).toFixed(0)} KB  ${r.path}`);
    } else {
      console.log(`✗ ${r.slug.padEnd(28)} ${r.error}`);
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  console.log(`\n${okCount}/${results.length} designs saved.`);

  // Write a manifest for the Printify batch-create step
  const manifest = {
    generated_at: new Date().toISOString(),
    tenant: "hot-flash-co",
    model: IMAGEN_MODEL,
    designs: results
      .filter((r) => r.ok)
      .map((r) => {
        const d = DESIGNS.find((x) => x.slug === r.slug);
        return {
          slug: r.slug,
          quote: d.quote,
          image_path: r.path,
        };
      }),
  };
  await fs.writeFile(
    path.join(OUT_DIR, "_manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`Manifest: ${path.join(OUT_DIR, "_manifest.json")}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
