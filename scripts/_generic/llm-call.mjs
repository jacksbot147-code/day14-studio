/**
 * llm-call.mjs — shared LLM helper for all .mjs scripts.
 *
 * Routing: Claude-first by default, Gemini fallback, then a LOCAL model leg
 * so a dual-provider credit outage degrades the fleet instead of killing it.
 * Reads keys from .env.local automatically.
 *
 * Usage:
 *   import { llmCall } from "./_generic/llm-call.mjs";
 *   const text = await llmCall({ prompt: "...", useGrounding: true });
 *
 * 2026-07-27 reliability pass. Context: provider-health.json showed 409
 * consecutive dual-provider failures (both accounts credit-depleted) while
 * every daemon heartbeat stayed green. Three changes, all opt-out via env:
 *
 *   1. GATEWAY  — DAY14_ANTHROPIC_BASE_URL / DAY14_GEMINI_BASE_URL let the
 *      fleet route through an LLM gateway (e.g. Cloudflare AI Gateway) for
 *      dollar spend caps + automatic cheap-model fallback. Unset = direct.
 *   2. CACHING  — the static system preamble is marked cache_control
 *      ephemeral on the Anthropic leg, billing repeat reads at ~0.1x. Only
 *      applied above the provider's minimum cacheable size, otherwise the
 *      block is ignored and we would pay a write premium for nothing.
 *      Disable with DAY14_PROMPT_CACHE=0.
 *   3. LOCAL LEG — when both cloud legs fail, fall through to a local Ollama
 *      model (default mistral-small3.2:24b, chosen for tool-calling on
 *      Apple Silicon at 24GB). Returns degraded:true so callers and audits
 *      can tell real output from fallback output. Disable with
 *      DAY14_LOCAL_FALLBACK=0.
 *
 * Every outcome is written to lib/llm-ledger.mjs, which records the one fact
 * heartbeats never captured: when an LLM call last actually SUCCEEDED.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { loadAgentPreamble } from "./agent-context.mjs";
import { recordLlmCall } from "../lib/llm-ledger.mjs";

const HOME = homedir();
const ENV_FILE = path.join(HOME, "Documents/studio/.env.local");

let cachedEnv = null;
async function loadEnv() {
  if (cachedEnv) return cachedEnv;
  if (!existsSync(ENV_FILE)) return {};
  const t = await fs.readFile(ENV_FILE, "utf8");
  const env = {};
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  cachedEnv = env;
  return env;
}

const GEMINI_DEFAULT = "gemini-2.5-flash";
const ANTHROPIC_DEFAULT = "claude-haiku-4-5-20251001";

const ANTHROPIC_BASE = (process.env.DAY14_ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/+$/, "");
const GEMINI_BASE = (process.env.DAY14_GEMINI_BASE_URL || "https://generativelanguage.googleapis.com").replace(/\/+$/, "");

const PROMPT_CACHE_ON = process.env.DAY14_PROMPT_CACHE !== "0";
const LOCAL_FALLBACK_ON = process.env.DAY14_LOCAL_FALLBACK !== "0";
const OLLAMA_URL = (process.env.DAY14_OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
const LOCAL_MODEL = process.env.DAY14_LOCAL_MODEL || "mistral-small3.2:24b";

// Anthropic ignores cache_control below a per-model minimum (2048 tokens for
// Haiku, 1024 for larger models) and a cache WRITE costs 1.25x. Marking a
// short preamble is therefore a small net loss, so gate on an approximate
// character count (~3.6 chars/token) and only mark blocks worth caching.
const CACHE_MIN_CHARS = Number(process.env.DAY14_PROMPT_CACHE_MIN_CHARS || 7500);

const AGENT_LABEL = process.env.DAY14_AGENT || path.basename(process.argv[1] || "unknown", ".mjs");

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
  const PREFER = (process.env.DAY14_LLM_PREFER || "anthropic").toLowerCase();
  const anthropicFirst = !wantsGrounding && (preferAnthropic || PREFER === "anthropic");

  let lastErr = { ok: false, text: "", error: "no LLM provider available (set ANTHROPIC_API_KEY)" };

  // Claude-first (default) — reliable, what Day14 runs on. Gemini is fallback.
  if (anthropicFirst && hasA) {
    const r = await callAnthropic({ prompt, systemPrompt, temperature, maxTokens, model, apiKey: env.ANTHROPIC_API_KEY });
    if (r.ok) return r;
    lastErr = r;
    if (hasG) {
      try {
        const g = await callGemini({ prompt, systemPrompt, useGrounding, temperature, maxTokens, model, apiKey: env.GEMINI_API_KEY });
        if (g.ok) return g;
        lastErr = g;
      } catch {
        /* fall through */
      }
    }
  } else {
    // Gemini-first (opt-in via DAY14_LLM_PREFER=gemini, or forced by a
    // grounded call — see wantsGrounding above), Claude as fallback.
    if (hasG) {
      try {
        const result = await callGemini({ prompt, systemPrompt, useGrounding, temperature, maxTokens, model, apiKey: env.GEMINI_API_KEY });
        if (result.ok) return result;
        lastErr = result;
      } catch {
        /* fall through to Anthropic */
      }
    }
    if (hasA) {
      const r = await callAnthropic({ prompt, systemPrompt, temperature, maxTokens, model, apiKey: env.ANTHROPIC_API_KEY });
      if (r.ok) return r;
      lastErr = r;
    }
  }

  // LOCAL LEG — both cloud providers refused. Degrade, do not die.
  if (LOCAL_FALLBACK_ON) {
    // callLocal resolves rather than throws, so its failure is always recorded.
    // The cloud error stays the REPORTED cause — a caller that wanted Claude
    // should hear why Claude refused, not why the backstop also could not help.
    const l = await callLocal({ prompt, systemPrompt, temperature, maxTokens });
    if (l.ok) return l;
  }

  return lastErr;
}

function buildAnthropicSystem(systemPrompt) {
  if (!systemPrompt) return undefined;
  if (!PROMPT_CACHE_ON || systemPrompt.length < CACHE_MIN_CHARS) return systemPrompt;
  return [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }];
}

async function callGemini({ prompt, systemPrompt, useGrounding, temperature, maxTokens, model, apiKey }) {
  const m = model && String(model).startsWith("gemini") ? model : GEMINI_DEFAULT;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };
  if (useGrounding) body.tools = [{ google_search: {} }];
  const res = await fetch(`${GEMINI_BASE}/v1beta/models/${m}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    const error = `gemini ${res.status}: ${t.slice(0, 200)}`;
    await recordLlmCall({ ok: false, provider: "gemini", model: m, agent: AGENT_LABEL, error });
    return { ok: false, text: "", error, provider: "gemini" };
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const um = data?.usageMetadata || {};
  await recordLlmCall({
    ok: true,
    provider: "gemini",
    model: m,
    agent: AGENT_LABEL,
    usage: { input: um.promptTokenCount || 0, output: um.candidatesTokenCount || 0, cacheRead: um.cachedContentTokenCount || 0 },
  });
  return { ok: true, text, provider: "gemini", grounded: !!useGrounding };
}

async function callAnthropic({ prompt, systemPrompt, temperature, maxTokens, apiKey, model }) {
  const m = model && String(model).startsWith("claude") ? model : ANTHROPIC_DEFAULT;
  const body = {
    model: m,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  const sys = buildAnthropicSystem(systemPrompt);
  if (sys) body.system = sys;
  if (temperature !== undefined) body.temperature = temperature;

  const res = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
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
    const error = `anthropic ${res.status}: ${t.slice(0, 200)}`;
    await recordLlmCall({ ok: false, provider: "anthropic", model: m, agent: AGENT_LABEL, error });
    return { ok: false, text: "", error, provider: "anthropic" };
  }
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text || "").join("\n");
  const u = data.usage || {};
  await recordLlmCall({
    ok: true,
    provider: "anthropic",
    model: m,
    agent: AGENT_LABEL,
    usage: {
      input: u.input_tokens || 0,
      output: u.output_tokens || 0,
      cacheRead: u.cache_read_input_tokens || 0,
      cacheWrite: u.cache_creation_input_tokens || 0,
    },
  });
  // Anthropic has no google_search leg — callers that asked for grounding
  // and land here are getting ungrounded text. `grounded:false` lets them
  // (and audits) tell the difference instead of trusting fabricated URLs.
  return { ok: true, text, provider: "anthropic", grounded: false };
}

/**
 * Local Ollama leg. Deliberately last: quality is below the cloud models and
 * it has no grounding, so it is a continuity measure, not a cost measure.
 * Callers get degraded:true — treat its output as triage, not as publishable
 * work, and never as a grounded source.
 */
async function callLocal({ prompt, systemPrompt, temperature, maxTokens }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.DAY14_LOCAL_TIMEOUT_MS || 120000));
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: LOCAL_MODEL,
        stream: false,
        options: { temperature, num_predict: maxTokens },
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      const error = `local ${res.status}: ${t.slice(0, 200)}`;
      await recordLlmCall({ ok: false, provider: "local", model: LOCAL_MODEL, agent: AGENT_LABEL, error });
      return { ok: false, text: "", error, provider: "local" };
    }
    const data = await res.json();
    const text = data?.message?.content || "";
    await recordLlmCall({
      ok: true,
      provider: "local",
      model: LOCAL_MODEL,
      agent: AGENT_LABEL,
      usage: { input: data.prompt_eval_count || 0, output: data.eval_count || 0 },
    });
    return { ok: true, text, provider: "local", grounded: false, degraded: true };
  } catch (err) {
    // A connection error here (Ollama not running, wrong port, timeout) used to
    // escape through `finally` and get swallowed by the caller's catch, which
    // recorded NOTHING. The ledger then showed only anthropic and gemini, so a
    // continuity measure that never once connected looked exactly like one that
    // was never attempted. That is the same shipped-but-not-working blind spot
    // the ledger exists to close, so the local leg now reports its own failure.
    const aborted = err && (err.name === "AbortError" || err.name === "TimeoutError");
    const error = aborted
      ? `local unreachable: timed out after ${Number(process.env.DAY14_LOCAL_TIMEOUT_MS || 120000)}ms (${OLLAMA_URL})`
      : `local unreachable: ${String((err && err.message) || err).slice(0, 160)} (${OLLAMA_URL})`;
    await recordLlmCall({ ok: false, provider: "local", model: LOCAL_MODEL, agent: AGENT_LABEL, error });
    return { ok: false, text: "", error, provider: "local" };
  } finally {
    clearTimeout(timeout);
  }
}

export function parseJsonResponse(raw) {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
  const arrS = cleaned.indexOf("["), arrE = cleaned.lastIndexOf("]");
  const objS = cleaned.indexOf("{"), objE = cleaned.lastIndexOf("}");
  if (arrS !== -1 && (objS === -1 || arrS < objS)) return JSON.parse(cleaned.slice(arrS, arrE + 1));
  return JSON.parse(cleaned.slice(objS, objE + 1));
}
