/**
 * win-back-campaign-trigger — hand-coded impl.
 *
 * Day-30/60/90 win-back sequence for churned customers.
 * Hard rules: never before day 30, max 25% discount on day-90 only,
 * never win-back fraudsters or chargeback customers.
 */
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

export type WinBackStep = "d30" | "d60" | "d90";

export interface WinBackInput {
  customer_slug: string;
  customer_email: string;
  churned_at: string; // ISO
  vertical?: string;
  site_url?: string;
  is_fraudster?: boolean;
  chargeback_on_record?: boolean;
  customer_replied?: boolean;
  last_winback_at?: string;
}

export interface WinBackPlan {
  should_send: boolean;
  next_step: WinBackStep | null;
  reason: string;
  subject?: string;
  body?: string;
  discount_pct?: number;
}

function daysSince(iso: string, now = Date.now()): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return -1;
  return (now - t) / (24 * 3_600_000);
}

const SUBJECTS: Record<WinBackStep, string> = {
  d30: "How's it been since {date}?",
  d60: "Quick update on {vertical}",
  d90: "If you wanted to come back, here's how",
};

export function planWinBack(input: WinBackInput, now = Date.now()): WinBackPlan {
  if (input.is_fraudster || input.chargeback_on_record) {
    return { should_send: false, next_step: null, reason: "blocklist:fraud_or_chargeback" };
  }
  if (input.customer_replied) {
    return { should_send: false, next_step: null, reason: "paused:customer_replied" };
  }
  const days = daysSince(input.churned_at, now);
  if (days < 0) {
    return { should_send: false, next_step: null, reason: "invalid_churned_at" };
  }
  if (days > 95) {
    return { should_send: false, next_step: null, reason: "past_hard_stop:90d" };
  }
  let step: WinBackStep | null = null;
  if (days >= 90) step = "d90";
  else if (days >= 60) step = "d60";
  else if (days >= 30) step = "d30";
  if (!step) {
    return { should_send: false, next_step: null, reason: `too_recent:${days.toFixed(0)}d` };
  }
  if (input.last_winback_at) {
    const lastDays = daysSince(input.last_winback_at, now);
    if (lastDays < 25) {
      return { should_send: false, next_step: null, reason: "recently_sent" };
    }
  }
  const churnedDate = input.churned_at.slice(0, 10);
  const vertical = input.vertical || "your business";
  const siteRef = input.site_url ? ` (your old site at ${input.site_url})` : "";
  const subject = SUBJECTS[step].replace("{date}", churnedDate).replace("{vertical}", vertical);

  let body = "";
  if (step === "d30") {
    body = `Hey,\n\nJust thinking back to when we wrapped${siteRef}. How's it been since then? Curious what you've been using — no pitch attached.\n\n— Jack`;
  } else if (step === "d60") {
    body = `Hi,\n\nQuick update from the ${vertical} side: we shipped a few things you'd probably care about. Want me to send a 2-minute overview?\n\nNo pressure either way.\n\n— Jack`;
  } else {
    body = `Hi,\n\nIf you ever wanted to come back, here's the easy door: 25% off the first 3 months, one-tap signup at day14.us/welcome-back?slug=${input.customer_slug}.\n\nIf not, I'll stop checking in after this one.\n\n— Jack`;
  }
  return {
    should_send: true,
    next_step: step,
    reason: `days_since_churn=${days.toFixed(0)}`,
    subject,
    body,
    discount_pct: step === "d90" ? 25 : 0,
  };
}

export async function invokeWinBackCampaignTrigger(input: WinBackInput): Promise<WinBackPlan> {
  const plan = planWinBack(input);
  if (plan.should_send) {
    await auditLog({
      action: "winback_email_planned",
      actor: "automated:win-back-campaign-trigger",
      customer_slug: input.customer_slug,
      details: { step: plan.next_step, discount_pct: plan.discount_pct },
      skill_invoked: "win-back-campaign-trigger",
      actor_source: "skill-runner",
    });
  }
  return plan;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<WinBackInput> | undefined;
  if (!input?.customer_slug || !input.customer_email || !input.churned_at) {
    return {
      ok: false,
      skill: "win-back-campaign-trigger",
      path: "hand-coded",
      error: "missing required inputs: customer_slug, customer_email, churned_at",
    };
  }
  const plan = await invokeWinBackCampaignTrigger(input as WinBackInput);
  return {
    ok: true,
    skill: "win-back-campaign-trigger",
    path: "hand-coded",
    result: plan,
    jack_tap_required: plan.should_send,
  };
}
