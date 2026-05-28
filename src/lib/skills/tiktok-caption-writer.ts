/**
 * tiktok-caption-writer — hand-coded impl.
 *
 * 100-150 char TikTok caption writer. Hook-first, 2-3 hashtags, includes
 * a question to spark comments. Returns 3 variants. No em-dashes.
 */
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

export interface TikTokCaptionInput {
  hook: string;
  topic: string;
  vertical?: string; // e.g., pool-service, swfl, accounting
  question?: string; // engagement question; defaulted if absent
  tenant?: string;
  hashtags?: string[];
}

export interface TikTokCaptionVariant {
  caption: string;
  char_count: number;
  hashtag_count: number;
}

export interface TikTokCaptionResult {
  variants: TikTokCaptionVariant[];
  warnings: string[];
}

function normalizeTags(raw: string[] | undefined, vertical?: string): string[] {
  const base = (raw ?? []).map((t) => t.replace(/^#/, "").toLowerCase().replace(/[^a-z0-9]/g, "")).filter(Boolean);
  if (vertical) base.push(vertical.replace(/[^a-z0-9]/gi, "").toLowerCase());
  base.push("fyp");
  return [...new Set(base)].slice(0, 3).map((t) => `#${t}`);
}

function strip(text: string): string {
  return text.replace(/[—–]/g, "-");
}

export function writeTikTokCaptions(input: TikTokCaptionInput): TikTokCaptionResult {
  const warnings: string[] = [];
  const hook = strip(input.hook.trim());
  if (hook.length < 20) warnings.push("hook <20 chars; expand to ~40-60 for stronger first impression");
  const tags = normalizeTags(input.hashtags, input.vertical);
  const q = input.question?.trim() || `which one are you?`;

  const variants: TikTokCaptionVariant[] = [];
  const candidates = [
    `${hook} ${q} ${tags.join(" ")}`,
    `${hook} ${tags.join(" ")}`,
    `${hook} ${tags.slice(0, 2).join(" ")}`,
  ];
  for (const raw of candidates) {
    const caption = strip(raw).slice(0, 150);
    variants.push({
      caption,
      char_count: caption.length,
      hashtag_count: (caption.match(/#/g) ?? []).length,
    });
  }
  for (const v of variants) {
    if (v.char_count > 150) warnings.push(`variant exceeds 150 chars (${v.char_count})`);
    if (/link in bio/i.test(v.caption)) warnings.push(`variant contains 'link in bio' (algorithm de-prioritizes)`);
  }
  return { variants, warnings };
}

export async function invokeTiktokCaptionWriter(
  input: TikTokCaptionInput
): Promise<TikTokCaptionResult> {
  const out = writeTikTokCaptions(input);
  await auditLog({
    action: "tiktok_caption_drafted",
    actor: "automated:tiktok-caption-writer",
    details: { topic: input.topic, variants: out.variants.length, warnings: out.warnings.length, tenant: input.tenant },
    skill_invoked: "tiktok-caption-writer",
    actor_source: "skill-runner",
  });
  return out;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<TikTokCaptionInput> | undefined;
  if (!input?.hook || !input.topic) {
    return {
      ok: false,
      skill: "tiktok-caption-writer",
      path: "hand-coded",
      error: "missing required inputs: hook, topic",
    };
  }
  const result = await invokeTiktokCaptionWriter(input as TikTokCaptionInput);
  return {
    ok: true,
    skill: "tiktok-caption-writer",
    path: "hand-coded",
    result,
  };
}
