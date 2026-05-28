/**
 * youtube-shorts-caption-writer — hand-coded impl.
 *
 * Title + description writer for YouTube Shorts. Title is CTR-critical
 * (50-60 char sweet spot). Description ~500 chars with first two lines
 * carrying the value prop. Returns 3 title variants + description.
 */
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

export interface YTShortsInput {
  topic: string;
  niche_keyword: string;
  vertical?: string;
  long_form_url?: string;
  tenant?: string;
  hashtags?: string[];
}

export interface YTTitleVariant {
  title: string;
  char_count: number;
  pattern: "question" | "number" | "curiosity";
}

export interface YTShortsResult {
  title_variants: YTTitleVariant[];
  description: string;
  warnings: string[];
}

function normalizeTags(raw: string[] | undefined): string[] {
  const out = (raw ?? [])
    .map((t) => t.replace(/^#/, "").replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);
  if (!out.includes("Shorts")) out.unshift("Shorts");
  return out.slice(0, 3).map((t) => `#${t}`);
}

export function writeYouTubeShorts(input: YTShortsInput): YTShortsResult {
  const warnings: string[] = [];
  const kw = input.niche_keyword.trim();
  const topic = input.topic.trim();

  const seeds: YTTitleVariant[] = [
    { title: `Why most ${kw} ${topic} fails (and the fix)`, char_count: 0, pattern: "curiosity" },
    { title: `3 ${kw} ${topic} mistakes nobody talks about`, char_count: 0, pattern: "number" },
    { title: `Should you change your ${kw} ${topic} setup?`, char_count: 0, pattern: "question" },
  ];
  const titleVariants: YTTitleVariant[] = seeds.map((v) => ({ ...v, char_count: v.title.length }));

  for (const v of titleVariants) {
    if (v.char_count > 100) warnings.push(`title exceeds 100-char hard cap (${v.char_count})`);
    if (v.char_count < 30) warnings.push(`title <30 chars; risk of looking generic`);
  }

  const tags = normalizeTags(input.hashtags);
  const descLines = [
    `${topic} — the short version.`,
    "",
    input.long_form_url ? `Full breakdown: ${input.long_form_url}` : "Full breakdown coming soon.",
    "",
    tags.join(" "),
  ];
  const description = descLines.join("\n");
  if (description.length > 500) warnings.push(`description >500 chars; will be truncated in preview`);

  return { title_variants: titleVariants, description, warnings };
}

export async function invokeYoutubeShortsCaptionWriter(
  input: YTShortsInput
): Promise<YTShortsResult> {
  const out = writeYouTubeShorts(input);
  await auditLog({
    action: "yt_shorts_caption_drafted",
    actor: "automated:youtube-shorts-caption-writer",
    details: { topic: input.topic, niche: input.niche_keyword, warnings: out.warnings.length, tenant: input.tenant },
    skill_invoked: "youtube-shorts-caption-writer",
    actor_source: "skill-runner",
  });
  return out;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<YTShortsInput> | undefined;
  if (!input?.topic || !input.niche_keyword) {
    return {
      ok: false,
      skill: "youtube-shorts-caption-writer",
      path: "hand-coded",
      error: "missing required inputs: topic, niche_keyword",
    };
  }
  const result = await invokeYoutubeShortsCaptionWriter(input as YTShortsInput);
  return {
    ok: true,
    skill: "youtube-shorts-caption-writer",
    path: "hand-coded",
    result,
  };
}
