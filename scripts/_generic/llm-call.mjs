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
import { loadAgentPreamble } from "./agent-context.mjs";

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

// Provider preference. Default Claude-first: Gemini's free tier 503s and burns
// quota, killing agent runs. Set DAY14_LLM_PREFER=gemini to restore Gemini-first
// (Claude stays the fallback either way). Per-call preferAnthropic:true always
// forces Claude-first.
const PREFER = (process.env.DAY14_LLM_PREFER || "anthropic").toLowerCase();

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
  // Inject the compiled Day14 agent preamble (identity + prime directives +
  // role directory) so every agent prompt carries full context. ~300 tokens;
  // disable globally with DAY14_AGENT_CONTEXT=0.
  const _preamble = loadAgentPreamble();
  if (_preamble) systemPrompt = [_preamble, systemPrompt].filter(Boolean).join("\n\n");
  const hasA = !!env.ANTHROPIC_API_KEY;
  const hasG = !!env.GEMINI_API_KEY;
  // GROUNDING-AWARE ROUTING (2026-07-09 audit fix): google_search grounding
  // exists ONLY on the Gemini leg. Under Claude-first, a grounded call that
  // "succeeds" on Claude silently returns ungrounded, fabrication-prone text
  // ("real URL" fields become guesses) — pr-director/sales-director's failure
  // mode. So useGrounding routes Gemini-first regardless of PREFER; Claude
  // stays the (explicitly degraded, grounded:false) fallback.
  const wantsGrounding = useGrounding && hasG;
  const anthropicFirst = !wantsGrounding && (preferAnthropic || PREFER === "anthropic");

  // Claude-first (default) — reliable, what Day14 runs on. Gemini is the fallback.
  if (anthropicFirst && hasA) {
    const r = await callAnthropic({ prompt, systemPrompt, temperature, maxTokens, apiKey: env.ANTHROPIC_API_KEY });
    if (r.ok) return r;
    if (hasG) {
      try {
        const g = await callGemini({ prompt, systemPrompt, useGrounding, temperature, maxTokens, model, apiKey: env.GEMINI_API_KEY });
        if (g.ok) return g;
      } catch {
        /* fall through to the Anthropic error */
      }
    }
    return r;
  }

  // Gemini-first (opt-in via DAY14_LLM_PREFER=gemini, or forced by a
  // grounded call — see wantsGrounding above), Claude as fallback.
  if (hasG) {
    try {
      const result = await callGemini({ prompt, systemPrompt, useGrounding, temperature, maxTokens, model, apiKey: env.GEMINI_API_KEY });
      if (result.ok) return result;
    } catch {
      /* fall through to Anthropic */
    }
  }
  if (hasA) {
    return await callAnthropic({ prompt, systemPrompt, temperature, maxTokens, apiKey: env.ANTHROPIC_API_KEY });
  }
  return { ok: false, text: "", error: "no LLM provider available (set ANTHROPIC_API_KEY)" };
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
  return { ok: true, text, provider: "gemini", grounded: !!useGrounding };
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
  // Anthropic has no google_search leg — callers that asked for grounding
  // and land here are getting ungrounded text. `grounded:false` lets them
  // (and audits) tell the difference instead of trusting fabricated URLs.
  return { ok: true, text, provider: "anthropic", grounded: false };
}

export function parseJsonResponse(raw) {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
  const arrS = cleaned.indexOf("["), arrE = cleaned.lastIndexOf("]");
  const objS = cleaned.indexOf("{"), objE = cleaned.lastIndexOf("}");
  if (arrS !== -1 && (objS === -1 || arrS < objS)) return JSON.parse(cleaned.slice(arrS, arrE + 1));
  return JSON.parse(cleaned.slice(objS, objE + 1));
}
