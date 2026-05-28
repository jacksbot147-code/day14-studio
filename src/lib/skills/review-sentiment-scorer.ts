/**
 * review-sentiment-scorer — hand-coded impl.
 *
 * Cheap, deterministic sentiment + fairness scorer for Google/Yelp/FB
 * reviews. Rating + length + keyword patterns → classification.
 * Sister skill to feedback-classifier; called inline by review-response.
 */
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

export type ReviewPlatform = "google" | "yelp" | "facebook" | "other";

export interface ReviewInput {
  rating: number; // 1..5
  text: string;
  author?: string;
  platform: ReviewPlatform;
  customer_slug?: string;
  timestamp?: string;
}

export type ReviewClass =
  | "glowing-positive"
  | "standard-positive"
  | "mixed"
  | "negative"
  | "very-negative";

export type ReviewLength = "minimal-text" | "standard" | "detailed" | "essay";

export interface ReviewScore {
  classification: ReviewClass;
  length: ReviewLength;
  fairness: "fair" | "unfair" | "uncertain";
  weight: number; // recommended weighting for response triage
  signals: {
    positive_keywords: string[];
    negative_keywords: string[];
    unfair_signals: string[];
  };
  confidence: number;
  reply_priority: "P0" | "P1" | "P2" | "P3";
}

const POSITIVE = [
  /\bgreat\b/i, /\bawesome\b/i, /\bexcellent\b/i, /\boutstanding\b/i,
  /\brecommend\b/i, /\bprofessional\b/i, /\bon time\b/i, /\bworth\b/i,
  /\bhappy\b/i, /\blove(d)?\b/i,
];
const NEGATIVE = [
  /\brude\b/i, /\bawful\b/i, /\bterrible\b/i, /\bdisappointed\b/i,
  /\bnever (again|use)\b/i, /\bscam\b/i, /\bripoff\b/i, /\bavoid\b/i,
  /\bwaste\b/i, /\bworst\b/i,
];
const UNFAIR_SIGNALS = [
  /\bcompetitor\b/i, /\bnever (used|hired|been a customer)\b/i,
  /wrong (company|business)/i, /thought (this|you)/i,
];

function lengthBucket(chars: number): ReviewLength {
  if (chars < 30) return "minimal-text";
  if (chars < 200) return "standard";
  if (chars < 800) return "detailed";
  return "essay";
}

function ratingClass(rating: number): ReviewClass {
  if (rating >= 5) return "glowing-positive";
  if (rating === 4) return "standard-positive";
  if (rating === 3) return "mixed";
  if (rating === 2) return "negative";
  return "very-negative";
}

export function scoreReview(input: ReviewInput): ReviewScore {
  const text = input.text || "";
  const positiveHits: string[] = [];
  const negativeHits: string[] = [];
  const unfairHits: string[] = [];
  for (const re of POSITIVE) { const m = text.match(re); if (m && m[0]) positiveHits.push(m[0]); }
  for (const re of NEGATIVE) { const m = text.match(re); if (m && m[0]) negativeHits.push(m[0]); }
  for (const re of UNFAIR_SIGNALS) { const m = text.match(re); if (m && m[0]) unfairHits.push(m[0]); }

  const len = lengthBucket(text.length);
  let cls = ratingClass(input.rating);
  // Cross-check: rating says positive but text says negative? Downgrade to mixed.
  if ((cls === "glowing-positive" || cls === "standard-positive") && negativeHits.length >= 2 && positiveHits.length === 0) {
    cls = "mixed";
  }

  const fairness: ReviewScore["fairness"] = unfairHits.length >= 1 ? "unfair" : (cls === "very-negative" && len === "minimal-text" ? "uncertain" : "fair");

  let weight = 1;
  if (len === "essay") weight = 2;
  if (len === "minimal-text") weight = 0.5;

  let priority: ReviewScore["reply_priority"] = "P3";
  if (cls === "very-negative") priority = "P0";
  else if (cls === "negative") priority = "P1";
  else if (cls === "mixed") priority = "P2";

  return {
    classification: cls,
    length: len,
    fairness,
    weight,
    signals: { positive_keywords: positiveHits, negative_keywords: negativeHits, unfair_signals: unfairHits },
    confidence: Math.min(1, 0.5 + 0.1 * (positiveHits.length + negativeHits.length)),
    reply_priority: priority,
  };
}

export async function invokeReviewSentimentScorer(input: ReviewInput): Promise<ReviewScore> {
  const score = scoreReview(input);
  await auditLog({
    action: "review_scored",
    actor: "automated:review-sentiment-scorer",
    customer_slug: input.customer_slug,
    details: { platform: input.platform, rating: input.rating, classification: score.classification, fairness: score.fairness, priority: score.reply_priority },
    skill_invoked: "review-sentiment-scorer",
    actor_source: "skill-runner",
  });
  return score;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<ReviewInput> | undefined;
  if (typeof input?.rating !== "number" || !input.text || !input.platform) {
    return {
      ok: false,
      skill: "review-sentiment-scorer",
      path: "hand-coded",
      error: "missing required inputs: rating (number), text, platform",
    };
  }
  const result = await invokeReviewSentimentScorer({
    rating: input.rating,
    text: input.text,
    platform: input.platform,
    author: input.author,
    customer_slug: input.customer_slug ?? ctx.customer_slug,
    timestamp: input.timestamp,
  });
  return {
    ok: true,
    skill: "review-sentiment-scorer",
    path: "hand-coded",
    result,
    jack_tap_required: result.reply_priority === "P0" || result.fairness === "unfair",
    next_actions: [`draft via review-response with priority=${result.reply_priority}`],
  };
}
