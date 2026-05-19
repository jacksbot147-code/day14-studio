---
name: stripe-webhook-verifier
description: Verify the signature on every Stripe webhook event before acting on it. Standard security practice — drops un-signed or wrong-signed requests immediately. Supporting skill for stripe-payment-link-creator. Code-level skill consumed by the webhook handler at day14.us/api/webhooks/stripe.
triggers:
  - "stripe webhook"
  - "webhook signature"
  - "verify webhook"
  - "stripe security"
---

# stripe-webhook-verifier

> Anyone can POST to a public webhook URL. Without signature
> verification, a malicious request could trigger Day14 to start a
> build for a customer who didn't pay. This skill is the gate.

## The verification

Stripe signs every webhook with `STRIPE_WEBHOOK_SECRET`. Header:
`Stripe-Signature: t={timestamp},v1={signature}`

Verify in the Next.js route handler:

```ts
// src/app/api/webhooks/stripe/route.ts
import Stripe from 'stripe';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return new Response('No signature', { status: 401 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const body = await req.text(); // raw body for verification

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 401 });
  }

  // event is now verified — safe to process
  switch (event.type) {
    case 'checkout.session.completed':
      // ...
      break;
    case 'payment_intent.succeeded':
      // ...
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'content-type': 'application/json' },
  });
}
```

## Hard rules

1. **Never trust an unsigned webhook.** Reject with 401, log the attempt.
2. **Never process the body BEFORE verifying the signature.** Read raw text, verify, THEN parse.
3. **Never log the webhook secret.** Even in dev logs.
4. **Always use environment variables** for the secret. Never hardcode.
5. **Always handle the verification error.** Don't let it crash silently.

## Tolerance window

Stripe's signature includes a timestamp. By default, Stripe libraries reject events older than 5 minutes (replay protection).

Don't change this tolerance. 5 min is the right balance — long enough for legitimate webhook retries, short enough to prevent replays.

## Logging

Every verification (success or failure) writes a row to the `events` table:

- Success: `kind=stripe-webhook-verified, payload={event_type, event_id}`
- Failure: `kind=stripe-webhook-rejected, payload={reason, ip_hash}`

After 10 rejections in 1 hour from the same source: rate-limit + escalate to Jack (could be an attack).

## When invoked
- Inside the webhook handler at `day14.us/api/webhooks/stripe`
- Inside any custom Stripe integration (e.g., Stripe Connect for customer-level billing)
- Never in client-side code (only server)

## Failure modes

- **STRIPE_WEBHOOK_SECRET stale (rotated in Stripe dashboard)**: re-copy + re-deploy. Skill surfaces clear error.
- **Stripe sending events in TEST mode to a LIVE webhook endpoint**: silently rejected (different secrets). Surface to Jack — likely misconfiguration.
- **Body parsing happening too early** (e.g., Next.js middleware): refactor so raw body is preserved for verification.

## Cross-skill triggers

- This skill is called by every Stripe-related webhook handler
- It feeds `dossier-folder-initializer` only after verification passes
- It feeds `kickoff-call-scheduler` only after verification passes
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('stripe-webhook-verifier', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'stripe-webhook-verifier', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
