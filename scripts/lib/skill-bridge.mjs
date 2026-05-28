/**
 * lib/skill-bridge.mjs
 *
 * Single entry point so autonomous .mjs daemons can invoke Claude skills
 * without depending on an interactive Claude Code session being open.
 *
 * The five plugins installed at ~/.claude/skills and ~/.claude/plugins only
 * work from inside a Claude Code chat — they are skill descriptions Claude
 * the LLM consults, not standalone executables. Daemons can't talk to them.
 * This bridge papers over that gap two ways:
 *
 *   - Where we can replicate the skill in pure Node, we do (stop-slop is a
 *     deterministic regex pass — no API call needed). It's routed to the
 *     Node port at `./skills/stop-slop.mjs`.
 *
 *   - Where we can't (marketing-skills needs an Anthropic key + the actual
 *     skill body, cc-nano-banana needs the Gemini CLI, ui-ux-pro-max needs
 *     a model call), we return an explicit `{ ok: false, reason }` so the
 *     caller decides how to degrade (skip, queue for later, fall back to a
 *     simpler local heuristic).
 *
 * Public surface:
 *   invokeSkill(name, input, opts?) -> Promise<Result>
 *
 *   Result is always one of:
 *     { ok: true,  skill, output, meta? }     // skill ran
 *     { ok: false, skill, reason, ... }       // not available / no key
 *
 * The bridge NEVER throws on a known-unavailable skill — callers expect a
 * non-throwing degradation path. It only throws on truly invalid usage
 * (unknown skill name, non-string input where a string is required).
 */

import { stripSlop, INLINE_RULE_COUNT, loadRulesFromSkillDir } from "./skills/stop-slop.mjs";
import { invokeMarketingSkill } from "./skills/marketing-skills.mjs";
import { invokeUiUxProMax, invokeUxSkill } from "./skills/ui-ux-pro-max.mjs";
import { invokeNanoBanana, generateImage as generateBananaImage } from "./skills/cc-nano-banana.mjs";

// Re-export the runtime contract so daemons can call it directly without
// going through the legacy { prompt, images, outDir } envelope.
export { generateBananaImage };

// Re-export the audit-shaped entry so daemons can import it from the bridge
// without reaching into the per-skill module directly.
export { invokeUxSkill };

// ---- skill registry ------------------------------------------------------
// Each entry: { kind, handler? }
//   kind === "node"   → routed to a pure-Node implementation
//   kind === "stub"   → returns an explicit ok:false (needs interactive Claude
//                       Code, an Anthropic key, the Gemini CLI, …)
const SKILLS = {
  "stop-slop": {
    kind: "node",
    async handler(input /* string */, opts = {}) {
      if (typeof input !== "string") {
        return {
          ok: false,
          skill: "stop-slop",
          reason: "stop-slop expects a string input",
        };
      }
      // Optional one-time refresh of the rule table from SKILL.md drop. The
      // loader is cheap (one stat) so it's safe to call per invocation, but
      // we only do it when the caller opts in to keep the hot path fast.
      let rules;
      if (opts.refreshRules) {
        const loaded = await loadRulesFromSkillDir(opts.skillDir);
        rules = loaded.rules;
      }
      const { cleaned, removed } = stripSlop(input, rules ? { rules } : undefined);
      const totalStripped = removed.reduce((a, b) => a + b.count, 0);
      return {
        ok: true,
        skill: "stop-slop",
        output: cleaned,
        meta: {
          totalStripped,
          uniquePhrases: removed.length,
          removed,
          ruleCount: Array.isArray(rules) ? rules.length : INLINE_RULE_COUNT,
        },
      };
    },
  },
  "marketing-skills": {
    kind: "node",
    async handler(input, opts = {}) {
      // Accept either `{ task, context }` or a bare string for ergonomics.
      const normalized =
        typeof input === "string" ? { task: input } : input;
      return invokeMarketingSkill(normalized, opts);
    },
  },
  "ui-ux-pro-max": {
    kind: "node",
    async handler(input, opts = {}) {
      const normalized =
        typeof input === "string" ? { task: input } : input;
      return invokeUiUxProMax(normalized, opts);
    },
  },
  "cc-nano-banana": {
    kind: "node",
    async handler(input, opts = {}) {
      // Accept three input shapes:
      //   - bare string                       -> { prompt }
      //   - { prompt, size, style, tenant }   -> runtime contract (generateImage)
      //   - { prompt, images?, outDir? }      -> legacy gemini-CLI shape
      // We dispatch on the presence of `images` / `outDir` to keep
      // back-compat with the original wrapper.
      const normalized =
        typeof input === "string" ? { prompt: input } : input || {};
      const looksLikeLegacy =
        Array.isArray(normalized.images) || typeof normalized.outDir === "string";
      if (looksLikeLegacy) {
        return invokeNanoBanana(normalized, opts);
      }
      const gen = await generateBananaImage({
        prompt: normalized.prompt,
        size: normalized.size || opts.size,
        style: normalized.style || opts.style,
        tenant: normalized.tenant || opts.tenant,
      });
      return {
        ok: gen.ok,
        skill: "cc-nano-banana",
        output: gen.path,
        reason: gen.ok ? undefined : gen.reason,
        meta: { path: gen.path, cached: gen.cached, via: "rest" },
      };
    },
  },
  "framer-motion": {
    kind: "stub",
    reason: "framer-motion is a code-gen skill; needs Anthropic key + interactive Claude Code",
  },
};

/**
 * Invoke a bridged skill by name.
 *
 * @param {string} name   - one of the registered skill names
 * @param {string|object} input - per-skill input (stop-slop: a string)
 * @param {object} [opts] - per-skill options (see handler)
 * @returns {Promise<object>} result envelope
 */
export async function invokeSkill(name, input, opts = {}) {
  if (typeof name !== "string" || !name) {
    throw new TypeError("invokeSkill: skill name is required");
  }
  const entry = SKILLS[name];
  if (!entry) {
    throw new Error(
      `invokeSkill: unknown skill "${name}". ` +
        `Registered: ${Object.keys(SKILLS).join(", ")}`
    );
  }
  if (entry.kind === "node") {
    return entry.handler(input, opts);
  }
  // kind === "stub"
  return {
    ok: false,
    skill: name,
    reason: entry.reason,
  };
}

/** Inspect the registry (useful for /admin/health and self-tests). */
export function listSkills() {
  return Object.entries(SKILLS).map(([name, e]) => ({
    name,
    kind: e.kind,
    reason: e.kind === "stub" ? e.reason : undefined,
  }));
}
