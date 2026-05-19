---
name: refund-handler
description: Process a refund request end-to-end. Decision → Stripe API → customer email → dossier note → MRR adjustment. Includes the refund-decision floor so Jack doesn't blanket-refund out of guilt.
triggers:
  - "refund"
  - "money back"
  - "I want my money back"
  - "/refund"
  - "process refund"
---

# refund-handler

> Refunds aren't just money out — they're a signal. This skill processes
> them cleanly AND captures the reason so we can fix the upstream cause.

## The decision tree

```
Customer requests refund within 7 days of launch
  → AUTO-APPROVE (no-questions-back guarantee)
  → Issue full refund, send "we did right by you" email
  → Note reason in dossier

Customer requests refund 7-30 days post-launch
  → Investigate: was the build delivered? Are they using the site?
  → If they're using it: offer 50% refund + keep site
  → If they're not using it: full refund, recover the deployment
  → Always ask: "what would have made this worth keeping?"

Customer requests refund 30+ days post-launch
  → DECLINE (politely) — outside refund window
  → Offer credit toward a redesign instead
  → Note as a churn signal; trigger win-back-campaign 30 days later
```

## What this skill does (mechanically)

1. Verifies customer + amount via Stripe customer_id
2. Looks up the charge via `stripe.charges.list({customer: id})`
3. Issues refund: `stripe.refunds.create({charge: charge_id, reason: 'requested_by_customer'})`
4. Sends customer confirmation email (template: `refund-confirmation.md`)
5. Writes to `~/Documents/businesses/_shared/customers/{slug}/03-refunds.md`
6. Updates MRR: subtract from `mrr-calculator` running total
7. Triggers `feedback-classifier` on the reason text

## Inputs

- `customer_slug` (required)
- `reason` (required, free text from customer)
- `refund_amount` (optional, defaults to last charge in full)
- `override_window` (optional, Jack-only; bypasses 7/30 day rules)

## Hard rules

1. **Never refund without a reason captured.** Even one-word reasons are valuable signal.
2. **Never refund beyond what was charged.** Sanity-check against `stripe.charges.list`.
3. **Always update the dossier.** Refunds outside the dossier don't show up in retention metrics.
4. **Never argue with a customer who wants their money back.** Process it. Capture the reason. Move on.
5. **Refunds within 7d are auto-approved** — don't escalate to Jack unless amount > $500.
6. **Refunds 7-30d** queue a Telegram approval card (P2) for Jack.
7. **Refunds 30d+** always require Jack's tap; default response is decline-with-credit.

## Output

```
✓ Refund issued: $497.00 to ch_3ABC123
  Customer: splash-jacks-pools
  Reason: "found a cheaper option"
  Dossier note: 03-refunds.md updated
  MRR adjusted: -$497
  Win-back triggered: 2026-06-16
```

## When invoked

- Customer email with "refund" keyword → `inbound-classifier` routes here
- `/refund {slug} {reason}` Telegram command
- Stripe dispute event (separate path via `chargeback-disputer`)
- Inside `customer-history-lookup` when refund history requested

## Failure modes

- **Stripe charge not found**: customer paid via PayPal/wire/cash → manual refund
- **Refund window passed but customer is angry**: escalate to Jack — relationships > policy
- **Customer requests refund AND a redesign**: process refund, then convert redesign to net-new sale

## Logging

`[YYYY-MM-DD HH:MM ET] refund-handler → customer: {slug}, amount: ${N}, reason: "{text}", window: {7d|30d|outside}, decision: {approve|decline|escalate}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('refund-handler', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'refund-handler', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
