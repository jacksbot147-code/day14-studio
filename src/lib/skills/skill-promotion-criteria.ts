/**
 * skill-promotion-criteria — hand-coded impl.
 *
 * The gatekeeper that decides whether a candidate pattern should be
 * promoted to a real skill. Encodes the 5 mandatory criteria + bonus
 * signals + negative blocks. Pure deterministic decision logic.
 */
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";

export interface PromotionInput {
  occurrences: number; // total times observed
  distinct_contexts: number; // # of distinct customer slugs / sessions / days
  pattern_stable: boolean; // same inputs/outputs across occurrences?
  estimated_line_count: number; // how many lines would the SKILL.md need?
  triggers: string[]; // 3-5 trigger phrases proposed
  trivial: boolean; // is this a one-line "if X then Y" decision?
  // Bonus signals (optional)
  prevents_recurring_bug?: boolean;
  jack_weekly_use?: boolean;
  compounds_with_anchor?: string | null;
  saves_minutes_per_invocation?: number;
  // Negative signals
  superseded_by?: string | null;
  is_pure_judgment?: boolean;
}

export type PromotionDecision = "promote" | "draft-only" | "block";

export interface PromotionResult {
  decision: PromotionDecision;
  reasons: string[];
  bonus_points: number;
  failed_criteria: string[];
}

export function evaluatePromotion(input: PromotionInput): PromotionResult {
  const failed: string[] = [];
  const reasons: string[] = [];

  // 1. 3-occurrence rule
  if (input.occurrences < 3) {
    failed.push(`occurrences=${input.occurrences} < 3 (3-occurrence rule)`);
  }

  if (input.distinct_contexts < 2) {
    failed.push(`distinct_contexts=${input.distinct_contexts} < 2`);
  }

  // 2. Pattern stability
  if (!input.pattern_stable) {
    failed.push("pattern not stable across occurrences");
  }

  // 3. Encodable in 60-200 lines
  if (input.estimated_line_count > 200) {
    failed.push(`estimated_line_count=${input.estimated_line_count} > 200 (split into multiple skills)`);
  }
  if (input.estimated_line_count < 30) {
    failed.push(`estimated_line_count=${input.estimated_line_count} < 30 (too trivial — likely a one-liner)`);
  }

  // 4. Triggers
  if (!Array.isArray(input.triggers) || input.triggers.length < 3 || input.triggers.length > 7) {
    failed.push(`triggers count=${input.triggers?.length ?? 0} — must be 3-5 (or up to 7)`);
  }

  // 5. Above trivial decision threshold
  if (input.trivial) {
    failed.push("trivial single-line decision — fold into existing skill instead");
  }
  if (input.is_pure_judgment) {
    failed.push("pure judgment with no encodable rules — Council prompt template, not a skill");
  }

  // Negative blockers
  if (input.superseded_by) {
    failed.push(`superseded_by=${input.superseded_by} — improve existing skill instead`);
  }

  // Bonus signals
  let bonus = 0;
  if (input.prevents_recurring_bug) bonus += 1;
  if (input.jack_weekly_use) bonus += 1;
  if (input.compounds_with_anchor) bonus += 1;
  if ((input.saves_minutes_per_invocation ?? 0) >= 15) bonus += 1;

  let decision: PromotionDecision;
  if (failed.length === 0) {
    decision = "promote";
    reasons.push("all 5 mandatory criteria passed");
    if (bonus > 0) reasons.push(`bonus signals: ${bonus}/4`);
  } else if (input.occurrences >= 2 && input.distinct_contexts >= 2 && failed.length <= 1) {
    // growth-always-on 2-occurrence rule allows DRAFT
    decision = "draft-only";
    reasons.push("meets draft threshold (2 occurrences, 2 distinct contexts)");
    reasons.push(`failed mandatory: ${failed.join("; ")}`);
  } else {
    decision = "block";
    reasons.push(`failed ${failed.length} mandatory criteria`);
  }

  return { decision, reasons, bonus_points: bonus, failed_criteria: failed };
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<PromotionInput> | undefined;
  if (!input || typeof input.occurrences !== "number") {
    return {
      ok: false,
      skill: "skill-promotion-criteria",
      path: "hand-coded",
      error: "missing required inputs (occurrences, distinct_contexts, etc.)",
    };
  }
  const result = evaluatePromotion({
    occurrences: input.occurrences,
    distinct_contexts: input.distinct_contexts ?? 0,
    pattern_stable: input.pattern_stable ?? false,
    estimated_line_count: input.estimated_line_count ?? 0,
    triggers: input.triggers ?? [],
    trivial: input.trivial ?? false,
    prevents_recurring_bug: input.prevents_recurring_bug,
    jack_weekly_use: input.jack_weekly_use,
    compounds_with_anchor: input.compounds_with_anchor,
    saves_minutes_per_invocation: input.saves_minutes_per_invocation,
    superseded_by: input.superseded_by,
    is_pure_judgment: input.is_pure_judgment,
  });
  return {
    ok: result.decision !== "block",
    skill: "skill-promotion-criteria",
    path: "hand-coded",
    result,
  };
}
