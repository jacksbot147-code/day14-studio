/**
 * llm-call.mjs — shared LLM helper for all .mjs scripts.
 *
 * Tries Gemini first (free tier, fast), falls back to Anthropic Claude
 * Haiku on 429 / quota errors. Reads keys from .env.local automatically.
 *
 * Usage:
 *   import { llmCall } from "./_generic/llm-call.mjs";
 *   const text = await llmCall({ prompt: "...", useGrounding: true });
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const HOME = homedir();
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");

let cachedEnv = null;
async function loadEnv() {
  if (cachedEnv) return cachedEnv;
  if (!existsSync(ENV_FILE)) return {};
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  cachedEnv = env;
  return env;
}

const GEMINI_DEFAULT = "gemini-2.5-flash";
const ANTHROPIC_DEFAULT = "claude-haiku-4-5-20251001";

export async function llmCall({
  prompt,
  systemPrompt,
  useGrounding = false,
  temperature = 0.6,
  maxTokens = 3000,
  preferAnthropic = false,
  model,
}) {
  const env = await loadEnv();

  const tryGemini = !preferAnthropic && env.GEMINI_API_KEY;
  if (tryGemini) {
    try {
      const result = await callGemini({ prompt, systemPrompt, useGrounding, temperature, maxTokens, model, apiKey: env.GEMINI_API_KEY });
      if (result.ok) return result;
      // If error was 429 or quota — fall through to Anthropic
      const isQuotaError = /429|quota|RATE_LIMIT/i.test(result.error || "");
      if (!isQuotaError) {
        // Non-quota error — try Anthropic anyway
      }
    } catch (e) {
      // Network or parse error — try fallback
    }
  }

  if (!env.ANTHROPIC_API_KEY) {
    return { ok: false, text: "", error: "Both GEMINI_API_KEY (or quota) and ANTHROPIC_API_KEY unavailable" };
  }

  return await callAnthropic({ prompt, systemPrompt, temperature, maxTokens, apiKey: env.ANTHROPIC_API_KEY });
}

async function callGemini({ prompt, systemPrompt, useGrounding, temperature, maxTokens, model, apiKey }) {
  const m = model || GEMINI_DEFAULT;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };
  if (useGrounding) body.tools = [{ google_search: {} }];
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    return { ok: false, text: "", error: `gemini ${res.status}: ${t.slice(0, 200)}`, provider: "gemini" };
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return { ok: true, text, provider: "gemini" };
}

async function callAnthropic({ prompt, systemPrompt, temperature, maxTokens, apiKey, model }) {
  const m = model || ANTHROPIC_DEFAULT;
  const body = {
    model: m,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (systemPrompt) body.system = systemPrompt;
  if (temperature !== undefined) body.temperature = temperature;

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
    return { ok: false, text: "", error: `anthropic ${res.status}: ${t.slice(0, 200)}`, provider: "anthropic" };
  }
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join("\n");
  return { ok: true, text, provider: "anthropic" };
}

export function parseJsonResponse(raw) {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
  const arrS = cleaned.indexOf("["), arrE = cleaned.lastIndexOf("]");
  const objS = cleaned.indexOf("{"), objE = cleaned.lastIndexOf("}");
  if (arrS !== -1 && (objS === -1 || arrS < objS)) return JSON.parse(cleaned.slice(arrS, arrE + 1));
  return JSON.parse(cleaned.slice(objS, objE + 1));
}
