#!/usr/bin/env node
/**
 * One-shot OG card generator for the Day14 OS landing page.
 *
 * Generates the hero card referenced by `src/app/page.tsx` metadata
 * (`/og/day14-os.png`). Idempotent via cc-nano-banana cache.
 *
 * Run from the studio root with GEMINI_API_KEY in env:
 *   cd ~/Documents/studio && node scripts/_internal/generate-og-day14-os.mjs
 *
 * Stops cleanly on auth/quota errors. Cost: ~$0.04 once.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateImage } from "../lib/skills/cc-nano-banana.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = path.resolve(HERE, "..", "..");
const OG_DIR = path.join(STUDIO_ROOT, "public", "og");
const OG_PATH = path.join(OG_DIR, "day14-os.png");

// Load .env.local manually (cc-nano-banana doesn't dotenv-load).
async function loadEnvLocal() {
  const envPath = path.join(STUDIO_ROOT, ".env.local");
  try {
    const text = await fs.readFile(envPath, "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    // ok — env may already be set
  }
}

const PROMPT = [
  "Editorial dark hero image, 1200x630 social-card aspect ratio.",
  "Brutalist-minimalist tech aesthetic. Centered composition.",
  "Bold sans-serif typography spells DAY14 OS in white.",
  "Below it, smaller serif subtitle: 'One operator. Six businesses. One operating system.'",
  "Deep midnight-teal gradient background (#0a1f24 to #0d2a30).",
  "Subtle isometric grid pattern overlay, very low opacity.",
  "Faint glow of orange-coral accent (#ff6b4a) at the lower-right corner — a single soft highlight, like a status LED.",
  "No people, no products, no logos. Confident, restrained, expensive-looking.",
  "Inspired by Stripe's editorial aesthetic and Linear's brand work.",
].join(" ");

async function main() {
  await loadEnvLocal();

  if (!process.env.GEMINI_API_KEY) {
    console.error("[og-gen] missing GEMINI_API_KEY in env or .env.local");
    process.exit(1);
  }

  console.log("[og-gen] starting...");
  console.log("[og-gen] key prefix:", process.env.GEMINI_API_KEY.slice(0, 6) + "...");
  console.log("[og-gen] target:", OG_PATH);

  await fs.mkdir(OG_DIR, { recursive: true });

  // Generate via cc-nano-banana bridge.
  const result = await generateImage({
    prompt: PROMPT,
    size: "1200x630",
    style: "photo",
    tenant: "day14",
  });

  if (!result.ok) {
    console.error("[og-gen] FAILED:", result.reason ?? "unknown", "path:", result.path);
    process.exit(2);
  }

  // cc-nano-banana cached under sha256-name. Copy/move to the canonical OG path.
  console.log("[og-gen] generated:", result.path, "cached:", result.cached);
  await fs.copyFile(result.path, OG_PATH);
  const stat = await fs.stat(OG_PATH);
  console.log("[og-gen] copied to:", OG_PATH, "(" + stat.size + " bytes)");
  console.log("[og-gen] DONE");
}

main().catch((err) => {
  console.error("[og-gen] crash:", err?.message ?? err);
  process.exit(99);
});
