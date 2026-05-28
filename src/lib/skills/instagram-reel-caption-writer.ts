/**
 * instagram-reel-caption-writer — hand-coded impl.
 *
 * Template-based IG Reel caption writer. 200-500 char body, line-broken,
 * with a save-CTA. Returns 3 variants. No hashtags inline (they go in
 * the first comment); we surface a hashtag block separately.
 */
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

export interface IGReelCaptionInput {
  hook: string; // 60-100 char hook line
  topic: string;
  vertical?: string;
  cta?: "save" | "share" | "comment";
  hashtags?: string[]; // raw words; we'll normalize
  tenant?: string;
}

export interface IGReelCaptionVariant {
  caption: string;
  hashtag_comment: string;
  char_count: number;
  cta_used: "save" | "share" | "comment";
}

export interface IGReelCaptionResult {
  variants: IGReelCaptionVariant[];
  warnings: string[];
}

function normalizeTags(raw: string[] | undefined): string[] {
  if (!raw || raw.length === 0) return [];
  return raw
    .map((t) => t.replace(/^#/, "").toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .slice(0, 12)
    .map((t) => `#${t}`);
}

const CTAS = {
  save: "save this for later",
  share: "share with someone who needs this",
  comment: "what would you add?",
};

function buildVariant(
  hook: string,
  middle: string,
  cta: keyof typeof CTAS,
  hashtags: string[]
): IGReelCaptionVariant {
  const lines = [hook.trim(), "", middle.trim(), "", `→ ${CTAS[cta]}`];
  const caption = lines.join("\n");
  const tagBlock = hashtags.length ? `. . . . .\n${hashtags.join(" ")}` : ". . . . .";
  return {
    caption,
    hashtag_comment: tagBlock,
    char_count: caption.length,
    cta_used: cta,
  };
}

export function writeIGReelCaptions(input: IGReelCaptionInput): IGReelCaptionResult {
  const warnings: string[] = [];
  if (input.hook.length > 100) warnings.push("hook >100 chars; trim for stronger first-line impact");
  if (input.hook.length < 25) warnings.push("hook <25 chars; expand for more pull");

  const hashtags = normalizeTags(input.hashtags);
  const middleA = `Most people get ${input.topic} wrong because they skip the boring part. Here's what changes when you don't.`;
  const middleB = `Three things about ${input.topic} that took me 2 years to figure out — pinned in this Reel.`;
  const middleC = `If you've ever wondered about ${input.topic}, this is the answer that nobody writes down.`;

  const variants = [
    buildVariant(input.hook, middleA, input.cta || "save", hashtags),
    buildVariant(input.hook, middleB, "share", hashtags),
    buildVariant(input.hook, middleC, "comment", hashtags),
  ];

  for (const v of variants) {
    if (v.char_count > 2200) warnings.push(`variant exceeds 2200-char limit (${v.char_count})`);
  }
  return { variants, warnings };
}

export async function invokeInstagramReelCaptionWriter(
  input: IGReelCaptionInput
): Promise<IGReelCaptionResult> {
  const out = writeIGReelCaptions(input);
  await auditLog({
    action: "ig_reel_caption_drafted",
    actor: "automated:instagram-reel-caption-writer",
    details: { topic: input.topic, variants: out.variants.length, warnings: out.warnings.length, tenant: input.tenant },
    skill_invoked: "instagram-reel-caption-writer",
    actor_source: "skill-runner",
  });
  return out;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<IGReelCaptionInput> | undefined;
  if (!input?.hook || !input.topic) {
    return {
      ok: false,
      skill: "instagram-reel-caption-writer",
      path: "hand-coded",
      error: "missing required inputs: hook, topic",
    };
  }
  const result = await invokeInstagramReelCaptionWriter(input as IGReelCaptionInput);
  return {
    ok: true,
    skill: "instagram-reel-caption-writer",
    path: "hand-coded",
    result,
  };
}
