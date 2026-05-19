/**
 * inbound-classifier — hand-coded impl.
 *
 * Classifies inbound emails by keyword + heuristic rules. Returns one of:
 *   - support_request
 *   - refund_request
 *   - cancellation_intent
 *   - payment_issue
 *   - complaint
 *   - new_lead
 *   - general_question
 *   - spam
 *
 * Each classification maps to a downstream skill via the dispatcher.
 *
 * This is the fast deterministic path. The LLM agent loop (skill-runner)
 * handles ambiguous cases.
 */

import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

export type Classification =
  | "support_request"
  | "refund_request"
  | "cancellation_intent"
  | "payment_issue"
  | "complaint"
  | "new_lead"
  | "general_question"
  | "spam";

export interface ClassifyResult {
  tag: Classification;
  confidence: number; // 0.0 - 1.0
  matched_keywords: string[];
  suggested_skill: string;
}

const RULES: Array<{
  keywords: RegExp[];
  tag: Classification;
  skill: string;
  weight: number;
}> = [
  // Refund + cancel (high priority — money at stake)
  {
    keywords: [/\brefund/i, /money back/i, /return my (money|payment)/i],
    tag: "refund_request",
    skill: "refund-handler",
    weight: 0.9,
  },
  {
    keywords: [/\bcancel(ed|lation)?\b/i, /unsubscribe/i, /\bclose (my )?account\b/i],
    tag: "cancellation_intent",
    skill: "subscription-pause-handler",
    weight: 0.85,
  },
  {
    keywords: [
      /payment (failed|declined|didn't|wouldn't)/i,
      /card (declined|expired)/i,
      /charge.*twice/i,
      /double.charge/i,
    ],
    tag: "payment_issue",
    skill: "failed-payment-retry",
    weight: 0.85,
  },
  // Complaints
  {
    keywords: [
      /complaint/i,
      /not (working|happy|satisfied)/i,
      /frustrated/i,
      /angry/i,
      /terrible/i,
      /awful/i,
      /broken/i,
      /\bsue\b/i,
      /lawsuit/i,
      /\bfraud\b/i,
    ],
    tag: "complaint",
    skill: "complaint-escalation",
    weight: 0.75,
  },
  // New leads
  {
    keywords: [
      /interested in/i,
      /want to (buy|sign up|order)/i,
      /\bquote\b/i,
      /how much.*(cost|price)/i,
      /\bpricing\b/i,
      /\bstart\b.*\bbusiness\b/i,
    ],
    tag: "new_lead",
    skill: "intake-parser",
    weight: 0.7,
  },
  // Spam signals
  {
    keywords: [
      /\bSEO services?\b/i,
      /\bback ?links?\b/i,
      /\bcrypto\b/i,
      /\b(viagra|cialis)\b/i,
      /click here.*\$\d+/i,
      /\boutsourc/i,
    ],
    tag: "spam",
    skill: "auto-archive-spam",
    weight: 0.95,
  },
  // Generic support
  {
    keywords: [/help/i, /question/i, /problem/i, /issue/i, /not sure/i],
    tag: "support_request",
    skill: "customer-history-lookup",
    weight: 0.4,
  },
];

export function classify(text: string, subject = ""): ClassifyResult {
  const combined = `${subject}\n${text}`.toLowerCase();
  const scores = new Map<
    Classification,
    { count: number; keywords: string[]; skill: string; weight: number }
  >();

  for (const rule of RULES) {
    let matchCount = 0;
    const matched: string[] = [];
    for (const re of rule.keywords) {
      const m = combined.match(re);
      if (m && m[0]) {
        matchCount += 1;
        matched.push(m[0]);
      }
    }
    if (matchCount > 0) {
      const existing = scores.get(rule.tag);
      if (existing) {
        existing.count += matchCount;
        existing.keywords.push(...matched);
      } else {
        scores.set(rule.tag, {
          count: matchCount,
          keywords: matched,
          skill: rule.skill,
          weight: rule.weight,
        });
      }
    }
  }

  // Pick highest weighted, then highest count
  let best: { tag: Classification; score: number; data: { count: number; keywords: string[]; skill: string; weight: number } } | null = null;
  for (const [tag, data] of scores) {
    const score = data.weight * Math.min(1, data.count / 2 + 0.5);
    if (!best || score > best.score) {
      best = { tag, score, data };
    }
  }

  if (!best) {
    return {
      tag: "general_question",
      confidence: 0.3,
      matched_keywords: [],
      suggested_skill: "customer-history-lookup",
    };
  }

  return {
    tag: best.tag,
    confidence: Math.min(1, best.score),
    matched_keywords: best.data.keywords,
    suggested_skill: best.data.skill,
  };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const inputs = ctx.inputs as
    | { text?: string; subject?: string; from?: string }
    | undefined;

  if (!inputs?.text && !inputs?.subject) {
    return {
      ok: false,
      skill: "inbound-classifier",
      path: "hand-coded",
      error: "missing inputs: text and/or subject required",
    };
  }

  const result = classify(inputs.text ?? "", inputs.subject ?? "");

  await auditLog({
    action: "email_classified",
    actor: "automated:inbound-classifier",
    customer_slug: ctx.customer_slug,
    details: {
      from: inputs.from,
      classification: result.tag,
      confidence: result.confidence,
      keywords: result.matched_keywords,
    },
    skill_invoked: "inbound-classifier",
    actor_source: "skill-runner",
  });

  return {
    ok: true,
    skill: "inbound-classifier",
    path: "hand-coded",
    result,
    next_actions: [`route to ${result.suggested_skill}`],
  };
}
