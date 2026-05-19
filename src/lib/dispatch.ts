/**
 * dispatch — single entry point that maps an incoming event to the right
 * skill via invokeSkill().
 *
 * Webhooks, scheduled-tasks, Telegram commands, and Cowork asks all
 * funnel through this. Replaces the ad-hoc per-route routing in
 * src/app/api/webhooks/*.
 *
 * Routing strategy (priority order):
 *   1. Explicit override (event.targetSkill)
 *   2. Source-specific routing rules (event.source → preferred skills)
 *   3. Intent-text trigger matching (event.intentText → suggestSkills)
 *   4. Fallback to inbound-classifier
 */

import { invokeSkill, suggestSkills, type SkillInvocationResult } from "./skill-runtime";
import { logAdHoc } from "./work-register";
import { findSkill } from "./skill-registry.generated";

export type EventSource =
  | "stripe-webhook"
  | "intake-webhook"
  | "cal-webhook"
  | "resend-inbound"
  | "telegram-command"
  | "scheduled-task"
  | "cowork-ask"
  | "agent-self-call"
  | "manual";

export interface DispatchEvent {
  source: EventSource;
  type: string; // event type within the source ('checkout.session.completed', 'BOOKING_CREATED', etc.)
  context: string; // customer_slug or session id (for work-register)
  customer_slug?: string;
  intentText?: string; // freeform text describing the event
  targetSkill?: string; // explicit override
  payload?: Record<string, unknown>;
}

export interface DispatchResult {
  ok: boolean;
  skill_invoked: string | null;
  result: SkillInvocationResult | null;
  fallback_used?: boolean;
  candidates_considered?: string[];
  reason?: string;
}

// ---- source-specific routing rules ----
// Maps a (source, type) pair to a preferred skill. Wins over intent matching.
const SOURCE_ROUTES: Record<string, string> = {
  "stripe-webhook:checkout.session.completed": "vercel-route-stripe-webhook",
  "stripe-webhook:invoice.payment_failed": "failed-payment-retry",
  "stripe-webhook:invoice.paid": "stripe-payment-link-creator",
  "stripe-webhook:charge.dispute.created": "chargeback-disputer",
  "stripe-webhook:customer.subscription.deleted": "win-back-campaign-trigger",
  "stripe-webhook:customer.subscription.paused": "subscription-pause-handler",

  "intake-webhook:submission": "vercel-route-intake-webhook",
  "intake-webhook:lead": "intake-parser",

  "cal-webhook:BOOKING_CREATED": "vercel-route-cal-com-webhook",
  "cal-webhook:BOOKING_CANCELLED": "vercel-route-cal-com-webhook",
  "cal-webhook:BOOKING_RESCHEDULED": "vercel-route-cal-com-webhook",

  "resend-inbound:email.inbound.received": "inbound-classifier",

  "telegram-command:/brief": "morning-briefing-generator",
  "telegram-command:/refund": "refund-handler",
  "telegram-command:/pause": "subscription-pause-handler",
  "telegram-command:/winback": "win-back-campaign-trigger",
  "telegram-command:/upsell": "upgrade-nudge-detector",
  "telegram-command:/focus": "focus-block-protector",
  "telegram-command:/energy": "energy-state-tracker",
  "telegram-command:/decisions": "decision-fatigue-detector",
  "telegram-command:/flush": "weekly-priorities-flush",
  "telegram-command:/uptime": "uptime-monitor",
  "telegram-command:/dns": "dns-drift-watcher",
  "telegram-command:/perf": "performance-regression-detector",
  "telegram-command:/logs": "log-anomaly-detector",
  "telegram-command:/backup": "backup-verifier",
  "telegram-command:/export": "gdpr-data-export",
  "telegram-command:/prune": "data-retention-pruner",
  "telegram-command:/audit": "audit-log-generator",
  "telegram-command:/empire": "growth-metrics-dashboard",
  "telegram-command:/cohorts": "cohort-retention-tracker",
  "telegram-command:/ltv": "customer-ltv-calculator",
  "telegram-command:/risk": "churn-risk-scorer",
  "telegram-command:/calendar": "content-calendar-orchestrator",
  "telegram-command:/blog": "blog-post-generator",
  "telegram-command:/newsletter": "email-newsletter-composer",
  "telegram-command:/triage": "defer-vs-do-decider",

  "scheduled-task:morning-briefing": "morning-briefing-generator",
  "scheduled-task:daily-kickoff": "daily-kickoff",
  "scheduled-task:daily-eod": "daily-eod",
  "scheduled-task:nightly-polish": "nightly-polish",
  "scheduled-task:weekly-council-review": "weekly-council-review",
};

export async function dispatch(event: DispatchEvent): Promise<DispatchResult> {
  const ctx = {
    context: event.context,
    customer_slug: event.customer_slug,
    inputs: event.payload as Record<string, unknown> | undefined,
    caller: event.source,
  };

  // 1. Explicit override wins
  if (event.targetSkill) {
    const result = await invokeSkill(event.targetSkill, ctx);
    return {
      ok: result.ok,
      skill_invoked: event.targetSkill,
      result,
      reason: "explicit_override",
    };
  }

  // 2. Source-specific routing
  const routeKey = `${event.source}:${event.type}`;
  const routed = SOURCE_ROUTES[routeKey];
  if (routed) {
    const result = await invokeSkill(routed, ctx);
    if (result.ok) {
      return {
        ok: true,
        skill_invoked: routed,
        result,
        reason: "source_route",
      };
    }
  }

  // 3. Intent-text trigger matching
  if (event.intentText) {
    const suggestions = await suggestSkills(event.intentText, 3);
    const top = suggestions[0];
    if (top) {
      const result = await invokeSkill(top.name, ctx);
      return {
        ok: result.ok,
        skill_invoked: top.name,
        result,
        candidates_considered: suggestions.map((s) => s.name),
        reason: "intent_match",
      };
    }
  }

  // 4. Fallback to inbound-classifier (it'll route to the right skill or surface to Jack)
  if (findSkill("inbound-classifier")) {
    const result = await invokeSkill("inbound-classifier", {
      ...ctx,
      inputs: {
        ...(ctx.inputs || {}),
        unrouted_event: { source: event.source, type: event.type, intentText: event.intentText },
      },
    });
    return {
      ok: result.ok,
      skill_invoked: "inbound-classifier",
      result,
      fallback_used: true,
      reason: "fallback_to_classifier",
    };
  }

  // 5. Total miss — log as ad-hoc for growth-watcher
  await logAdHoc(
    `unroutable event: ${event.source}:${event.type}`,
    event.context,
    "no_skill_matched_and_no_classifier"
  );
  return {
    ok: false,
    skill_invoked: null,
    result: null,
    reason: "no_route_found",
  };
}

/**
 * Convenience: dispatch from a Telegram /command.
 */
export async function dispatchTelegramCommand(
  command: string,
  context: string,
  customer_slug?: string,
  payload?: Record<string, unknown>
): Promise<DispatchResult> {
  return dispatch({
    source: "telegram-command",
    type: command,
    context,
    customer_slug,
    intentText: command,
    payload,
  });
}

/**
 * Convenience: dispatch from a scheduled task.
 */
export async function dispatchScheduledTask(
  taskId: string,
  context: string
): Promise<DispatchResult> {
  return dispatch({
    source: "scheduled-task",
    type: taskId,
    context,
    intentText: taskId,
  });
}
