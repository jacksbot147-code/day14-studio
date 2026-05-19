/**
 * gemini-call — shared wrapper for hand-coded skills that need Gemini.
 *
 * Reads GEMINI_API_KEY from process.env (set by the dev server / scheduled
 * task). Uses gemini-2.5-flash-lite by default (15 RPM free tier).
 *
 * For research-grounded queries, set `useGrounding: true` — wires in
 * Google Search at the cost of disallowing custom function calls.
 *
 * 429 retries: 2 attempts with exponential backoff.
 */

const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 10_000;

export interface GeminiCallOptions {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  useGrounding?: boolean;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface GeminiCallResult {
  ok: boolean;
  text?: string;
  sources?: string[]; // populated when useGrounding=true
  error?: string;
  retries?: number;
}

export async function callGemini(opts: GeminiCallOptions): Promise<GeminiCallResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "GEMINI_API_KEY not set" };
  }

  const model = opts.model || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxOutputTokens ?? 2048,
    },
  };
  if (opts.systemPrompt) {
    body.systemInstruction = { parts: [{ text: opts.systemPrompt }] };
  }
  if (opts.useGrounding) {
    body.tools = [{ googleSearch: {} }];
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        retries: attempt,
      };
    }

    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          groundingMetadata?: {
            groundingChunks?: Array<{ web?: { uri?: string } }>;
          };
        }>;
      };
      const parts = data.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p) => p.text || "").filter(Boolean).join("\n");
      const sources =
        data.candidates?.[0]?.groundingMetadata?.groundingChunks
          ?.map((c) => c.web?.uri)
          .filter((u): u is string => !!u) || [];
      return { ok: true, text, sources, retries: attempt };
    }

    if (res.status !== 429 || attempt === MAX_RETRIES) {
      const errText = await res.text();
      return {
        ok: false,
        error: `${res.status}: ${errText.slice(0, 200)}`,
        retries: attempt,
      };
    }

    // 429 + retries available: backoff
    await new Promise((r) => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt)));
  }

  return { ok: false, error: "exhausted retries", retries: MAX_RETRIES + 1 };
}
