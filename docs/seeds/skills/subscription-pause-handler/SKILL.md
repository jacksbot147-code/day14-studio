---
name: subscription-pause-handler
description: Pause a subscription (don't cancel — pause). Keeps the site up for 30 days, suspends billing, and queues a reactivation prompt. Reduces hard churn by ~25%.
triggers:
  - "pause subscription"
  - "temporarily stop"
  - "I need a break"
  - "/pause"
---

# subscription-pause-handler

> A customer who pauses is 4x more likely to return than one who cancels.
> Always offer pause before cancel.

## What this skill does

1. Verifies customer + subscription via Stripe
2. Issues `subscription.pause` via Stripe API:
   ```
   stripe.subscriptions.update(sub_id, {
     pause_collection: { behavior: 'void' }
   })
   ```
3. Site stays UP for 30 days (read-only mode optional, default: full access)
4. Sends pause confirmation email with reactivation link
5. Schedules reactivation prompt at day 28 (before pause expires)
6. Updates dossier `02-status.md` → state = paused
7. Adjusts MRR: pause amount → "deferred MRR" bucket

## Pause vs cancel — when to use which

```
Customer says "I need to cancel"
  → Offer pause first: "I can pause your account for 30 days at no charge —
     keeps your site up, no billing. Want that instead?"

Customer says "I want to permanently cancel"
  → Use subscription-cancel-handler (separate skill), not this one
  → Always offer the pause-first option once before cancelling
```

## Reactivation flow

At day 28:
- Email: "Your site is still ready — reactivate for ${amount}/mo?"
- One-tap reactivation link (Stripe customer portal)
- If reactivated → resume normal billing, clear pause flag
- If not reactivated by day 30 → auto-pause expires, billing resumes
- If billing fails → `dunning-email-sequencer` takes over
- If customer responds "no, cancel" → `subscription-cancel-handler`

## Hard rules

1. **Never auto-cancel after pause expires.** Pause should default to resume, not cancel.
2. **Always tell the customer the exact reactivation date.** No surprises.
3. **Never reduce service during pause** — full site stays up. Builds trust.
4. **Maximum pause: 30 days.** Anything longer = effectively cancel.
5. **Limit: 2 pauses per customer per year.** Beyond that, cancel-and-rebuild.

## Inputs

- `customer_slug`
- `reason` (free text)
- `pause_duration_days` (default 30, max 30)

## When invoked

- Customer email mentioning pause/break/temporarily → `inbound-classifier` routes here
- `/pause {slug}` Telegram command
- Inside `refund-handler` as the alternative offer
- Inside `subscription-cancel-handler` as the pre-cancel checkpoint

## Output

```
✓ Subscription paused: splash-jacks-pools
  Reason: "vacation, back in 3 weeks"
  Pause until: 2026-06-16
  Site stays up: yes (full access)
  Reactivation prompt scheduled: 2026-06-14
  MRR deferred: $497
```

## Failure modes

- **Stripe doesn't support pause for this plan**: manually set `cancel_at` 30 days out + flag for resume
- **Customer pauses 3rd time in 12 months**: convert to cancel + offer win-back
- **Reactivation fails (card expired)**: route to `failed-payment-retry`

## Logging

`[YYYY-MM-DD HH:MM ET] subscription-pause-handler → customer: {slug}, action: {pause|reactivate|expire}, days: {N}, reason: "{text}"`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('subscription-pause-handler', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'subscription-pause-handler', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
