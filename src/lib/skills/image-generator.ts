/**
 * image-generator — hand-coded impl.
 *
 * Generates an image via Google's Gemini Image (Imagen 4 / nano-banana)
 * model. Free tier supports limited image generation. Saves PNGs to
 * ~/Documents/businesses/{tenant}/generated-images/.
 *
 * Used by:
 *   - Etsy listing flow (auto-generate the 10 listing slot images)
 *   - POD design generation (auto-create design files for Printify upload)
 *   - Blog post header images
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();
const IMAGEN_MODEL = "imagen-4.0-generate-001";
const NANO_BANANA = "gemini-2.5-flash-image";

interface ImageGenInput {
  prompt: string;
  aspect_ratio?: "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
  count?: number; // how many variations, max 4
  tenant?: string;
  output_subdir?: string; // optional subfolder within tenant's generated-images
  filename_hint?: string; // optional base name for output files
}

async function callImagen(prompt: string, ar: string, count: number, apiKey: string): Promise<{
  ok: boolean;
  images?: Buffer[];
  error?: string;
}> {
  // Try Imagen 4 first (higher quality, slightly more cost)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict?key=${apiKey}`;
  const body = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: Math.min(Math.max(count, 1), 4),
      aspectRatio: ar,
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
    // Fallback: try nano-banana via generateContent
    return await callNanoBanana(prompt, ar, count, apiKey, `Imagen unavailable: ${res.status} ${errText.slice(0, 150)}`);
  }
  const data = (await res.json()) as {
    predictions?: Array<{ bytesBase64Encoded?: string }>;
  };
  const images =
    data.predictions
      ?.map((p) => p.bytesBase64Encoded)
      .filter((b): b is string => !!b)
      .map((b) => Buffer.from(b, "base64")) || [];
  if (images.length === 0) {
    return { ok: false, error: "Imagen returned no images" };
  }
  return { ok: true, images };
}

async function callNanoBanana(
  prompt: string,
  ar: string,
  count: number,
  apiKey: string,
  fallbackReason: string
): Promise<{ ok: boolean; images?: Buffer[]; error?: string }> {
  // Nano-banana via generateContent with response_modalities
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${NANO_BANANA}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    return {
      ok: false,
      error: `${fallbackReason}; nano-banana also failed: ${res.status} ${errText.slice(0, 150)}`,
    };
  }
  const data = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }>;
      };
    }>;
  };
  const inlineParts = data.candidates?.[0]?.content?.parts || [];
  const images = inlineParts
    .map((p) => p.inlineData?.data)
    .filter((d): d is string => !!d)
    .map((d) => Buffer.from(d, "base64"));
  if (images.length === 0) {
    return { ok: false, error: `${fallbackReason}; nano-banana returned no images` };
  }
  return { ok: true, images };
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}

export async function generateImage(input: ImageGenInput): Promise<{
  ok: boolean;
  paths?: string[];
  error?: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "GEMINI_API_KEY not set" };

  const ar = input.aspect_ratio || "1:1";
  const count = input.count || 1;
  const result = await callImagen(input.prompt, ar, count, apiKey);
  if (!result.ok || !result.images) {
    return { ok: false, error: result.error };
  }

  // Save each image
  const tenant = input.tenant || "day14";
  const subdir = input.output_subdir || "general";
  const imagesDir = path.join(HOME, "Documents/businesses", tenant, "generated-images", subdir);
  await fs.mkdir(imagesDir, { recursive: true });

  const baseName = input.filename_hint ? slugify(input.filename_hint) : `image-${Date.now()}`;
  const paths: string[] = [];
  for (let i = 0; i < result.images.length; i++) {
    const filename = result.images.length === 1 ? `${baseName}.png` : `${baseName}-${i + 1}.png`;
    const filepath = path.join(imagesDir, filename);
    await fs.writeFile(filepath, result.images[i]!);
    paths.push(filepath);
  }

  await auditLog({
    action: "image_generated",
    actor: "automated:image-generator",
    customer_slug: tenant,
    details: {
      prompt: input.prompt.slice(0, 100),
      count: paths.length,
      aspect_ratio: ar,
    },
    skill_invoked: "image-generator",
    actor_source: "skill-runner",
  });

  return { ok: true, paths };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<ImageGenInput> | undefined;
  if (!inputs?.prompt) {
    return {
      ok: false,
      skill: "image-generator",
      path: "hand-coded",
      error: "missing required input: prompt",
    };
  }
  const result = await generateImage({
    prompt: inputs.prompt,
    aspect_ratio: inputs.aspect_ratio,
    count: inputs.count,
    tenant: inputs.tenant,
    output_subdir: inputs.output_subdir,
    filename_hint: inputs.filename_hint,
  });
  return {
    ok: result.ok,
    skill: "image-generator",
    path: "hand-coded",
    result: { image_count: result.paths?.length ?? 0 },
    artifacts: result.paths || [],
    error: result.error,
  };
}
