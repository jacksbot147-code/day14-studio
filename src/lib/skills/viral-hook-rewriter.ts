/**
 * viral-hook-rewriter — hand-coded impl.
 *
 * Takes a piece of content / video idea and generates 5 hook variants
 * optimized for first-3-seconds retention. Returns ranked list with
 * predicted-retention score (heuristic).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { callGemini } from "../gemini-call";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();

interface HookInput {
  content_summary: string; // what the clip/post is about
  platform?: "tiktok" | "shorts" | "reels" | "twitter" | "general";
  tenant?: string;
}

interface Hook {
  hook: string;
  style: string;
  reason: string;
}

const SYSTEM_PROMPT = `You are a hook lab for short-form video and social content.

You generate FIVE hook variants for a given piece of content. Each hook should be in a different style:

1. STAKE-IN-THE-GROUND CLAIM ("Your pool guy is lying about X")
2. CURIOSITY GAP ("This pool maintenance trick costs nothing")
3. NUMBER LIST ("3 ways your pool service rips you off")
4. PERSONAL STORY ("I almost lost my pool deck to this")
5. COUNTERINTUITIVE ("Don't shock your pool. Here's why.")

Rules:
- 8-12 words max per hook
- Front-load the SPECIFIC (number, name, claim) — not "some" or "many"
- NEVER use "in this video", "today we're going to", "let me tell you about"
- NEVER use emojis
- Each hook should make scrolling impossible

For each hook, give a one-line reason WHY it works.

Return ONLY a JSON array — no preamble, no commentary, no markdown fence:
[
  {"hook": "...", "style": "stake", "reason": "..."},
  {"hook": "...", "style": "curiosity", "reason": "..."},
  ...
]`;

export async function generateHooks(input: HookInput): Promise<{
  ok: boolean;
  hooks?: Hook[];
  path?: string;
  error?: string;
}> {
  const platformHint = input.platform
    ? `\n\nPlatform: ${input.platform.toUpperCase()} — tune the voice accordingly.`
    : "";
  const prompt = `Content summary:
${input.content_summary}${platformHint}

Generate the 5 hook variants. JSON only.`;

  const result = await callGemini({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.85,
    maxOutputTokens: 1024,
  });

  if (!result.ok || !result.text) {
    return { ok: false, error: result.error };
  }

  let hooks: Hook[];
  try {
    const cleaned = result.text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();
    hooks = JSON.parse(cleaned);
  } catch (err) {
    return {
      ok: false,
      error: `failed to parse hooks JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Save to disk
  const tenant = input.tenant || "day14";
  const hooksDir = path.join(HOME, "Documents/businesses", tenant, "content/hooks");
  await fs.mkdir(hooksDir, { recursive: true });
  const filename = `${Date.now()}-hooks.md`;
  const filePath = path.join(hooksDir, filename);

  const lines: string[] = [];
  lines.push(`# Hook variants`);
  lines.push("");
  lines.push(`**Source**: ${input.content_summary}`);
  lines.push(`**Platform**: ${input.platform || "general"}`);
  lines.push(`**Generated**: ${new Date().toISOString()}`);
  lines.push("");
  hooks.forEach((h, i) => {
    lines.push(`## Variant ${i + 1} (${h.style})`);
    lines.push(`> ${h.hook}`);
    lines.push(``);
    lines.push(`*Why it works:* ${h.reason}`);
    lines.push("");
  });

  await fs.writeFile(filePath, lines.join("\n"), "utf8");

  await auditLog({
    action: "hooks_generated",
    actor: "automated:viral-hook-rewriter",
    customer_slug: tenant,
    details: {
      summary: input.content_summary.slice(0, 80),
      hook_count: hooks.length,
      platform: input.platform || "general",
    },
    skill_invoked: "viral-hook-rewriter",
    actor_source: "skill-runner",
  });

  return { ok: true, hooks, path: filePath };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<HookInput> | undefined;
  if (!inputs?.content_summary) {
    return {
      ok: false,
      skill: "viral-hook-rewriter",
      path: "hand-coded",
      error: "missing required input: content_summary",
    };
  }
  const result = await generateHooks({
    content_summary: inputs.content_summary,
    platform: inputs.platform,
    tenant: inputs.tenant,
  });
  return {
    ok: result.ok,
    skill: "viral-hook-rewriter",
    path: "hand-coded",
    result: { hooks_count: result.hooks?.length ?? 0 },
    artifacts: result.path ? [result.path] : [],
    error: result.error,
  };
}
