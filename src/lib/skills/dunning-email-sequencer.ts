/**
 * dunning-email-sequencer — hand-coded impl.
 *
 * On a failed Stripe invoice, schedules a 4-touch recovery sequence over
 * 14 days (D0, D3, D7, D14). Deterministic; never auto-sends — drafts
 * surface for Jack-tap.
 */
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

export type DunningStep = "d0" | "d3" | "d7" | "d14";

export interface DunningInput {
  customer_slug: string;
  failed_invoice_id: string;
  decline_reason?: string;
  first_failure_at: string; // ISO
  payment_succeeded?: boolean;
  subscription_paused?: boolean;
  site_url?: string;
  pause_date?: string; // ISO of scheduled pause
}

export interface DunningPlan {
  should_send: boolean;
  next_step: DunningStep | null;
  reason: string;
  subject?: string;
  body?: string;
  triggers_winback?: boolean;
}

function daysSince(iso: string, now = Date.now()): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return -1;
  return (now - t) / (24 * 3_600_000);
}

const SUBJECTS: Record<DunningStep, string> = {
  d0: "Card on file — quick update needed",
  d3: "Your {site} is still up — payment just needs refreshing",
  d7: "Action needed: update payment or your site goes offline {pause_date}",
  d14: "Your account will be paused tomorrow",
};

export function planDunning(input: DunningInput, now = Date.now()): DunningPlan {
  if (input.payment_succeeded) {
    return { should_send: false, next_step: null, reason: "payment_succeeded" };
  }
  if (input.subscription_paused) {
    return { should_send: false, next_step: null, reason: "already_paused" };
  }
  const days = daysSince(input.first_failure_at, now);
  if (days < 0) {
    return { should_send: false, next_step: null, reason: "invalid_first_failure_at" };
  }
  let step: DunningStep | null = null;
  if (days >= 14) step = "d14";
  else if (days >= 7) step = "d7";
  else if (days >= 3) step = "d3";
  else step = "d0";

  const siteRef = input.site_url || "site";
  const pauseDate = input.pause_date?.slice(0, 10) || "soon";
  const subject = SUBJECTS[step].replace("{site}", siteRef).replace("{pause_date}", pauseDate);
  let body = "";
  switch (step) {
    case "d0":
      body = `Quick note — Stripe couldn't pull your most recent payment${input.decline_reason ? ` (${input.decline_reason})` : ""}.\n\nOne tap to update your card: {portal_link}\n\nNothing's paused. Just need to refresh on file.`;
      break;
    case "d3":
      body = `Your ${siteRef} is still serving customers normally — but the payment on file still needs refreshing.\n\nUpdate: {portal_link}\n\nReply if there's something I can help with.`;
      break;
    case "d7":
      body = `Heads up: if the card isn't updated by ${pauseDate}, your site will pause (not deleted, just paused).\n\nOne tap to keep it live: {portal_link}`;
      break;
    case "d14":
      body = `Final touch — your account pauses tomorrow if payment isn't updated. Your data is safe; the site just goes offline until things are squared away.\n\nLast chance to keep it live: {portal_link}\n\nIf you'd rather walk away, no hard feelings — reply and I'll confirm.`;
      break;
  }
  return {
    should_send: true,
    next_step: step,
    reason: `days_since_failure=${days.toFixed(0)}`,
    subject,
    body,
    triggers_winback: step === "d14",
  };
}

export async function invokeDunningEmailSequencer(input: DunningInput): Promise<DunningPlan> {
  const plan = planDunning(input);
  if (plan.should_send) {
    await auditLog({
      action: "dunning_email_planned",
      actor: "automated:dunning-email-sequencer",
      customer_slug: input.customer_slug,
      details: { step: plan.next_step, triggers_winback: plan.triggers_winback, invoice: input.failed_invoice_id },
      skill_invoked: "dunning-email-sequencer",
      actor_source: "skill-runner",
    });
  }
  return plan;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<DunningInput> | undefined;
  if (!input?.customer_slug || !input.failed_invoice_id || !input.first_failure_at) {
    return {
      ok: false,
      skill: "dunning-email-sequencer",
      path: "hand-coded",
      error: "missing required inputs: customer_slug, failed_invoice_id, first_failure_at",
    };
  }
  const plan = await invokeDunningEmailSequencer(input as DunningInput);
  return {
    ok: true,
    skill: "dunning-email-sequencer",
    path: "hand-coded",
    result: plan,
    jack_tap_required: plan.should_send,
    next_actions: plan.triggers_winback ? ["schedule win-back-campaign-trigger +30d"] : [],
  };
}
