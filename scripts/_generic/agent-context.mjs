/**
 * agent-context.mjs — loads the compiled Day14 agent preamble for prompt injection.
 *
 * INERT until imported. Nothing runs this unless another module imports it, so
 * adding this file changes no agent behavior on its own. Activation is a single
 * edit in llm-call.mjs (see docs/agent-context/ACTIVATION.md).
 *
 * Reads docs/agent-context/agent-preamble.md (produced by compile-agent-context.mjs).
 * If the file is missing it returns "" so callers degrade gracefully — never throws.
 *
 *   import { loadAgentPreamble } from "./agent-context.mjs";
 *   const preamble = loadAgentPreamble();           // cached after first call
 *   const sys = [preamble, systemPrompt].filter(Boolean).join("\n\n");
 *
 * Opt out per call by not prepending, or globally with DAY14_AGENT_CONTEXT=0.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/_generic/ -> repo root is two levels up.
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PREAMBLE_PATH = path.join(REPO_ROOT, "docs/agent-context/agent-preamble.md");

let cached = null;

export function loadAgentPreamble() {
  // Global kill switch.
  if (process.env.DAY14_AGENT_CONTEXT === "0") return "";
  if (cached !== null) return cached;
  try {
    cached = existsSync(PREAMBLE_PATH) ? readFileSync(PREAMBLE_PATH, "utf8").trim() : "";
  } catch {
    cached = "";
  }
  return cached;
}
