---
name: kickoff-call-scheduler
description: After deposit clears, schedule the 30-min kickoff call within 24 hours. Sends Cal.com link via email. If customer doesn't book within 48h, escalate. Supporting skill for customer-readiness-check.
triggers:
  - "kickoff call"
  - "schedule the call"
  - "post-deposit call"
  - "30 min discovery"
---

# kickoff-call-scheduler

> The 14-day clock starts after kickoff. Kickoff happens within 24h
> of deposit. If it doesn't, the build can't start. This skill
> enforces the timeline.

## Trigger
`customers.deposit_paid_at` set → this skill fires immediately.

## The 3-step sequence

### Step 1 — Send the booking email
Draft + queue an email (use `day14-voice`):

```
Subject: Day14 — book your kickoff call

{First name},

Got your deposit. Next step: 30-min kickoff call.

Book here: {CAL_BOOKING_URL}

Two times work best — morning before customers start calling, or
after 5pm. Pick whatever fits.

On the call we'll cover: your intake answers, photos, brand, and
launch date.

— Jack
Day14
```

Save to `02-build-log.md` "Drafts for Jack" + file approval card via `approval-card-builder`.

### Step 2 — Wait for the booking
Cal.com webhook fires when customer books → updates `customers.kickoff_call_at`.

This skill polls Supabase (or listens for the webhook) for the booking event.

### Step 3 — Escalation if no booking in 48h
If 48h passes from deposit and `customers.kickoff_call_at` is still null:

Draft a follow-up SMS (if `customers.phone` present and Twilio wired):

```
Hey {first_name} — Jack from Day14. Deposit came through 2 days ago. Quick 30-min kickoff call: {CAL_BOOKING_URL}. Without it, the 14-day clock can't start. Text me if Cal isn't working.
```

If 96h passes with no booking, escalate to Jack via approval card:

> "Customer {name} hasn't booked kickoff (4 days post-deposit). Suggest a) cold-call them, b) refund + pass on this customer, or c) extend wait one more week."

## Hard rules

1. **Never start the 14-day build clock** until kickoff call is complete.
2. **Never auto-send the follow-up SMS** — drafts only. Jack reviews + sends.
3. **Never schedule kickoff in the customer's stated off-hours** — respect their hours from intake.
4. **Never refund the deposit autonomously** if customer ghosts. That decision is Jack's.

## Failure modes

- **Cal.com link is broken / not yet configured**: surface immediately; can't proceed without booking
- **Customer books but doesn't show up to the call**: log as no-show event; reschedule once; second no-show = surface as approval card for Jack to decide on refund
- **Customer books for 2+ weeks out**: surface as approval — the 14-day SLA expectation needs renegotiating

## Logging

`[YYYY-MM-DD HH:MM ET] kickoff-call-scheduler → customer: {slug}, action: {email-drafted|sms-drafted|escalated}, hours_since_deposit: {N}`

When kickoff completes:
`[YYYY-MM-DD HH:MM ET] kickoff-call-scheduler COMPLETE → customer: {slug}, call_at: {timestamp}, clock_starts: {timestamp}`

## When invoked
- Auto-fires when Stripe webhook reports `payment_intent.succeeded` and matches a Day14 SKU
- Manually when Jack onboards a customer who paid outside Stripe (rare)
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('kickoff-call-scheduler', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'kickoff-call-scheduler', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
