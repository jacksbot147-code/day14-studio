/**
 * skill-runner — the actual execution engine.
 *
 * Given a skill name + context, this:
 *   1. Loads the spec via skill-runtime.loadSkill()
 *   2. Checks for a hand-coded TypeScript implementation in lib/skills/{name}.ts
 *      → if present, runs it directly (fast path, deterministic)
 *   3. Otherwise, falls back to an LLM agent loop (slow path, flexible)
 *
 * The LLM path has two interchangeable runners:
 *   - DEFAULT: skill-runner-sdk.ts — @anthropic-ai/claude-agent-sdk
 *     query() with the six Day14 tools mapped as in-process MCP tools
 *   - LEGACY:  skill-runner-legacy.ts — the original hand-rolled
 *     @anthropic-ai/sdk tool-use loop. Select with DAY14_RUNNER=legacy.
 *
 * Both paths share an Outcome shape (and the same prompt builders +
 * tool executor) so callers don't care which fired.
 */

import { loadSkill, type SkillInvocationContext } from "./skill-runtime";
import { logAction, logError } from "./work-register";

export interface SkillOutcome {
  ok: boolean;
  skill: string;
  path: "hand-coded" | "llm-agent" | "spec-only";
  result?: unknown;
  error?: string;
  artifacts?: string[]; // paths written
  next_actions?: string[]; // suggested follow-ups
  jack_tap_required?: boolean; // surfaces a Telegram approval card
  turn_count?: number; // for LLM path: tool-use loop iterations
}

/**
 * Main entry. Most callers should use this, not the individual paths.
 */
export async function runSkill(
  name: string,
  ctx: SkillInvocationContext
): Promise<SkillOutcome> {
  const skill = await loadSkill(name);
  if (!skill) {
    return {
      ok: false,
      skill: name,
      path: "spec-only",
      error: `Skill not found: ${name}`,
    };
  }

  // 1. Try hand-coded fast path
  const handCoded = await tryHandCoded(name, ctx);
  if (handCoded) return handCoded;

  // 2. LLM agent loop (only if ANTHROPIC_API_KEY is set).
  //    DAY14_RUNNER=legacy selects the original hand-rolled loop;
  //    anything else (including unset) uses the Agent SDK port.
  if (process.env.ANTHROPIC_API_KEY) {
    if (process.env.DAY14_RUNNER === "legacy") {
      const { runViaLLMLegacy } = await import("./skill-runner-legacy");
      return await runViaLLMLegacy(name, ctx);
    }
    const { runViaAgentSdk } = await import("./skill-runner-sdk");
    return await runViaAgentSdk(name, ctx);
  }

  // 3. Spec-only: return guidance without executing
  await logAction({
    action_phrase: `skill ${name} requested but no executor available`,
    context: ctx.context,
    invoked_skill: name,
    notes: "spec-only-fallback",
  });
  return {
    ok: false,
    skill: name,
    path: "spec-only",
    error: "No hand-coded impl + no ANTHROPIC_API_KEY env var",
    next_actions: [
      `Implement src/lib/skills/${name}.ts with exported run(ctx)`,
      "or set ANTHROPIC_API_KEY in .env.local",
    ],
  };
}

/**
 * Look for a TypeScript impl at src/lib/skills/{name}.ts.
 * The module must export `run(ctx) → Promise<SkillOutcome>`.
 */
async function tryHandCoded(
  name: string,
  ctx: SkillInvocationContext
): Promise<SkillOutcome | null> {
  // 1. The canonical SKILL_RUNNERS map (src/lib/skills/index.ts) — covers
  //    every barreled impl and resolves under every bundler/runtime
  //    (webpack, vite-node, tsx) where the per-file `.js` dynamic import
  //    below can fail to map onto the `.ts` source.
  let barrelRunner:
    | ((c: SkillInvocationContext) => Promise<SkillOutcome>)
    | null = null;
  try {
    const barrel = await import("./skills");
    if (barrel.isSkillMigrated(name)) {
      barrelRunner = barrel.SKILL_RUNNERS[name] ?? null;
    }
  } catch (err) {
    // A broken barrel is consequential — log it, then try the per-file path.
    await logError(
      "skill-runner",
      err,
      ctx.context,
      `SKILL_RUNNERS barrel failed for ${name}; trying per-file import`
    );
  }
  if (barrelRunner) {
    try {
      const result = await barrelRunner(ctx);
      return { ...result, path: "hand-coded" };
    } catch (err) {
      return {
        ok: false,
        skill: name,
        path: "hand-coded",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // 2. Per-file dynamic import — fallback for impls not (yet) in the barrel.
  try {
    // Dynamic import; fails gracefully if module doesn't exist.
    // A missing module is the normal spec-only case; any OTHER load error
    // (broken impl) is consequential — log it before falling back.
    const mod = (await import(`./skills/${name}.js`).catch(async (err) => {
      const code = (err as NodeJS.ErrnoException)?.code;
      const isNotFound =
        code === "MODULE_NOT_FOUND" || code === "ERR_MODULE_NOT_FOUND";
      if (!isNotFound) {
        await logError(
          "skill-runner",
          err,
          ctx.context,
          `failed to load hand-coded impl for ${name}; falling back`
        );
      }
      return null;
    })) as
      | { run?: (c: SkillInvocationContext) => Promise<SkillOutcome> }
      | null;
    if (!mod || typeof mod.run !== "function") return null;
    const result = await mod.run(ctx);
    return { ...result, path: "hand-coded" };
  } catch (err) {
    return {
      ok: false,
      skill: name,
      path: "hand-coded",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
