/**
 * image-gen — optional, env-gated image generation for the preview generator
 * (logos + social graphics). The one capability the text stack can't do.
 *
 * DORMANT BY DEFAULT: returns null whenever OPENAI_API_KEY is absent, so every
 * caller degrades cleanly to text-only. Setting OPENAI_API_KEY (and deploying)
 * is the single switch that turns logo/social generation on — no code change.
 *
 * Provider + model pinned per the 2026-06-29 research
 * (~/Claude/Projects/DAY14/image-provider-options-2026-06-29.md):
 * OpenAI GPT Image, default `gpt-image-1.5` (override via DAY14_IMAGE_MODEL).
 * Never throws — failures return null. Server-only (uses the secret key).
 */

const ENDPOINT = "https://api.openai.com/v1/images/generations";
const MODEL = process.env.DAY14_IMAGE_MODEL || "gpt-image-1.5";

export function isImageGenEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export interface GenImageOpts {
  prompt: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024";
  /** Request a transparent background (logos). */
  transparent?: boolean;
}

/**
 * Generate one image. Returns a `data:image/png;base64,...` URL, or null if
 * generation is disabled or fails. Never throws.
 */
export async function generateImage(opts: GenImageOpts): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: opts.prompt,
        size: opts.size ?? "1024x1024",
        n: 1,
        ...(opts.transparent ? { background: "transparent" } : {}),
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: Array<{ b64_json?: string }>;
    };
    const b64 = json.data?.[0]?.b64_json;
    return b64 ? `data:image/png;base64,${b64}` : null;
  } catch {
    return null;
  }
}
