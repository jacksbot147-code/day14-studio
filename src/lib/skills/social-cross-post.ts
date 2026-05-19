/**
 * social-cross-post — hand-coded impl.
 *
 * Takes a blog post or source content, adapts it for LinkedIn, Twitter/X,
 * Threads, and Facebook with platform-specific voice + format. Single
 * Gemini call returns all 4 variants as JSON.
 *
 * Writes outputs to {source-dir}/social/{platform}.txt.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { callGemini } from "../gemini-call";
import { auditLog } from "./audit-log-generator";

interface CrossPostInput {
  source_path: string;
  platforms?: ("linkedin" | "twitter" | "threads" | "facebook")[];
}

const SYSTEM_PROMPT = `You adapt a single source piece into platform-tuned social posts.

Rules per platform:

LinkedIn (1200-1500 chars):
- Personal story → insight → soft CTA
- No bullet lists (paragraphs only)
- No "Read more at" links in first 80% (LinkedIn de-ranks external links)
- Em-dashes OK on LinkedIn (looks editorial)
- 2-3 hashtags MAX, at the end

Twitter/X (1 main tweet + 5-8 thread tweets):
- First tweet: punchy hook, max 240 chars
- Each thread tweet: ONE idea, max 240 chars
- No "Read more" links, no link-shorteners
- 1-2 hashtags max
- End with one question

Threads (300-500 chars):
- Conversation starter — opens with a question
- Casual voice
- No hashtags

Facebook (500-800 chars):
- Warm, community-oriented
- Includes one explicit CTA (save, share, comment)
- Friendly tone, longer paragraphs OK

Return ONLY a single JSON object — no preamble, no commentary, no markdown fence — with shape:
{
  "linkedin": "...",
  "twitter": ["tweet 1", "tweet 2", "tweet 3", ...],
  "threads": "...",
  "facebook": "..."
}`;

export async function generateCrossPosts(input: CrossPostInput): Promise<{
  ok: boolean;
  written_paths?: string[];
  variants?: Record<string, unknown>;
  error?: string;
}> {
  if (!existsSync(input.source_path)) {
    return { ok: false, error: `source not found: ${input.source_path}` };
  }
  const sourceText = await fs.readFile(input.source_path, "utf8");

  // Trim front-matter if present
  const stripped = sourceText.replace(/^---[\s\S]*?\n---\n/, "");
  const prompt = `Source content (a blog post or article):
\`\`\`
${stripped.slice(0, 8000)}
\`\`\`

Generate the 4 platform variants per the rules. Return JSON only.`;

  const result = await callGemini({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.65,
    maxOutputTokens: 3072,
  });

  if (!result.ok || !result.text) {
    return { ok: false, error: result.error };
  }

  // Parse JSON
  let variants: Record<string, unknown>;
  try {
    // Strip markdown fence if present
    const cleaned = result.text
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();
    variants = JSON.parse(cleaned);
  } catch (err) {
    return {
      ok: false,
      error: `failed to parse JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Write each platform to a file
  const socialDir = path.join(path.dirname(input.source_path), "social");
  await fs.mkdir(socialDir, { recursive: true });
  const baseSlug = path.basename(input.source_path, ".md");
  const written: string[] = [];

  for (const [platform, content] of Object.entries(variants)) {
    let textOut: string;
    if (Array.isArray(content)) {
      textOut = content.map((t, i) => `[${i + 1}/${content.length}] ${t}`).join("\n\n");
    } else {
      textOut = String(content);
    }
    const outPath = path.join(socialDir, `${baseSlug}-${platform}.txt`);
    await fs.writeFile(outPath, textOut, "utf8");
    written.push(outPath);
  }

  await auditLog({
    action: "social_cross_posts_generated",
    actor: "automated:social-cross-post",
    details: {
      source: input.source_path,
      platforms: Object.keys(variants),
      written_count: written.length,
    },
    skill_invoked: "social-cross-post",
    actor_source: "skill-runner",
  });

  return { ok: true, written_paths: written, variants };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as Partial<CrossPostInput> | undefined;
  if (!inputs?.source_path) {
    return {
      ok: false,
      skill: "social-cross-post",
      path: "hand-coded",
      error: "missing required input: source_path",
    };
  }
  const result = await generateCrossPosts({
    source_path: inputs.source_path,
    platforms: inputs.platforms,
  });
  return {
    ok: result.ok,
    skill: "social-cross-post",
    path: "hand-coded",
    result: { variants_count: result.variants ? Object.keys(result.variants).length : 0 },
    artifacts: result.written_paths || [],
    error: result.error,
  };
}
