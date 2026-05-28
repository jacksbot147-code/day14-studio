/**
 * lib/skills/marketing-skills.mjs
 *
 * Node-side wrapper around the `marketing-skills` Claude plugin installed at
 * ~/.claude/plugins/marketing-skills (the marketplace.json may live under
 * `marketingskills/` without the hyphen; we accept either).
 *
 * Autonomous daemons can't fire Claude Code skills directly, so this module
 * does what the interactive Claude Code session would do, end-to-end:
 *
 *   1. Discover the plugin on disk (marketplace.json + the 42 SKILL.md files).
 *   2. Pick the sub-skill whose frontmatter description best matches the
 *      caller's task (tiny lexical scorer — no model call needed here).
 *   3. Build a system prompt from that SKILL.md body.
 *   4. Call Anthropic (`claude-haiku-4-5-20251001`) with the task + context.
 *   5. Return `{ ok:true, skill, output, meta }` on success, or a structured
 *      `{ ok:false, skill, reason, ... }` on any expected failure (no key,
 *      plugin not installed, no matching sub-skill).
 *
 * Public surface:
 *   invokeMarketingSkill({ task, context }, opts?) -> Promise<Result>
 *   pickSubSkill(task, skills) -> { skill, score } | null   (exported for tests)
 *   loadMarketingSkills(opts?) -> Promise<{ ok, skills, source } | { ok:false }>
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const SKILL_NAME = "marketing-skills";

// Canonical plugin locations — try both with and without the hyphen, since
// the marketplace.json drop has historically used `marketingskills/`.
function candidatePluginRoots() {
  const home = homedir();
  return [
    path.join(home, ".claude", "plugins", "marketing-skills"),
    path.join(home, ".claude", "plugins", "marketingskills"),
  ];
}

/** Resolve to the first existing plugin root, or null. */
async function findPluginRoot(explicit) {
  const roots = explicit ? [explicit] : candidatePluginRoots();
  for (const r of roots) {
    if (existsSync(r)) return r;
  }
  return null;
}

/** Parse a SKILL.md frontmatter block. Returns { name, description, body }. */
function parseSkillFile(text, filePath) {
  let name = path.basename(path.dirname(filePath));
  let description = "";
  let body = text;
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) {
      const fm = text.slice(3, end);
      body = text.slice(end + 4).replace(/^\s*\n/, "");
      for (const line of fm.split("\n")) {
        const m = line.match(/^([A-Za-z_-]+)\s*:\s*(.*)$/);
        if (!m) continue;
        const key = m[1].toLowerCase();
        let val = m[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        if (key === "name") name = val;
        else if (key === "description") description = val;
      }
    }
  }
  return { name, description, body };
}

/**
 * Walk the plugin tree and load every SKILL.md.
 * Cheap enough to call per-invocation (a few dozen small files).
 */
export async function loadMarketingSkills(opts = {}) {
  const root = await findPluginRoot(opts.pluginRoot);
  if (!root) {
    return {
      ok: false,
      reason: "marketing-skills plugin not found on disk",
      searched: candidatePluginRoots(),
    };
  }
  const skills = [];
  // Recurse, looking for SKILL.md files (the plugin places one per sub-skill).
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        // Skip node_modules and hidden dirs to keep walks cheap.
        if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
        await walk(full);
      } else if (ent.isFile() && /^SKILL\.md$/i.test(ent.name)) {
        try {
          const text = await fs.readFile(full, "utf8");
          skills.push({ path: full, ...parseSkillFile(text, full) });
        } catch {
          // ignore unreadable file
        }
      }
    }
  }
  await walk(root);

  // Also try to read marketplace.json — useful metadata for the caller, not
  // strictly required for picking a sub-skill.
  let marketplace = null;
  const mpPath = path.join(root, ".claude-plugin", "marketplace.json");
  if (existsSync(mpPath)) {
    try {
      marketplace = JSON.parse(await fs.readFile(mpPath, "utf8"));
    } catch {
      marketplace = null;
    }
  }
  return { ok: true, skills, source: root, marketplace };
}

// ---- sub-skill picker ----------------------------------------------------
// Lexical-overlap scorer. We deliberately avoid pulling in a heavy NLP dep —
// the descriptions are short and keyword-rich, so token overlap is plenty.

const STOP = new Set([
  "the","a","an","and","or","but","of","for","to","in","on","with","by",
  "is","are","be","was","were","this","that","it","as","at","from","into",
  "your","you","i","we","our","my","they","them","their","its","not","no",
  "do","does","did","can","will","would","should","could","when","where",
  "what","how","why","who","which","if","so","than","then","also","more",
  "most","very","just","like","about","over","under","via","use","using",
]);

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t) && t.length > 1);
}

export function pickSubSkill(task, skills) {
  if (!Array.isArray(skills) || skills.length === 0) return null;
  const taskTokens = new Set(tokenize(task));
  if (taskTokens.size === 0) return { skill: skills[0], score: 0 };
  let best = null;
  for (const s of skills) {
    const hay = `${s.name} ${s.description}`;
    const tokens = tokenize(hay);
    let score = 0;
    for (const t of tokens) if (taskTokens.has(t)) score += 1;
    // small boost for exact name match
    if (taskTokens.has(s.name.toLowerCase())) score += 3;
    if (!best || score > best.score) best = { skill: s, score };
  }
  return best;
}

// ---- Anthropic call ------------------------------------------------------

const MODEL = "claude-haiku-4-5-20251001";

function buildSystemPrompt(skill) {
  // The SKILL.md body IS the system prompt; we prepend a tiny header so the
  // model knows it's been routed here.
  return [
    `You are operating as the "${skill.name}" sub-skill of the marketing-skills plugin.`,
    `Description: ${skill.description}`,
    ``,
    `--- SKILL BODY ---`,
    skill.body.trim(),
  ].join("\n");
}

function buildUserMessage({ task, context }) {
  const parts = [];
  parts.push(`Task:\n${task}`);
  if (context) {
    const ctxStr =
      typeof context === "string" ? context : JSON.stringify(context, null, 2);
    parts.push(`\nContext:\n${ctxStr}`);
  }
  return parts.join("\n");
}

async function callAnthropic({ system, user, opts }) {
  // Lazy import so the dependency only resolves when actually used — keeps
  // dry-run paths cheap and avoids breaking environments where the SDK
  // happens not to be installed.
  let Anthropic;
  try {
    ({ default: Anthropic } = await import("@anthropic-ai/sdk"));
  } catch (err) {
    return {
      ok: false,
      reason: "@anthropic-ai/sdk not installed",
      detail: err?.message,
    };
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const resp = await client.messages.create({
      model: opts.model || MODEL,
      max_tokens: opts.maxTokens || 1024,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = (resp.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return { ok: true, text, raw: resp };
  } catch (err) {
    return {
      ok: false,
      reason: "anthropic call failed",
      detail: err?.message || String(err),
    };
  }
}

// ---- main entry ----------------------------------------------------------

/**
 * @param {{ task: string, context?: any }} input
 * @param {object} [opts]
 * @param {string} [opts.pluginRoot] override autodiscovery
 * @param {string} [opts.model] override the default Haiku model
 * @param {number} [opts.maxTokens]
 */
export async function invokeMarketingSkill(input, opts = {}) {
  if (!input || typeof input.task !== "string" || !input.task.trim()) {
    return {
      ok: false,
      skill: SKILL_NAME,
      reason: "marketing-skills expects { task: string, context?: any }",
    };
  }
  const loaded = await loadMarketingSkills({ pluginRoot: opts.pluginRoot });
  if (!loaded.ok) {
    return { ok: false, skill: SKILL_NAME, reason: loaded.reason, searched: loaded.searched };
  }
  if (loaded.skills.length === 0) {
    return {
      ok: false,
      skill: SKILL_NAME,
      reason: "no SKILL.md files found in marketing-skills plugin",
      source: loaded.source,
    };
  }
  const picked = pickSubSkill(input.task, loaded.skills);
  if (!picked || !picked.skill) {
    return { ok: false, skill: SKILL_NAME, reason: "no matching sub-skill" };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      skill: SKILL_NAME,
      reason: "no Anthropic key",
      meta: {
        picked: { name: picked.skill.name, score: picked.score },
        availableSubSkills: loaded.skills.length,
      },
    };
  }
  const system = buildSystemPrompt(picked.skill);
  const user = buildUserMessage(input);
  const result = await callAnthropic({ system, user, opts });
  if (!result.ok) {
    return {
      ok: false,
      skill: SKILL_NAME,
      reason: result.reason,
      detail: result.detail,
      meta: { picked: { name: picked.skill.name, score: picked.score } },
    };
  }
  return {
    ok: true,
    skill: SKILL_NAME,
    output: result.text,
    meta: {
      subSkill: picked.skill.name,
      subSkillScore: picked.score,
      model: opts.model || MODEL,
      availableSubSkills: loaded.skills.length,
    },
  };
}
