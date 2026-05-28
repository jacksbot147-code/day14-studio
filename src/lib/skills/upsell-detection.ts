/**
 * upsell-detection — hand-coded impl.
 *
 * Scans a free-form customer message + tier context to detect upsell
 * opportunities. Deterministic signal matcher; surfaces the strongest
 * upgrade path with a confidence score.
 */
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

export type CurrentTier = "site" | "portal" | "platform";

export interface UpsellInput {
  customer_slug: string;
  current_tier: CurrentTier;
  message: string;
  ltv_cents?: number;
  vertical?: string;
}

export type UpsellPath = "site->portal" | "portal->platform" | "addon" | "cross-vertical" | "none";

export interface UpsellSignal {
  pattern: string;
  matched: string;
  path: UpsellPath;
  confidence: number;
}

export interface UpsellResult {
  has_opportunity: boolean;
  best_path: UpsellPath;
  best_confidence: number;
  signals: UpsellSignal[];
  pitch_outline: string | null;
}

interface Rule {
  pattern: RegExp;
  applies_to: CurrentTier[];
  path: UpsellPath;
  confidence: number;
  label: string;
}

const RULES: Rule[] = [
  { pattern: /online (booking|scheduling)/i, applies_to: ["site"], path: "site->portal", confidence: 0.9, label: "wants online booking" },
  { pattern: /customer (login|portal|account)/i, applies_to: ["site"], path: "site->portal", confidence: 0.9, label: "wants customer login area" },
  { pattern: /admin (dashboard|panel)/i, applies_to: ["portal"], path: "portal->platform", confidence: 0.85, label: "wants admin dashboard" },
  { pattern: /(tech|technician) routes?/i, applies_to: ["portal"], path: "portal->platform", confidence: 0.85, label: "wants tech route planning" },
  { pattern: /visit[- ]?tracking|chemistry/i, applies_to: ["portal"], path: "portal->platform", confidence: 0.8, label: "wants visit tracking" },
  { pattern: /could you also (add|build|make)/i, applies_to: ["site", "portal", "platform"], path: "addon", confidence: 0.55, label: "scope-expansion request" },
  { pattern: /new (vertical|business|location)/i, applies_to: ["site", "portal", "platform"], path: "cross-vertical", confidence: 0.7, label: "expanding to new vertical" },
];

export function detectUpsell(input: UpsellInput): UpsellResult {
  const signals: UpsellSignal[] = [];
  for (const rule of RULES) {
    if (!rule.applies_to.includes(input.current_tier)) continue;
    const m = input.message.match(rule.pattern);
    if (m && m[0]) {
      signals.push({
        pattern: rule.label,
        matched: m[0],
        path: rule.path,
        confidence: rule.confidence,
      });
    }
  }
  if (signals.length === 0) {
    return {
      has_opportunity: false,
      best_path: "none",
      best_confidence: 0,
      signals: [],
      pitch_outline: null,
    };
  }
  const best = [...signals].sort((a, b) => b.confidence - a.confidence)[0]!;
  const pitch = buildPitchOutline(best, input);
  return {
    has_opportunity: true,
    best_path: best.path,
    best_confidence: best.confidence,
    signals,
    pitch_outline: pitch,
  };
}

function buildPitchOutline(signal: UpsellSignal, input: UpsellInput): string {
  const headline: Record<UpsellPath, string> = {
    "site->portal": "Sounds like Portal would actually pay for itself here.",
    "portal->platform": "Platform unlocks exactly what you're asking for.",
    "addon": "We can scope this as an add-on — quick yes/no on price.",
    "cross-vertical": "Second build on the same owner is 20% off.",
    "none": "",
  };
  return [
    headline[signal.path],
    `Trigger: ${signal.pattern} ("${signal.matched}")`,
    `Customer: ${input.customer_slug} (current: ${input.current_tier})`,
    `Next step: draft the upgrade pitch in the customer's voice and queue for Jack-tap.`,
  ].filter(Boolean).join("\n");
}

export async function invokeUpsellDetection(input: UpsellInput): Promise<UpsellResult> {
  const result = detectUpsell(input);
  if (result.has_opportunity) {
    await auditLog({
      action: "upsell_opportunity_detected",
      actor: "automated:upsell-detection",
      customer_slug: input.customer_slug,
      details: { path: result.best_path, confidence: result.best_confidence },
      skill_invoked: "upsell-detection",
      actor_source: "skill-runner",
    });
  }
  return result;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<UpsellInput> | undefined;
  if (!input?.customer_slug || !input.current_tier || !input.message) {
    return {
      ok: false,
      skill: "upsell-detection",
      path: "hand-coded",
      error: "missing required inputs: customer_slug, current_tier, message",
    };
  }
  const result = await invokeUpsellDetection(input as UpsellInput);
  return {
    ok: true,
    skill: "upsell-detection",
    path: "hand-coded",
    result,
    jack_tap_required: result.has_opportunity,
  };
}
