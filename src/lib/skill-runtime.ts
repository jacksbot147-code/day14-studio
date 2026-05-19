/**
 * skill-runtime — load a SKILL.md, parse its sections, return structured
 * data that an agent or a dispatcher can act on.
 *
 * This is the bridge between the 211 SKILL.md specifications and code
 * that actually invokes them. `invokeSkill(name, context)` returns the
 * full skill body + parsed sections; the caller (an LLM-driven agent
 * or a hand-written handler) executes the protocol.
 *
 * NOT a full execution engine — the protocol description in SKILL.md
 * still requires reasoning to follow. This module surfaces the spec.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { findSkill, type SkillEntry } from "./skill-registry.generated";
import { logSkillInvocation, logAdHoc } from "./work-register";

const SKILL_ROOT = path.join(
  homedir(),
  "Documents/studio/docs/seeds/skills"
);

export interface SkillLoaded extends SkillEntry {
  frontmatter: Record<string, string>;
  body: string;
  sections: Record<string, string>;
  hardRules: string[];
}

export interface SkillInvocationContext {
  context: string; // customer_slug or session id
  customer_slug?: string;
  inputs?: Record<string, unknown>;
  caller?: string; // agent or handler name
}

export interface SkillInvocationResult {
  ok: boolean;
  skill: SkillLoaded | null;
  error?: string;
  guidance?: string; // human/agent-readable next-step text
}

// ---- parse a SKILL.md ----
export async function loadSkill(name: string): Promise<SkillLoaded | null> {
  const entry = findSkill(name);
  if (!entry) return null;
  const filePath = path.join(SKILL_ROOT, name, "SKILL.md");
  if (!existsSync(filePath)) return null;
  const text = await fs.readFile(filePath, "utf8");

  const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter: Record<string, string> = {};
  if (fmMatch && fmMatch[1]) {
    for (const line of fmMatch[1].split("\n")) {
      const kv = line.match(/^(\w+):\s*(.*)$/);
      if (kv && kv[1] !== undefined && kv[2] !== undefined) {
        frontmatter[kv[1]] = kv[2].trim();
      }
    }
  }
  const body = text.replace(/^---[\s\S]*?\n---\n/, "");

  // Parse `## Section name` blocks → { sectionName: content }
  const sections: Record<string, string> = {};
  const sectionRegex = /^##\s+(.+)$/gm;
  const matches: Array<{ title: string; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = sectionRegex.exec(body))) {
    if (m[1]) matches.push({ title: m[1].trim(), index: m.index });
  }
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]!;
    const next = matches[i + 1];
    const start = current.index;
    const end = next ? next.index : body.length;
    const content = body.slice(start, end).replace(/^##\s+.+\n/, "").trim();
    sections[current.title] = content;
  }

  // Pull Hard Rules — typically numbered list under "Hard rules"
  const hardRules: string[] = [];
  const rulesBlock = sections["Hard rules"] || sections["Hard Rules"] || "";
  for (const line of rulesBlock.split("\n")) {
    const rule = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*(.*)/);
    if (rule && rule[1] !== undefined) {
      hardRules.push(`${rule[1]} ${rule[2] ?? ""}`.trim());
    }
  }

  return {
    ...entry,
    frontmatter,
    body,
    sections,
    hardRules,
  };
}

/**
 * Invoke a skill by name. Loads the spec, logs the invocation, and
 * returns structured guidance for the caller to execute.
 *
 * The caller is responsible for the actual side effects — this function
 * is the lookup + telemetry + guidance bridge, not the execution engine.
 */
export async function invokeSkill(
  name: string,
  ctx: SkillInvocationContext
): Promise<SkillInvocationResult> {
  const skill = await loadSkill(name);
  if (!skill) {
    await logAdHoc(
      `attempted to invoke unknown skill: ${name}`,
      ctx.context,
      "skill_not_found"
    );
    return {
      ok: false,
      skill: null,
      error: `Skill not found: ${name}`,
      guidance:
        "Check `findSkillsByTrigger(input)` for closest matches, or surface via skill-gap-detector.",
    };
  }

  // Log invocation telemetry (feeds skill-coverage-auditor)
  await logSkillInvocation(name, ctx.context, ctx.customer_slug);

  // Build agent-facing guidance
  const guidance = buildGuidance(skill, ctx);

  return {
    ok: true,
    skill,
    guidance,
  };
}

/**
 * Compose an agent-readable execution-guidance string from a loaded skill.
 * The LLM that called invokeSkill can pass this directly into its reasoning.
 */
function buildGuidance(skill: SkillLoaded, ctx: SkillInvocationContext): string {
  const lines: string[] = [];
  lines.push(`# Invoking skill: ${skill.name}`);
  lines.push("");
  lines.push(`**Description**: ${skill.description}`);
  lines.push("");
  if (ctx.customer_slug) lines.push(`**Customer**: ${ctx.customer_slug}`);
  if (ctx.context) lines.push(`**Context**: ${ctx.context}`);
  if (ctx.inputs) {
    lines.push("**Inputs**:");
    for (const [k, v] of Object.entries(ctx.inputs)) {
      lines.push(`- ${k}: ${JSON.stringify(v)}`);
    }
  }
  lines.push("");

  const what = skill.sections["What this skill does"] || skill.sections["What it does"];
  if (what) {
    lines.push(`## What to do`);
    lines.push(what);
    lines.push("");
  }

  if (skill.hardRules.length) {
    lines.push(`## Hard rules (NEVER violate)`);
    skill.hardRules.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
    lines.push("");
  }

  const logging = skill.sections["Logging"];
  if (logging) {
    lines.push(`## Logging format expected`);
    lines.push(logging);
    lines.push("");
  }

  lines.push(
    `_Full spec: ${skill.pathRelative}_`
  );
  return lines.join("\n");
}

/**
 * Bulk skill lookup by intent text. Used by inbound-classifier and dispatch.
 * Returns top N matches ranked by trigger-word overlap.
 */
export async function suggestSkills(
  intent: string,
  maxResults = 5
): Promise<SkillEntry[]> {
  const { findSkillsByTrigger } = await import("./skill-registry.generated");
  return findSkillsByTrigger(intent).slice(0, maxResults);
}
