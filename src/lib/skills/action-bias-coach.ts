/**
 * action-bias-coach — hand-coded impl.
 *
 * Given a candidate decision context, decides whether to "ship rough now"
 * (default) or escalate to council-decision. Deterministic gates.
 */
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

export interface ActionBiasInput {
  decision_summary: string;
  estimated_dollar_impact_cents?: number;
  time_to_undo_hours?: number;
  is_strategic?: boolean;
  divergent_options_count?: number;
  stall_signals?: string[]; // e.g., "rereading the doc", "restating the question"
}

export type ActionBiasVerdict = "ship" | "council";

export interface ActionBiasResult {
  verdict: ActionBiasVerdict;
  rationale: string;
  gate_results: {
    dollar_above_threshold: boolean;
    undo_above_threshold: boolean;
    strategic: boolean;
    multi_option: boolean;
  };
  detected_stalls: string[];
  push_message: string;
}

const DOLLAR_THRESHOLD_CENTS = 100_000; // $1,000
const UNDO_THRESHOLD_HOURS = 4;
const OPTIONS_THRESHOLD = 2;

const STALL_PATTERNS = [
  /re[- ]?read(ing)? the same/i,
  /restating the question/i,
  /asking permission/i,
  /listing trade[- ]?offs/i,
  /could go either way/i,
];

function detectStalls(provided: string[] | undefined, summary: string): string[] {
  const out = provided ? [...provided] : [];
  for (const p of STALL_PATTERNS) {
    if (p.test(summary)) out.push(p.source);
  }
  return out;
}

export function evaluateActionBias(input: ActionBiasInput): ActionBiasResult {
  const dollarAbove = (input.estimated_dollar_impact_cents ?? 0) >= DOLLAR_THRESHOLD_CENTS;
  const undoAbove = (input.time_to_undo_hours ?? 0) >= UNDO_THRESHOLD_HOURS;
  const strategic = !!input.is_strategic;
  const multiOption = (input.divergent_options_count ?? 0) > OPTIONS_THRESHOLD;
  const allHigh = dollarAbove && undoAbove && strategic && multiOption;

  const verdict: ActionBiasVerdict = allHigh ? "council" : "ship";
  const stalls = detectStalls(input.stall_signals, input.decision_summary);
  const push = verdict === "ship"
    ? `Ship a rough cut now. Iterate from feedback. (gates: $=${dollarAbove}, undo=${undoAbove}, strategic=${strategic}, multi_option=${multiOption})`
    : `Run council-decision: all four gates fired (real money, real undo cost, strategic, multiple real options).`;
  const rationale = verdict === "ship"
    ? `Default ship. At least one gate is below threshold, so the cost of deliberation > cost of redo.`
    : `Council-decision required. All four thresholds met.`;
  return {
    verdict,
    rationale,
    gate_results: {
      dollar_above_threshold: dollarAbove,
      undo_above_threshold: undoAbove,
      strategic,
      multi_option: multiOption,
    },
    detected_stalls: stalls,
    push_message: push,
  };
}

export async function invokeActionBiasCoach(input: ActionBiasInput): Promise<ActionBiasResult> {
  const result = evaluateActionBias(input);
  await auditLog({
    action: "action_bias_evaluated",
    actor: "automated:action-bias-coach",
    details: { verdict: result.verdict, stalls: result.detected_stalls.length },
    skill_invoked: "action-bias-coach",
    actor_source: "skill-runner",
  });
  return result;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<ActionBiasInput> | undefined;
  if (!input?.decision_summary) {
    return {
      ok: false,
      skill: "action-bias-coach",
      path: "hand-coded",
      error: "missing required input: decision_summary",
    };
  }
  const result = await invokeActionBiasCoach(input as ActionBiasInput);
  return {
    ok: true,
    skill: "action-bias-coach",
    path: "hand-coded",
    result,
    next_actions: result.verdict === "council" ? ["invoke council-decision"] : ["ship and log outcome"],
  };
}
