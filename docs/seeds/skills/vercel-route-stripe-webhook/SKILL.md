---
name: vercel-route-stripe-webhook
description: The actual implementation of day14.us/api/webhooks/stripe. Receives Stripe webhook events, verifies signatures, routes to the correct downstream skill (dossier-folder-initializer, complaint-escalation, etc.). Phase 4 anchor for the autonomous pipeline.
triggers:
  - "stripe webhook handler"
  - "/api/webhooks/stripe"
  - "stripe event"
---

# vercel-route-stripe-webhook

> The HTTP endpoint that turns a paid Stripe Payment Link into the
> start of a Day14 customer build, autonomously.

## File location
`~/Documents/studio/src/app/api/webhooks/stripe/route.ts`

## Code skeleton

```ts
import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs'; // webhook signature requires raw body; node runtime
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 1. Read raw body for signature verification
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('No signature', { status: 401 });

  const body = await req.text();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 2. Verify (via stripe-webhook-verifier skill's protocol)
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body, sig, process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Stripe webhook sig fail:', err);
    return new Response('Invalid signature', { status: 401 });
  }

  // 3. Dispatch
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event, sb);
        break;
      case 'payment_intent.succeeded':
        // duplicate of checkout for most cases; idempotency-safe via event.id dedup
        await handlePaymentSucceeded(event, sb);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event, sb);
        break;
      case 'charge.refunded':
        await handleRefund(event, sb);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event, sb);
        break;
      default:
        // Log unhandled events but acknowledge so Stripe doesn't retry forever
        console.log('Unhandled stripe event:', event.type);
    }

    // 4. Write to Supabase events table
    await sb.from('events').insert({
      kind: `stripe-${event.type}`,
      payload: {event_id: event.id, type: event.type},
    });

    return new Response(JSON.stringify({received: true}), {
      headers: {'content-type': 'application/json'},
    });
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    return new Response('Handler error', {status: 500});
  }
}
```

## Per-event handlers

### `checkout.session.completed`
- Extract: customer email, metadata.sku, amount_total
- Call `dossier-folder-initializer` with the data
- Append `customers` row in Supabase
- Trigger `telegram-status-pusher` with kind = `customer-deposit-paid`

### `payment_intent.payment_failed`
- Append event for tracking
- Telegram push (P1): "Payment failed for {customer} — {reason}"
- Don't create a dossier (no deposit cleared)

### `charge.refunded`
- Mark `customers.status = 'refunded'`
- Move dossier to `customers/refunded/{slug}/`
- Telegram push (P0): "Refund processed for {customer}"

### `customer.subscription.deleted`
- Customer canceled monthly fee
- Mark `customers.status = 'archived'`
- Telegram push (P1)

## Idempotency

Stripe retries webhooks on 5xx responses. Handlers MUST be idempotent:
1. Before any state change, check if `events.id` matching `payload.event_id` already exists
2. If yes, return 200 immediately (already processed)
3. If no, process + log

This is critical: a duplicate `checkout.session.completed` would create two dossier folders.

## Hard rules

1. **Always verify signature first.** Never trust unsigned events.
2. **Always return 200 within 5 seconds.** Stripe retries on slow responses; if your handler is slow, return 200 + queue work asynchronously.
3. **Never block on downstream skills.** Fire-and-forget where possible; surface failures via separate events.
4. **Always use service-role Supabase client** (not anon). Webhooks are server-side.
5. **Never log full webhook payloads** (may contain customer payment data). Log event_id + type only.

## Failure modes

- **STRIPE_WEBHOOK_SECRET stale**: surface immediately; can't process anything until rotated
- **Supabase down**: log the event, return 200, queue for retry; Stripe won't retry but our internal retry queue will
- **Dossier folder creation fails**: tag event with failure; surface via Telegram P1 to operator
- **Duplicate event** (already processed): return 200 immediately; no work done

## When invoked
- Stripe sends events to `day14.us/api/webhooks/stripe`
- Tests in dev hit `localhost:3000/api/webhooks/stripe`
- Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

## Logging

`[YYYY-MM-DD HH:MM ET] vercel-route-stripe-webhook → event: {type}, event_id: {id}, action: {what handler ran}, latency_ms: {N}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('vercel-route-stripe-webhook', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'vercel-route-stripe-webhook', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
