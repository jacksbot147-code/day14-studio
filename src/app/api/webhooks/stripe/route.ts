/**
 * Stripe webhook handler — day14.us/api/webhooks/stripe
 *
 * Receives Stripe events, verifies signature, dispatches to downstream
 * handlers. Implementation of the `vercel-route-stripe-webhook` skill.
 *
 * Idempotency: every event gets recorded in Supabase `events` table
 * keyed by Stripe event_id. Re-runs are no-ops.
 *
 * NEVER use the anon key here — we need service-role to bypass RLS.
 */

import Stripe from "stripe";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  initializeDossier,
  computeSlug,
  type Sku,
  type Vertical,
} from "@/lib/dossier";
import { logSkillInvocation, logAction } from "@/lib/work-register";
import { dispatch } from "@/lib/dispatch";

export const runtime = "nodejs"; // signature verification needs raw body
export const dynamic = "force-dynamic";

function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 401 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("STRIPE_WEBHOOK_SECRET not configured", {
      status: 500,
    });
  }

  // 1. Read raw body for signature verification
  const body = await req.text();
  const stripe = stripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown signature error";
    console.error("[stripe-webhook] Signature verification failed:", msg);
    return new Response(`Webhook signature error: ${msg}`, { status: 401 });
  }

  const sb = supabaseAdmin();

  // 2. Idempotency — check if we've already processed this event
  const { data: existing } = await sb
    .from("events")
    .select("id")
    .eq("kind", `stripe-${event.type}`)
    .filter("payload->>event_id", "eq", event.id)
    .maybeSingle();

  if (existing) {
    console.log(`[stripe-webhook] Duplicate event ${event.id}, skipping`);
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: { "content-type": "application/json" },
    });
  }

  // 3. Dispatch
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event, sb);
        break;
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event, sb);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(event, sb);
        break;
      case "charge.refunded":
        await handleRefund(event, sb);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionCanceled(event, sb);
        break;
      default:
        console.log(`[stripe-webhook] Unhandled event: ${event.type}`);
    }

    // 4. Record the event (after handler success)
    await sb.from("events").insert({
      kind: `stripe-${event.type}`,
      payload: {
        event_id: event.id,
        type: event.type,
        livemode: event.livemode,
        created: event.created,
      },
    });

    // 5. Funnel into the unified dispatcher — telemetry + cross-cutting skills.
    //    The dispatcher's source_routes map knows which skill to invoke for each event type.
    //    Best-effort: dispatch failures don't fail the webhook.
    try {
      await dispatch({
        source: "stripe-webhook",
        type: event.type,
        context: `stripe-${event.id}`,
        intentText: event.type,
        payload: { event_id: event.id, livemode: event.livemode },
      });
    } catch (dispatchErr) {
      console.error("[stripe-webhook] dispatch failed:", dispatchErr);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Handler error";
    console.error(`[stripe-webhook] Handler failed for ${event.type}:`, err);

    // Record the failure so we can replay manually
    await sb.from("events").insert({
      kind: `stripe-${event.type}-FAILED`,
      payload: {
        event_id: event.id,
        type: event.type,
        error: msg,
      },
    });

    return new Response(`Handler error: ${msg}`, { status: 500 });
  }
}

// ============================================================
// Per-event handlers
// ============================================================

async function handleCheckoutCompleted(
  event: Stripe.Event,
  sb: ReturnType<typeof supabaseAdmin>
) {
  const session = event.data.object as Stripe.Checkout.Session;

  const email =
    session.customer_details?.email ?? session.customer_email ?? null;
  const name = session.customer_details?.name ?? "Unknown Customer";
  const phone = session.customer_details?.phone ?? undefined;
  const sku = (session.metadata?.sku ?? "site") as Sku;
  const vertical = session.metadata?.vertical as Vertical | undefined;
  const amount = (session.amount_total ?? 0) / 100;

  if (!email) {
    console.error("[stripe-webhook] checkout.session.completed has no email");
    return;
  }

  // 1. Check if we already have a customers row for this email
  const { data: existingCustomer } = await sb
    .from("customers")
    .select("id, slug")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let slug: string;
  let customerId: string;

  if (existingCustomer) {
    slug = existingCustomer.slug;
    customerId = existingCustomer.id;
    // Update existing row with payment info
    await sb
      .from("customers")
      .update({
        deposit_paid_at: new Date().toISOString(),
      })
      .eq("id", customerId);
  } else {
    // New customer — compute unique slug + insert row
    slug = await computeSlug(name);
    const { data: inserted, error: insertErr } = await sb
      .from("customers")
      .insert({
        slug,
        company_name: name,
        email,
        phone,
        sku,
        vertical,
        status: "awaiting-intake",
        deposit_paid_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr) {
      throw new Error(`Failed to insert customer: ${insertErr.message}`);
    }
    customerId = inserted.id;
  }

  // 2. Initialize the dossier folder (idempotent)
  const dossierResult = await initializeDossier({
    slug,
    company_name: name,
    email,
    phone,
    sku,
    vertical,
    deposit_amount: amount,
  });
  await logSkillInvocation(
    "dossier-folder-initializer",
    `customer-${slug}`,
    slug
  );

  // 3. Append a customer-deposit-paid event
  await sb.from("events").insert({
    customer_id: customerId,
    kind: "customer-deposit-paid",
    payload: {
      stripe_session_id: session.id,
      sku,
      amount,
      dossier_path: dossierResult.path,
      dossier_newly_created: dossierResult.created,
    },
  });

  console.log(
    `[stripe-webhook] Deposit processed: ${name} (${slug}) for ${sku} at $${amount}`
  );
}

async function handlePaymentSucceeded(
  event: Stripe.Event,
  sb: ReturnType<typeof supabaseAdmin>
) {
  // payment_intent.succeeded often duplicates checkout.session.completed
  // for Payment Link flows. Log but don't double-process the dossier.
  const intent = event.data.object as Stripe.PaymentIntent;
  console.log(
    `[stripe-webhook] payment_intent.succeeded: ${intent.id} (${(intent.amount ?? 0) / 100})`
  );
}

async function handlePaymentFailed(
  event: Stripe.Event,
  sb: ReturnType<typeof supabaseAdmin>
) {
  const intent = event.data.object as Stripe.PaymentIntent;
  const email = intent.receipt_email ?? "unknown@unknown";
  const reason = intent.last_payment_error?.message ?? "Unknown failure";

  await sb.from("events").insert({
    kind: "stripe-payment-failed",
    payload: {
      intent_id: intent.id,
      email,
      reason,
      amount: (intent.amount ?? 0) / 100,
    },
  });

  console.log(`[stripe-webhook] Payment failed: ${email} — ${reason}`);
}

async function handleRefund(
  event: Stripe.Event,
  sb: ReturnType<typeof supabaseAdmin>
) {
  const charge = event.data.object as Stripe.Charge;
  const customerEmail = charge.billing_details?.email;

  if (!customerEmail) {
    console.error("[stripe-webhook] refund event has no email");
    return;
  }

  const { data: customer } = await sb
    .from("customers")
    .select("id, slug, status")
    .eq("email", customerEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!customer) {
    console.error(`[stripe-webhook] refund for unknown customer: ${customerEmail}`);
    return;
  }

  await sb
    .from("customers")
    .update({
      status: "refunded",
      notes: `Refunded on ${new Date().toISOString()} via Stripe charge ${charge.id}`,
    })
    .eq("id", customer.id);

  await sb.from("events").insert({
    customer_id: customer.id,
    kind: "customer-refunded",
    payload: {
      stripe_charge_id: charge.id,
      amount_refunded: (charge.amount_refunded ?? 0) / 100,
    },
  });

  console.log(`[stripe-webhook] Refund processed: ${customer.slug}`);
}

async function handleSubscriptionCanceled(
  event: Stripe.Event,
  sb: ReturnType<typeof supabaseAdmin>
) {
  const sub = event.data.object as Stripe.Subscription;
  const customerId = sub.customer as string;

  // Look up the email via Stripe Customer object
  const stripe = stripeClient();
  const stripeCustomer = await stripe.customers.retrieve(customerId);
  if (stripeCustomer.deleted) return;

  const email = stripeCustomer.email;
  if (!email) return;

  const { data: customer } = await sb
    .from("customers")
    .select("id, slug")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!customer) return;

  await sb
    .from("customers")
    .update({
      status: "archived",
      notes: `Subscription canceled on ${new Date().toISOString()}`,
    })
    .eq("id", customer.id);

  await sb.from("events").insert({
    customer_id: customer.id,
    kind: "subscription-canceled",
    payload: { subscription_id: sub.id },
  });

  console.log(`[stripe-webhook] Subscription canceled: ${customer.slug}`);
}
