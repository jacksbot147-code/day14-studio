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

    if (res.status === 429 && attempt < MAX_RETRIES) {
      // Backoff then retry
      await new Promise((r) => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt)));
      continue;
    }

    // Out of retries or non-429 error — try Anthropic fallback before giving up
    const errText = await res.text();
    if (process.env.ANTHROPIC_API_KEY) {
      const fallback = await callAnthropicFallback(opts);
      if (fallback.ok) return { ...fallback, retries: attempt + 1 };
    }
    return {
      ok: false,
      error: `gemini ${res.status}: ${errText.slice(0, 200)}`,
      retries: attempt,
    };
  }

  return { ok: false, error: "exhausted retries", retries: MAX_RETRIES + 1 };
}

/**
 * Anthropic Claude fallback for when Gemini is quota-exhausted or down.
 * Used automatically by callGemini() when GEMINI_API_KEY returns 429.
 * No grounded search (Anthropic doesn't have native web search via API).
 */
async function callAnthropicFallback(opts: GeminiCallOptions): Promise<GeminiCallResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "ANTHROPIC_API_KEY not set" };

  const model = process.env.ANTHROPIC_FALLBACK_MODEL || "claude-haiku-4-5-20251001";
  const messages = [{ role: "user", content: opts.prompt }];
  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxOutputTokens ?? 2048,
    messages,
  };
  if (opts.systemPrompt) body.system = opts.systemPrompt;
  if (opts.temperature !== undefined) body.temperature = opts.temperature;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `anthropic ${res.status}: ${t.slice(0, 200)}` };
    }
    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join("\n");
    return { ok: true, text, sources: [] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
