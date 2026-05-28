/**
 * abandoned-cart-recovery — hand-coded impl.
 *
 * Stripe Checkout abandonment → 3-touch recovery sequence (+1h, +24h, +72h).
 * Deterministic scheduler — picks the next email to send given cart age.
 *
 * Hard rules baked in:
 *   - Never discount earlier than 72h.
 *   - Max 10% discount.
 *   - Stop on purchase.
 *   - Cooldown: 30d per customer.
 */
import type { SkillInvocationContext } from "../skill-runtime";
import type { SkillOutcome } from "../skill-runner";
import { auditLog } from "./audit-log-generator";

export interface AbandonedCartInput {
  cart_id: string;
  customer_email: string;
  customer_slug?: string;
  abandoned_at: string; // ISO timestamp
  cart_items: Array<{ name: string; qty: number; price_cents: number }>;
  purchase_completed?: boolean;
  last_sequence_at?: string; // ISO; for 30d cooldown
}

export type CartEmailStep = "h1" | "h24" | "h72";

export interface AbandonedCartPlan {
  should_send: boolean;
  next_step: CartEmailStep | null;
  reason: string;
  subject?: string;
  body?: string;
  discount_pct?: number;
}

const SUBJECTS: Record<CartEmailStep, string> = {
  h1: "Forget something?",
  h24: "Still want this?",
  h72: "Take 10% off if it helps",
};

function ageHours(abandonedAt: string, now = Date.now()): number {
  const t = Date.parse(abandonedAt);
  if (Number.isNaN(t)) return -1;
  return (now - t) / 3_600_000;
}

function inCooldown(lastSequenceAt?: string, now = Date.now()): boolean {
  if (!lastSequenceAt) return false;
  const t = Date.parse(lastSequenceAt);
  if (Number.isNaN(t)) return false;
  return now - t < 30 * 24 * 3_600_000;
}

function renderBody(step: CartEmailStep, input: AbandonedCartInput): string {
  const itemLines = input.cart_items
    .map((i) => `- ${i.qty}x ${i.name} ($${(i.price_cents / 100).toFixed(2)})`)
    .join("\n");
  if (step === "h1") {
    return `Hi,\n\nYou left these in your cart:\n\n${itemLines}\n\nOne tap to pick up where you left off: {recover_link}\n\nQuestions? Reply here.\n— Day14`;
  }
  if (step === "h24") {
    return `Just checking in — your cart's still saved:\n\n${itemLines}\n\nHere's what another customer said: "Best decision I made this quarter."\n\nResume: {recover_link}`;
  }
  return `Last nudge — if price is the holdup, here's 10% off (expires in 72 hours): code DAY14SAVE10\n\nYour cart:\n${itemLines}\n\nFinish up: {recover_link}\n\nIf this isn't the right fit, no worries — reply and I'll close the loop.`;
}

export function planAbandonedCartEmail(
  input: AbandonedCartInput,
  now = Date.now()
): AbandonedCartPlan {
  if (input.purchase_completed) {
    return { should_send: false, next_step: null, reason: "purchase_completed" };
  }
  if (inCooldown(input.last_sequence_at, now)) {
    return { should_send: false, next_step: null, reason: "cooldown_30d" };
  }
  const hours = ageHours(input.abandoned_at, now);
  if (hours < 0) {
    return { should_send: false, next_step: null, reason: "invalid_abandoned_at" };
  }
  let step: CartEmailStep | null = null;
  if (hours >= 72) step = "h72";
  else if (hours >= 24) step = "h24";
  else if (hours >= 1) step = "h1";
  if (!step) {
    return { should_send: false, next_step: null, reason: "too_recent" };
  }
  return {
    should_send: true,
    next_step: step,
    reason: `cart_age_hours=${hours.toFixed(1)}`,
    subject: SUBJECTS[step],
    body: renderBody(step, input),
    discount_pct: step === "h72" ? 10 : 0,
  };
}

export async function invokeAbandonedCartRecovery(
  input: AbandonedCartInput
): Promise<AbandonedCartPlan> {
  const plan = planAbandonedCartEmail(input);
  if (plan.should_send) {
    await auditLog({
      action: "abandoned_cart_email_planned",
      actor: "automated:abandoned-cart-recovery",
      customer_slug: input.customer_slug,
      details: { cart_id: input.cart_id, step: plan.next_step, discount_pct: plan.discount_pct },
      skill_invoked: "abandoned-cart-recovery",
      actor_source: "skill-runner",
    });
  }
  return plan;
}

export async function run(ctx: SkillInvocationContext): Promise<SkillOutcome> {
  const input = ctx.inputs as Partial<AbandonedCartInput> | undefined;
  if (!input?.cart_id || !input.customer_email || !input.abandoned_at || !input.cart_items) {
    return {
      ok: false,
      skill: "abandoned-cart-recovery",
      path: "hand-coded",
      error: "missing required inputs: cart_id, customer_email, abandoned_at, cart_items",
    };
  }
  const plan = await invokeAbandonedCartRecovery({
    cart_id: input.cart_id,
    customer_email: input.customer_email,
    customer_slug: input.customer_slug,
    abandoned_at: input.abandoned_at,
    cart_items: input.cart_items,
    purchase_completed: input.purchase_completed,
    last_sequence_at: input.last_sequence_at,
  });
  return {
    ok: true,
    skill: "abandoned-cart-recovery",
    path: "hand-coded",
    result: plan,
    jack_tap_required: plan.should_send, // never auto-send customer emails
  };
}
