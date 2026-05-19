---
name: auto-approve-low-risk
description: Auto-approve approval cards that score below the risk threshold. Frees Jack from trivia. Phase 5 anchor of autonomous architecture.
triggers:
  - "auto-approve"
  - "low risk"
  - "skip jack"
---

# auto-approve-low-risk

> Not every decision deserves Jack's attention. 70% of approval cards
> are routine. This skill auto-approves those and surfaces only the
> 30% that matter.

## What qualifies for auto-approve

A card auto-approves if ALL true:

1. **Risk score < threshold** (default 0.3, calibrated quarterly)
2. **Reversibility ≥ 0.9** (one-tap undo, no data loss)
3. **Cost < $10** (zero-dollar preferred)
4. **Customer-not-affected OR explicitly opted-into auto-fixes**
5. **No prior pattern of similar cards being rejected**

Computed by `risk-scoring` skill.

## Auto-approve list (initial defaults)

These card types auto-approve by default:

- Lighthouse-passing preview deploys (already verified by QA)
- Image optimization commits (cosmetic improvements)
- Broken link auto-fixes when the new target is verified
- Dependency security patches (when CI passes)
- SSL cert renewals (already handled by Vercel; just acknowledging)
- Internal docs updates (skill files, runbooks)

These NEVER auto-approve:

- Anything customer-facing in email/SMS
- Money movements (Stripe, refunds)
- Production domain changes
- Deletions of any kind
- Stripe live-mode toggles
- Customer onboarding starts (`customer-build-day-1-bootstrap`)

## The auto-approve action

When a card auto-approves:

1. Set `status=approved`, `decided_via=auto`, `decided_at=now()`
2. Execute the proposed action immediately (no human in the loop)
3. Log to MASTER_LOG AND to `~/Documents/studio/docs/auto-approvals.md`
4. Send a P3 batch entry to Jack (not a buzz — just an audit trail)
5. After 30 days, score the outcome: did this decision age well?

## Daily summary

Once a day, `auto-approval-audit` rolls up:
- Cards auto-approved in last 24h
- Cards Jack would have rejected if he'd seen them (anomalies)
- Outcomes from auto-approvals 30 days ago

## Hard rules

1. **Never auto-approve a card without all 5 conditions met.**
2. **Never auto-approve a card type that's never been seen before.** Require 3+ prior manually-approved instances first.
3. **Always log to a separate auto-approvals file** for audit.
4. **Always include the auto-approval count in daily-eod.** Jack should see the volume.
5. **Pause auto-approve immediately** if Jack flags any auto-approved card as wrong.

## Failure modes

- **Risk-scoring returns wrong score** (false low-risk): the audit catches it; pause the rule that produced it
- **Auto-approve creates a state Jack can't undo**: tag for postmortem; tighten threshold
- **Auto-approve volume grows past Jack's daily attention**: that's the win — pause when comfortable

## When invoked
- After every `approval-card-builder` files a new card
- Before `telegram-approval-card` pushes a notification (skip if auto-approved)
- Manually for retroactive auto-approve testing

## Logging

`[YYYY-MM-DD HH:MM ET] auto-approve-low-risk → card: {id}, risk_score: {N}, decided: auto-approved, action_fired: {what}`

Quarterly: ratio of auto-approved to manual. Target: 60-75% auto-approved after 90 days of operation.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('auto-approve-low-risk', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'auto-approve-low-risk', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
