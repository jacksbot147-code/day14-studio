---
name: chargeback-disputer
description: When Stripe reports a chargeback, gather evidence (intake form, build screenshots, customer comms, launch confirmation) and file the dispute through Stripe's portal. Win-rate matters; documentation wins.
triggers:
  - "chargeback"
  - "dispute"
  - "charge.dispute.created"
  - "fight chargeback"
---

# chargeback-disputer

> Chargebacks are won by paperwork, not arguments. This skill assembles
> the paperwork.

## What this skill does

1. Stripe webhook fires `charge.dispute.created`
2. Looks up customer dossier → pulls everything paper-trail-able:
   - Original intake form (proof of consent + scope)
   - Build log (proof of work delivered)
   - Launch-day email with site URL (proof of delivery)
   - Any customer praise emails (counter-narrative)
   - Site uptime logs (proof of ongoing service)
3. Generates dispute response document (.pdf via pdf skill)
4. Queues Telegram P1 to Jack: "Chargeback filed. Review evidence, then I'll submit."
5. On Jack approval → submits via `stripe.disputes.update({evidence: {...}})`

## Evidence template

```
DISPUTE RESPONSE — {customer_slug} — {dispute_id}

1. Service description
   Customer purchased website build (Day14 OS) on {date}.
   Total charged: ${amount}.

2. Customer consent
   Intake form signed: {intake_date}
   Form link: {permalink}
   Scope agreed: {scope_summary}

3. Service delivered
   Site launched: {launch_date}
   URL: {customer_url}
   Build log: {build_log_link}

4. Customer communications
   {comm_timeline}: 5 emails, all responded to within 24h.
   Customer received launch email + 3 follow-ups; no objections raised
   before this chargeback.

5. Site is operational
   Uptime since launch: {uptime_pct}%
   Lighthouse score: {score}
   Last accessed by customer: {date}

6. Refund policy
   Customer was offered refund within 7-day window. Declined.
   Customer requested chargeback {N} days post-launch.

Attached:
- intake-form.pdf
- launch-confirmation-email.pdf
- communication-timeline.pdf
- uptime-report.pdf
```

## Hard rules

1. **Never auto-submit.** Always Jack-tap before submission. Chargebacks have a 1-shot response window.
2. **Always include the intake form.** It's the single best evidence — proof of scope + consent.
3. **Always submit by deadline.** Stripe gives 7-21 days. Calendar reminder day-before.
4. **Never engage the customer directly about the chargeback.** Stripe handles communication. Direct contact muddies.
5. **Always log win/loss outcome.** Builds chargeback-rate metric for risk-scoring.

## Inputs

- `dispute_id` (Stripe)
- `customer_slug`
- `dispute_reason` (fraudulent, duplicate, product_not_received, etc.)

## When invoked

- Stripe `charge.dispute.created` webhook → auto-gathers evidence
- Stripe `charge.dispute.updated` → status check
- `/chargeback {dispute_id}` Telegram command → manual review

## Failure modes

- **Customer dossier incomplete**: gather what's there, flag gaps to Jack
- **Deadline passed**: submit anyway with apology + supporting docs — Stripe sometimes accepts late
- **Lost chargeback**: log + feed into `feedback-classifier` for upstream learning

## Logging

`[YYYY-MM-DD HH:MM ET] chargeback-disputer → dispute: {id}, customer: {slug}, reason: {code}, evidence_completeness: {%}, action: {gathered|submitted|won|lost}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('chargeback-disputer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'chargeback-disputer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
