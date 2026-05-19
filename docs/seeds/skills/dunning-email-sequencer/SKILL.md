---
name: dunning-email-sequencer
description: When a recurring payment fails, run a 4-touch recovery sequence over 14 days. Each email gets warmer-firmer until the customer updates payment or churns. Saves 30%+ of would-be churned MRR.
triggers:
  - "payment failed"
  - "dunning"
  - "card declined"
  - "recover failed payment"
  - "invoice.payment_failed"
---

# dunning-email-sequencer

> A card declines and you do nothing → 100% of that MRR walks.
> A card declines and you send 4 well-timed emails → 30-40% recovered.

## The sequence

| Day | Tone | Subject | What it says |
|---|---|---|---|
| Day 0 | Helpful | "Card on file — quick update needed" | Brief, no shame. Link to update. |
| Day 3 | Gentle nudge | "Your {site} is still up — payment just needs refreshing" | Remind value. Show site uptime. |
| Day 7 | Direct | "Action needed: update payment or your site goes offline {date}" | Real deadline. Real consequence. |
| Day 14 | Final | "Your account will be paused tomorrow" | Last chance. After this → auto-pause + win-back later. |

## Hard rules

1. **Never send all 4 if they update in between.** Cancel the sequence on payment success.
2. **Always link to a one-tap update flow.** Stripe Customer Portal, not a form they fill out.
3. **Never threaten data deletion in dunning.** Site pauses, doesn't disappear. Trust matters even when they're behind.
4. **Always check `subscription-pause-handler` state first.** Don't dun a paused customer.
5. **Day 14 triggers `win-back-campaign-trigger` for 30 days later.** Failure is not the end.

## Inputs

- `customer_slug` (required)
- `failed_invoice_id` (Stripe invoice ID)
- `decline_reason` (insufficient_funds, expired_card, etc.)

## What this skill does

1. Marks customer as `dunning_active` in dossier
2. Schedules 4 emails via `mailerlite-bridge` or Resend
3. Listens for `invoice.paid` webhook → cancels remaining emails
4. On Day 14 final: queues Telegram approval card for Jack ("auto-pause splash-jacks-pools?")
5. After Jack taps yes → calls `subscription-pause-handler`

## Output

```
✓ Dunning sequence started: splash-jacks-pools
  Failed invoice: in_1ABC ($497.00)
  Reason: expired_card
  Emails scheduled: 2026-05-17, -20, -24, -31
  Auto-pause date if no update: 2026-05-31
```

## When invoked

- Stripe `invoice.payment_failed` webhook → auto
- `/dun {slug}` Telegram command (manual restart)
- Inside `subscription-pause-handler` (post-pause grace period)

## Failure modes

- **Customer email bounces**: switch to SMS via Twilio fallback (if wired)
- **All 4 emails sent + still failed**: stop. Don't escalate further. Win-back later.
- **Customer responds to dunning email**: route through `inbound-classifier`, pause sequence

## Logging

`[YYYY-MM-DD HH:MM ET] dunning-email-sequencer → customer: {slug}, day: {0|3|7|14}, action: {sent|cancelled|paused}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('dunning-email-sequencer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'dunning-email-sequencer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
