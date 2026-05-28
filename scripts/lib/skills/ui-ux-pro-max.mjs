/**
 * lib/skills/ui-ux-pro-max.mjs
 *
 * Node-side wrapper around the `ui-ux-pro-max` Claude plugin installed at
 * ~/.claude/plugins/ui-ux-pro-max.
 *
 * Same shape as marketing-skills.mjs: discover the plugin on disk, pick the
 * relevant sub-skill from its SKILL.md frontmatter, build a system prompt
 * from the body, and ask Anthropic (`claude-haiku-4-5-20251001`) for design
 * guidance. Degrades gracefully when the plugin or the API key is missing.
 *
 * Public surface:
 *   invokeUiUxProMax({ task, context }, opts?) -> Promise<Result>
 *   loadUiUxSkills(opts?)  -> Promise<{ ok, skills, source }>
 *   pickUiUxSkill(task, skills) -> { skill, score } | null
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

const SKILL_NAME = "ui-ux-pro-max";
const MODEL = "claude-haiku-4-5-20251001";

function defaultPluginRoot() {
  return path.join(homedir(), ".claude", "plugins", "ui-ux-pro-max");
}

// ---- frontmatter parse ---------------------------------------------------
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

export async function loadUiUxSkills(opts = {}) {
  const root = opts.pluginRoot || defaultPluginRoot();
  if (!existsSync(root)) {
    return { ok: false, reason: "ui-ux-pro-max plugin not found on disk", searched: [root] };
  }
  const skills = [];
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
        if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
        await walk(full);
      } else if (ent.isFile() && /^SKILL\.md$/i.test(ent.name)) {
        try {
          const text = await fs.readFile(full, "utf8");
          skills.push({ path: full, ...parseSkillFile(text, full) });
        } catch {
          // skip
        }
      }
    }
  }
  await walk(root);
  return { ok: true, skills, source: root };
}

// ---- topical scorer ------------------------------------------------------
// Slightly richer than marketing's — we layer in domain hints for the four
// big buckets the plugin covers (color, typography, components, layout).
const DOMAIN_HINTS = {
  color: ["color", "colour", "palette", "hue", "swatch", "contrast", "accent", "shade", "tone"],
  typography: ["type", "typography", "font", "typeface", "kerning", "leading", "weight", "headline", "body"],
  components: ["component", "button", "input", "form", "card", "modal", "dialog", "menu", "nav"],
  layout: ["layout", "grid", "spacing", "padding", "margin", "section", "hero", "page", "responsive"],
};

const STOP = new Set([
  "the","a","an","and","or","but","of","for","to","in","on","with","by",
  "is","are","be","was","were","this","that","it","as","at","from","into",
  "i","we","our","my","they","them","their","its","not","no","do","does",
  "did","can","will","would","should","could","when","where","what","how",
  "why","who","which","if","so","than","then","also","more","most","very",
  "just","like","about","over","under","via","use","using","need","want",
  "make","help","please",
]);

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t) && t.length > 1);
}

function domainBoost(taskTokens, skill) {
  const hay = `${skill.name} ${skill.description}`.toLowerCase();
  let boost = 0;
  for (const [domain, words] of Object.entries(DOMAIN_HINTS)) {
    const inTask = words.some((w) => taskTokens.has(w));
    const inSkill = words.some((w) => hay.includes(w));
    if (inTask && inSkill) boost += 4;
  }
  return boost;
}

export function pickUiUxSkill(task, skills) {
  if (!Array.isArray(skills) || skills.length === 0) return null;
  const taskTokens = new Set(tokenize(task));
  if (taskTokens.size === 0) return { skill: skills[0], score: 0 };
  let best = null;
  for (const s of skills) {
    const tokens = tokenize(`${s.name} ${s.description}`);
    let score = 0;
    for (const t of tokens) if (taskTokens.has(t)) score += 1;
    if (taskTokens.has(s.name.toLowerCase())) score += 3;
    score += domainBoost(taskTokens, s);
    if (!best || score > best.score) best = { skill: s, score };
  }
  return best;
}

// ---- Anthropic plumbing --------------------------------------------------
function buildSystemPrompt(skill) {
  return [
    `You are operating as the "${skill.name}" sub-skill of the ui-ux-pro-max plugin.`,
    `Description: ${skill.description}`,
    ``,
    `Return concrete, opinionated design guidance. Prefer tokens (CSS vars,`,
    `Tailwind classes, scale numbers) over vague prose.`,
    ``,
    `--- SKILL BODY ---`,
    skill.body.trim(),
  ].join("\n");
}

function buildUserMessage({ task, context }) {
  const parts = [`Task:\n${task}`];
  if (context) {
    const ctxStr =
      typeof context === "string" ? context : JSON.stringify(context, null, 2);
    parts.push(`\nContext:\n${ctxStr}`);
  }
  return parts.join("\n");
}

async function callAnthropic({ system, user, opts }) {
  let Anthropic;
  try {
    ({ default: Anthropic } = await import("@anthropic-ai/sdk"));
  } catch (err) {
    return { ok: false, reason: "@anthropic-ai/sdk not installed", detail: err?.message };
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
    return { ok: false, reason: "anthropic call failed", detail: err?.message || String(err) };
  }
}

/**
 * @param {{ task: string, context?: any }} input
 * @param {object} [opts]
 */
export async function invokeUiUxProMax(input, opts = {}) {
  if (!input || typeof input.task !== "string" || !input.task.trim()) {
    return {
      ok: false,
      skill: SKILL_NAME,
      reason: "ui-ux-pro-max expects { task: string, context?: any }",
    };
  }
  const loaded = await loadUiUxSkills({ pluginRoot: opts.pluginRoot });
  if (!loaded.ok) {
    return { ok: false, skill: SKILL_NAME, reason: loaded.reason, searched: loaded.searched };
  }
  if (loaded.skills.length === 0) {
    return {
      ok: false,
      skill: SKILL_NAME,
      reason: "no SKILL.md files found in ui-ux-pro-max plugin",
      source: loaded.source,
    };
  }
  const picked = pickUiUxSkill(input.task, loaded.skills);
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
