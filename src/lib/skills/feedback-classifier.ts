/**
 * feedback-classifier — hand-coded impl.
 *
 * Unified front-door categorizer for ANY inbound customer signal
 * (email, SMS, chat widget, review, DM, in-person transcription).
 * Deterministic keyword + rule classifier; routes to downstream skill.
 */
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

export type FeedbackChannel =
  | "email"
  | "sms"
  | "chat"
  | "review"
  | "dm"
  | "in-person";

export type FeedbackTag =
  | "scope-question"
  | "change-request"
  | "complaint"
  | "compliment"
  | "feature-request"
  | "bug-report"
  | "pricing-inquiry"
  | "booking-question"
  | "referral-mention"
  | "unsubscribe"
  | "legal"
  | "general";

export interface FeedbackInput {
  channel: FeedbackChannel;
  text: string;
  customer_slug?: string;
  author?: string;
}

export interface FeedbackResult {
  tag: FeedbackTag;
  confidence: number;
  downstream_skill: string;
  matched: string[];
  channel: FeedbackChannel;
}

interface FRule {
  tag: FeedbackTag;
  skill: string;
  patterns: RegExp[];
  weight: number;
}

const RULES: FRule[] = [
  { tag: "legal", skill: "complaint-escalation", weight: 0.99, patterns: [/lawyer/i, /\bsue\b/i, /lawsuit/i, /attorney/i, /legal action/i, /cease and desist/i] },
  { tag: "unsubscribe", skill: "subscription-pause-handler", weight: 0.95, patterns: [/unsubscribe/i, /stop emailing/i, /remove me from/i, /opt[- ]?out/i] },
  { tag: "complaint", skill: "complaint-escalation", weight: 0.85, patterns: [/not working/i, /broken/i, /\bterrible\b/i, /\bawful\b/i, /\bfrustrated\b/i, /disappointed/i, /\bworst\b/i] },
  { tag: "bug-report", skill: "postmortem-writer", weight: 0.85, patterns: [/error(ed|s)? when/i, /\bbug\b/i, /not loading/i, /\bcrash(ed|es|ing)?\b/i, /shows? blank/i] },
  { tag: "change-request", skill: "approval-card-builder", weight: 0.7, patterns: [/can you (make|change|move)/i, /\bplease (update|change|move|swap)\b/i, /move the (hero|button|form)/i] },
  { tag: "feature-request", skill: "skill-gap-detector", weight: 0.7, patterns: [/could you (also|add)/i, /\bfeature request\b/i, /would be (great|nice) (if|to)/i, /any (chance|way) you could add/i] },
  { tag: "pricing-inquiry", skill: "pricing-decision-helper", weight: 0.85, patterns: [/how much/i, /\bcost\b/i, /\bprice\b/i, /\bpricing\b/i, /\bquote\b/i] },
  { tag: "booking-question", skill: "appointment-booking-engine", weight: 0.75, patterns: [/\bbook\b/i, /can I schedule/i, /available (on|next)/i, /next available/i] },
  { tag: "referral-mention", skill: "warm-dm-personalizer", weight: 0.75, patterns: [/told (my )?(neighbor|friend|coworker|spouse)/i, /referred (you|me)/i, /sent (me )?(your way|to you)/i] },
  { tag: "compliment", skill: "case-study-writer", weight: 0.7, patterns: [/\bthank you\b/i, /amazing/i, /love (the|this|it)/i, /great job/i, /best (decision|choice)/i] },
  { tag: "scope-question", skill: "inbound-classifier", weight: 0.6, patterns: [/is .* included/i, /does this cover/i, /what about (the )?\w+/i, /can you also/i] },
];

export function classifyFeedback(input: FeedbackInput): FeedbackResult {
  const text = input.text;
  let best: { rule: FRule; matched: string[]; score: number } | null = null;
  for (const rule of RULES) {
    const matched: string[] = [];
    for (const p of rule.patterns) {
      const m = text.match(p);
      if (m && m[0]) matched.push(m[0]);
    }
    if (matched.length === 0) continue;
    const score = rule.weight * Math.min(1, 0.6 + 0.2 * matched.length);
    if (!best || score > best.score) best = { rule, matched, score };
  }
  if (!best) {
    return {
      tag: "general",
      confidence: 0.3,
      downstream_skill: "inbound-classifier",
      matched: [],
      channel: input.channel,
    };
  }
  return {
    tag: best.rule.tag,
    confidence: Math.min(1, best.score),
    downstream_skill: best.rule.skill,
    matched: best.matched,
    channel: input.channel,
  };
}

export async function invokeFeedbackClassifier(input: FeedbackInput): Promise<FeedbackResult> {
  const result = classifyFeedback(input);
  await auditLog({
    action: "feedback_classified",
    actor: "automated:feedback-classifier",
    customer_slug: input.customer_slug,
    details: { tag: result.tag, channel: result.channel, confidence: result.confidence, downstream: result.downstream_skill },
    skill_invoked: "feedback-classifier",
    actor_source: "skill-runner",
  });
  return result;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<FeedbackInput> | undefined;
  if (!input?.text || !input.channel) {
    return {
      ok: false,
      skill: "feedback-classifier",
      path: "hand-coded",
      error: "missing required inputs: channel, text",
    };
  }
  const result = await invokeFeedbackClassifier({
    channel: input.channel,
    text: input.text,
    customer_slug: input.customer_slug ?? ctx.customer_slug,
    author: input.author,
  });
  return {
    ok: true,
    skill: "feedback-classifier",
    path: "hand-coded",
    result,
    next_actions: [`route to ${result.downstream_skill}`],
  };
}
