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
 *   invokeUxSkill(skillName, { filePaths, viewportPx, viewport, task? }, opts?)
 *     -> Promise<Result>
 *     // T11 audit-shaped entry: routes to a specific sub-skill and folds
 *     //   the on-disk source files in as context. `viewportPx` accepts a
 *     //   number (e.g. 1280) or { width, height }; `viewport` accepts a
 *     //   label like "desktop" / "tablet" / "mobile".
 *
 *   invokeUiUxProMax({ task, context }, opts?) -> Promise<Result>
 *     // Original generic entry retained for backwards compat.
 *
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

// ---------------------------------------------------------------------------
// T11 audit-shaped entry: invokeUxSkill(skillName, { filePaths, viewportPx,
// viewport, task? }, opts?)
// ---------------------------------------------------------------------------
//
// This is the signature the autonomous /admin/* audit pipeline calls. It maps
// a caller-supplied sub-skill hint (e.g. "audit", "ui-styling", "design-system")
// to one of the SKILL.md files in the ui-ux-pro-max plugin, reads the source
// files off disk, and asks Anthropic for severity-ranked UX findings.
//
// Degradation contract:
//   * plugin missing  -> { ok:false, reason:"... plugin not found ..." }
//   * no ANTHROPIC_API_KEY -> { ok:false, reason:"no Anthropic key", meta }
//     (still returns the chosen sub-skill + file count so the caller can log)
//   * everything reachable -> { ok:true, output, meta:{ subSkill, files, ... } }

const MAX_FILE_BYTES = 60_000; // hard cap per file — keeps prompts bounded
const MAX_TOTAL_BYTES = 220_000; // hard cap across all attached files

/** Score sub-skills against a free-form hint, then a domain fallback. */
function pickByHint(hint, skills) {
  if (!Array.isArray(skills) || skills.length === 0) return null;
  const h = String(hint || "").toLowerCase().trim();
  if (!h) return { skill: skills[0], score: 0 };

  // 1. Exact match on sub-skill name / folder name.
  for (const s of skills) {
    if (s.name && s.name.toLowerCase() === h) return { skill: s, score: 99 };
  }
  // 2. Substring of folder/name.
  for (const s of skills) {
    if (s.name && s.name.toLowerCase().includes(h)) return { skill: s, score: 50 };
    if (s.path && s.path.toLowerCase().includes(`/${h}/`)) return { skill: s, score: 40 };
  }
  // 3. "audit" / "review" / "critique" → prefer ui-styling, then design-system.
  if (/(audit|review|critique|assess|inspection|a11y|accessibility)/.test(h)) {
    for (const want of ["ui-styling", "design-system", "ui-ux-pro-max"]) {
      const s = skills.find((x) => x.name === want);
      if (s) return { skill: s, score: 25 };
    }
  }
  // 4. Fall back to the token scorer on the hint string.
  return pickUiUxSkill(hint, skills) || { skill: skills[0], score: 0 };
}

/** Normalise viewport input to a single label + a pixel dimension hint. */
function normaliseViewport({ viewportPx, viewport }) {
  let widthPx = null;
  let heightPx = null;
  if (typeof viewportPx === "number" && Number.isFinite(viewportPx)) {
    widthPx = viewportPx;
  } else if (viewportPx && typeof viewportPx === "object") {
    if (typeof viewportPx.width === "number") widthPx = viewportPx.width;
    if (typeof viewportPx.height === "number") heightPx = viewportPx.height;
  }
  let label = typeof viewport === "string" && viewport.trim() ? viewport.trim() : "";
  if (!label && typeof widthPx === "number") {
    if (widthPx <= 480) label = "mobile";
    else if (widthPx <= 820) label = "tablet";
    else label = "desktop";
  }
  return { label: label || "desktop", widthPx, heightPx };
}

/** Read a single file safely; returns { path, ok, content?, reason? }. */
async function safeReadFile(filePath) {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      return { path: filePath, ok: false, reason: "not a regular file" };
    }
    if (stat.size > MAX_FILE_BYTES * 4) {
      // Read just the head + tail of very large files.
      const fh = await fs.open(filePath, "r");
      try {
        const headBuf = Buffer.alloc(MAX_FILE_BYTES / 2);
        const tailBuf = Buffer.alloc(MAX_FILE_BYTES / 2);
        await fh.read(headBuf, 0, headBuf.length, 0);
        await fh.read(
          tailBuf,
          0,
          tailBuf.length,
          Math.max(0, stat.size - tailBuf.length)
        );
        const content =
          headBuf.toString("utf8") +
          `\n\n/* …${stat.size - MAX_FILE_BYTES} bytes elided… */\n\n` +
          tailBuf.toString("utf8");
        return { path: filePath, ok: true, content, truncated: true, bytes: stat.size };
      } finally {
        await fh.close();
      }
    }
    const text = await fs.readFile(filePath, "utf8");
    if (text.length > MAX_FILE_BYTES) {
      return {
        path: filePath,
        ok: true,
        content: text.slice(0, MAX_FILE_BYTES) + "\n/* …elided… */\n",
        truncated: true,
        bytes: text.length,
      };
    }
    return { path: filePath, ok: true, content: text, truncated: false, bytes: text.length };
  } catch (err) {
    return { path: filePath, ok: false, reason: err?.message || String(err) };
  }
}

/** Build the audit-shaped user message from file reads + viewport metadata. */
function buildAuditUserMessage({ task, filesPayload, viewport, extraContext }) {
  const lines = [];
  lines.push(
    task ||
      "Audit the attached source for UX issues. Return findings ranked by severity (CRITICAL / HIGH / MED / LOW) with file:line anchors where possible. Cover: accessibility (contrast, focus, alt text, semantics, labels), keyboard nav, hierarchy + scannability, error/empty states, touch targets, motion, copy clarity."
  );
  lines.push("");
  lines.push(`Viewport: ${viewport.label}${viewport.widthPx ? ` (${viewport.widthPx}px)` : ""}`);
  if (extraContext) {
    const ctxStr =
      typeof extraContext === "string"
        ? extraContext
        : JSON.stringify(extraContext, null, 2);
    lines.push("");
    lines.push("Context:");
    lines.push(ctxStr);
  }
  lines.push("");
  lines.push("--- SOURCE FILES ---");
  for (const f of filesPayload) {
    lines.push("");
    lines.push(`### FILE: ${f.path}${f.truncated ? "  (truncated)" : ""}`);
    if (f.ok) {
      // Fence with a unique-ish marker so model can't get confused by ``` inside.
      lines.push("````tsx");
      lines.push(f.content);
      lines.push("````");
    } else {
      lines.push(`(unable to read: ${f.reason})`);
    }
  }
  return lines.join("\n");
}

/**
 * @param {string} skillName  e.g. "audit", "ui-styling", "design-system"
 * @param {{ filePaths?: string[], viewportPx?: number|{width:number,height?:number},
 *          viewport?: string, task?: string, context?: any }} input
 * @param {object} [opts]
 */
export async function invokeUxSkill(skillName, input = {}, opts = {}) {
  const skillHint =
    typeof skillName === "string" && skillName.trim() ? skillName.trim() : "audit";
  const filePaths = Array.isArray(input.filePaths) ? input.filePaths : [];
  const viewport = normaliseViewport({
    viewportPx: input.viewportPx,
    viewport: input.viewport,
  });

  // 1. Plugin discovery — same as the generic entry point.
  const loaded = await loadUiUxSkills({ pluginRoot: opts.pluginRoot });
  if (!loaded.ok) {
    return {
      ok: false,
      skill: SKILL_NAME,
      reason: loaded.reason,
      searched: loaded.searched,
    };
  }
  if (loaded.skills.length === 0) {
    return {
      ok: false,
      skill: SKILL_NAME,
      reason: "no SKILL.md files found in ui-ux-pro-max plugin",
      source: loaded.source,
    };
  }
  const picked = pickByHint(skillHint, loaded.skills);
  if (!picked || !picked.skill) {
    return {
      ok: false,
      skill: SKILL_NAME,
      reason: `no matching sub-skill for hint "${skillHint}"`,
    };
  }

  // 2. Read files — concurrent, capped, never throws.
  const fileResults = [];
  let totalBytes = 0;
  for (const p of filePaths) {
    const r = await safeReadFile(p);
    if (r.ok && r.content) {
      if (totalBytes + r.content.length > MAX_TOTAL_BYTES) {
        fileResults.push({
          ...r,
          truncated: true,
          content:
            r.content.slice(0, Math.max(0, MAX_TOTAL_BYTES - totalBytes)) +
            "\n/* …elided to fit budget… */\n",
        });
        totalBytes = MAX_TOTAL_BYTES;
        break;
      }
      totalBytes += r.content.length;
    }
    fileResults.push(r);
  }
  const fileMeta = fileResults.map((f) => ({
    path: f.path,
    ok: f.ok,
    bytes: f.bytes || 0,
    truncated: !!f.truncated,
    reason: f.ok ? undefined : f.reason,
  }));

  // 3. No-op gracefully without an API key — caller still gets enough meta
  //    to log what would have happened.
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      skill: SKILL_NAME,
      reason: "no Anthropic key",
      meta: {
        picked: { name: picked.skill.name, score: picked.score },
        skillHint,
        viewport,
        availableSubSkills: loaded.skills.length,
        files: fileMeta,
        attachedBytes: totalBytes,
      },
    };
  }

  // 4. Call Anthropic with the chosen SKILL.md body as system prompt and the
  //    files + viewport context as the user message.
  const system = buildSystemPrompt(picked.skill);
  const user = buildAuditUserMessage({
    task: input.task,
    filesPayload: fileResults,
    viewport,
    extraContext: input.context,
  });
  const result = await callAnthropic({ system, user, opts });
  if (!result.ok) {
    return {
      ok: false,
      skill: SKILL_NAME,
      reason: result.reason,
      detail: result.detail,
      meta: {
        picked: { name: picked.skill.name, score: picked.score },
        skillHint,
        viewport,
        files: fileMeta,
      },
    };
  }
  return {
    ok: true,
    skill: SKILL_NAME,
    output: result.text,
    meta: {
      subSkill: picked.skill.name,
      subSkillScore: picked.score,
      skillHint,
      viewport,
      model: opts.model || MODEL,
      availableSubSkills: loaded.skills.length,
      files: fileMeta,
      attachedBytes: totalBytes,
    },
  };
}
