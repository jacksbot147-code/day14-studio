/**
 * blog-post-generator — hand-coded impl.
 *
 * Generates a publishable 800-1200 word blog post via Gemini.
 * Writes to ~/Documents/businesses/{tenant}/content/drafts/{slug}.md.
 *
 * Inputs: topic (required), tenant (default day14), vertical, target_length.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { callGemini } from "../gemini-call";
import { auditLog } from "./audit-log-generator";

const HOME = homedir();

interface BlogInput {
  topic: string;
  tenant?: string;
  vertical?: string;
  target_length?: number;
  use_research?: boolean;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const SYSTEM_PROMPT = `You are a sharp, opinionated blog writer for productized service businesses.

Voice: direct, specific, no AI-stink phrases. NEVER use: "in today's fast-paced world", "let's dive in", "in conclusion", "as we explore". NEVER use emojis. NEVER use em-dashes (use commas or rewrite).

Structure each post:
1. HOOK (60-100 words): a personal observation, surprising stat, or counterintuitive claim
2. WHY THIS MATTERS (100-150 words): stakes for the reader
3. THE 3-5 THINGS TO KNOW (400-600 words): meat, with specifics + numbers
4. COUNTERINTUITIVE / COMMON MISTAKE (100-150 words): differentiation
5. WHAT TO DO NEXT (100-150 words): clear action
6. CTA (50 words): book a call, read related post

Always include 2-3 internal-link placeholders like [link: pricing] or [link: case-study].
Match grade-level 8-9 reading.`;

export async function generateBlogPost(input: BlogInput): Promise<{
  ok: boolean;
  path?: string;
  text?: string;
  word_count?: number;
  error?: string;
}> {
  const tenant = input.tenant || "day14";
  const targetLength = input.target_length || 1000;

  const prompt = `Topic: ${input.topic}
${input.vertical ? `Vertical context: ${input.vertical}\n` : ""}Target length: ${targetLength} words.

Write the full blog post now. Markdown formatting (## for sections). Return ONLY the post — no preamble, no explanation, no "here is your post".`;

  const result = await callGemini({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.7,
    maxOutputTokens: 4096,
    useGrounding: input.use_research ?? false,
  });

  if (!result.ok || !result.text) {
    return { ok: false, error: result.error };
  }

  // Save draft
  const draftsDir = path.join(HOME, "Documents/businesses", tenant, "content/drafts");
  await fs.mkdir(draftsDir, { recursive: true });
  const slug = slugify(input.topic);
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `${date}-${slug}.md`;
  const filePath = path.join(draftsDir, fileName);

  // Front-matter + content
  const frontmatter = `---
title: ${input.topic}
date: ${date}
status: draft
tenant: ${tenant}
${input.vertical ? `vertical: ${input.vertical}\n` : ""}generated_by: blog-post-generator
---

`;
  const fullContent = frontmatter + result.text.trim() + "\n";
  await fs.writeFile(filePath, fullContent, "utf8");

  const wordCount = result.text.split(/\s+/).length;

  await auditLog({
    action: "blog_post_drafted",
    actor: "automated:blog-post-generator",
    customer_slug: tenant,
    details: {
      topic: input.topic,
      word_count: wordCount,
      path: filePath,
    },
    skill_invoked: "blog-post-generator",
    actor_source: "skill-runner",
  });

  return { ok: true, path: filePath, text: result.text, word_count: wordCount };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<BlogInput> | undefined;
  if (!inputs?.topic) {
    return {
      ok: false,
      skill: "blog-post-generator",
      path: "hand-coded",
      error: "missing required input: topic",
    };
  }
  const result = await generateBlogPost({
    topic: inputs.topic,
    tenant: inputs.tenant,
    vertical: inputs.vertical,
    target_length: inputs.target_length,
    use_research: inputs.use_research,
  });
  return {
    ok: result.ok,
    skill: "blog-post-generator",
    path: "hand-coded",
    result: { path: result.path, word_count: result.word_count },
    artifacts: result.path ? [result.path] : [],
    error: result.error,
  };
}
