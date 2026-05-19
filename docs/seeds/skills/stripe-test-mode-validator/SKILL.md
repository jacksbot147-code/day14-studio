---
name: stripe-test-mode-validator
description: Before any Stripe live-mode action, this skill confirms the previous test-mode run succeeded end-to-end. Prevents shipping a broken Stripe flow to real customers. Supporting skill for stripe-payment-link-creator.
triggers:
  - "test mode"
  - "before going live"
  - "stripe production"
  - "live mode check"
---

# stripe-test-mode-validator

> Test mode is forgiving. Live mode is not. This skill is the
> gate that prevents "we forgot to test the webhook" disasters.

## What needs to pass before live mode

A live-mode Stripe flow can only be enabled after ALL of these have happened in test mode for the SAME flow:

### 1. Payment Link works end-to-end
- Test customer (Jack) completes checkout with test card `4242 4242 4242 4242`
- Stripe creates a real `checkout.session.completed` event
- Webhook fires to Day14's endpoint at `day14.us/api/webhooks/stripe`
- `stripe-webhook-verifier` verifies signature
- `dossier-folder-initializer` creates a test customer dossier
- `customers` row inserted in Supabase

### 2. Failed payment is handled
- Test customer attempts with declined card `4000 0000 0000 0002`
- `payment_intent.payment_failed` event fires
- Day14 logs the failure event
- No customer dossier created
- Jack receives no false-positive notification

### 3. Refund flow works
- Jack manually refunds a test charge in Stripe dashboard
- `charge.refunded` event fires
- `customers.status = 'refunded'` updated
- Dossier moved to `customers/refunded/{slug}/`

### 4. Customer receipt is correct
- Test customer receives the customized receipt email
- All branding fields render correctly
- Phone number, logo, footer message all look right

### 5. Stripe metadata flows through
- The test `checkout.session.completed` event has `metadata.sku`, `metadata.sla_days`, `metadata.vertical` (if set)
- Day14's webhook handler reads metadata and applies to dossier

## The validator output

Run via:
```bash
node scripts/stripe-test-validator.mjs
```

Output:
```
# Stripe Test Mode Validation

## Test results (last 24h in test mode)

| Check | Status | Details |
|---|---|---|
| Payment Link checkout | ✓ | session_id: cs_test_..., webhook fired at {time} |
| Webhook signature verified | ✓ | event_id: evt_test_... |
| Dossier created | ✓ | path: /customers/test-customer/ |
| Failed payment handled | ✓ | event_id: evt_test_..., no false dossier |
| Refund flow | ✗ | NOT YET TESTED |
| Receipt customization | ✓ | rendered correctly in test inbox |
| Metadata flow | ✓ | sku=site, sla_days=14 |

## Verdict
❌ NOT READY for live mode. Failing: refund flow.
```

If ALL checks pass, output:
```
✅ READY for live mode. Test mode validation complete.

To flip to live:
1. In Stripe dashboard, toggle test/live in top-right
2. Recreate the Payment Link in live mode (cannot copy from test)
3. Update Vercel env vars STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET to live values
4. Test with a $1 live charge to YOUR OWN card
5. Refund that $1 immediately
```

## Hard rules

1. **Never flip to live mode without this validator passing.** Even if Jack insists. Stripe live mistakes = chargebacks + reputation hit.
2. **Never run live-mode flows in dev environment.** Live keys only in Vercel production env.
3. **Never share Payment Link URLs between modes.** Test and live links are different objects.
4. **Always refund any live test charges within 1 hour.** Real money in flight = liability.
5. **Always wait 24h between successful validation and live activation.** Cool-off period catches the "I forgot one thing" hour.

## When invoked
- Before flipping Stripe from test to live mode (mandatory)
- After any change to the Stripe webhook handler code
- Quarterly as a hygiene check (catches regressions from Stripe API changes)

## Logging

`[YYYY-MM-DD HH:MM ET] stripe-test-mode-validator → checks_passed: N/5, ready_for_live: {yes|no}, failing: {list}`

When live flip happens after validation:
`[YYYY-MM-DD HH:MM ET] ⚡ stripe-test-mode-validator → LIVE MODE ENABLED — test validation passed at {timestamp}, validated by Jack`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('stripe-test-mode-validator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'stripe-test-mode-validator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
