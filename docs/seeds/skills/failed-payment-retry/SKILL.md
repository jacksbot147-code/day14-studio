---
name: failed-payment-retry
description: Stripe smart-retry coordinator. When a payment fails, decide whether to retry immediately, schedule for 3 days, or escalate to dunning. Reads decline_code, history, and payment-method type.
triggers:
  - "retry payment"
  - "payment retry"
  - "invoice retry"
  - "stripe retry logic"
---

# failed-payment-retry

> Not all declines deserve the same response. `insufficient_funds`
> retries in 3 days (probably payday-adjacent). `expired_card` needs
> a card update before retry is even possible.

## Retry decision matrix

| decline_code | First retry | Second retry | Then |
|---|---|---|---|
| `insufficient_funds` | +3 days | +7 days | → dunning Day 7 |
| `card_declined` | +1 day | +5 days | → dunning Day 7 |
| `expired_card` | NEVER (need update first) | — | → dunning Day 0 |
| `incorrect_cvc` | +1 hour (typo retry) | +1 day | → dunning Day 3 |
| `processing_error` (Stripe-side) | +30 min | +2 hours | → dunning Day 1 |
| `lost_card` / `stolen_card` | NEVER | — | → dunning + flag fraud |
| Unknown | +1 day | +3 days | → dunning Day 7 |

## Hard rules

1. **Never retry more than 2 times automatically.** Beyond 2, route to dunning + Jack.
2. **Never retry `expired_card` or `lost_card`** — these need customer action.
3. **Always log decline_code** for pattern-finding (e.g., if 5 customers hit `processing_error` same day → Stripe issue).
4. **Always check customer's payment history** — if they've never failed before, give them benefit of doubt (gentler retry cadence).
5. **Always announce retries in Telegram P3** so Jack sees the recovery in progress.

## Inputs

- `invoice_id` (Stripe invoice)
- `decline_code`
- `customer_slug`
- `attempt_number` (1, 2, or 3)

## What this skill does

1. Looks up customer's payment history via `stripe.charges.list`
2. Selects retry cadence from matrix above
3. Schedules Stripe retry via `invoice.pay({invoice_id})` with `expand: ['payment_intent']`
4. Notifies `dunning-email-sequencer` if retry exhausts
5. On success → cancels any pending dunning sequence

## Output

```
✓ Retry scheduled: in_1ABC
  Customer: splash-jacks-pools
  Decline reason: insufficient_funds
  Retry 1 of 2 → 2026-05-20 09:00 ET
  Fallback if retry fails: dunning Day 7
```

## When invoked

- Stripe `invoice.payment_failed` webhook → first decision
- Scheduled task at retry date → executes retry
- Inside `dunning-email-sequencer` Day 0 → before sending email

## Failure modes

- **Same decline_code 3+ times**: stop retrying, route to dunning immediately
- **Retry fails with NEW decline_code**: re-evaluate via matrix (different problem)
- **Stripe API timeout during retry**: retry the retry in 1 hour; don't double-charge

## Logging

`[YYYY-MM-DD HH:MM ET] failed-payment-retry → customer: {slug}, decline: {code}, attempt: {N}, next_retry: {date|none}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('failed-payment-retry', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'failed-payment-retry', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
