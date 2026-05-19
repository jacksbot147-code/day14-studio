---
name: approval-expiry-sweeper
description: Hourly sweep that auto-rejects pending approval cards past their 72h expiry. Surfaces what auto-rejected in the morning kickoff so nothing falls through the cracks. Supporting skill for approval-card-builder.
triggers:
  - "expire approvals"
  - "stale approvals"
  - "72 hour"
  - "auto-reject"
---

# approval-expiry-sweeper

> If Jack doesn't decide an approval in 72h, the default action
> happens (per the card's "what if no decision" field). This skill
> enforces that contract.

## Trigger

Runs hourly via scheduled task. Idempotent — safe to run twice in
the same hour.

## The sweep

1. Query `approvals` WHERE `status = 'pending' AND expires_at < now()`
2. For each:
   - Read the card's "what happens if no decision in 72h" field
   - Update status to `expired`
   - Set `decided_at = expires_at`
   - Set `decided_via = 'auto'`
   - Apply the named default action (typically "do nothing" — the proposed change does NOT ship)
   - Append event: `kind=approval-expired, payload={card_id, action_taken}`

## Surface what expired

Append a section to today's `kickoff-YYYY-MM-DD.md` IF any cards
expired in the previous 24h:

```
## Approvals that auto-expired (last 24h)

- Card {NNN} — {title} — would have: {action} — instead: auto-rejected
- Card {NNN} — {title} — ...
```

This gives Jack visibility on what defaulted out so he can decide
if any need re-filing as new approval cards.

## Hard rules

1. **Never delete an expired approval card.** Status flips to expired; row stays. History is preserved.
2. **Never re-fire the auto-reject for the same card twice.** Idempotency check: status was `pending` immediately before this run.
3. **Never auto-reject a P0 card silently.** P0 cards (urgent) should already have triggered SMS — but if one expires, escalate via approval-card-builder's urgent path before defaulting.
4. **Never extend an expiry window.** If a card is close to expiring, file a NEW card; don't shift the old one.

## Edge cases

- **Card was decided in the same minute as expiry**: race condition; prefer the human decision over auto. Skill checks `status` before updating; if `status = approved|rejected`, do nothing.
- **`expires_at` is null**: shouldn't happen (cards always get expiry), but defensive — log as "card has no expiry, skipping" and surface to Jack.
- **System clock skew**: trust the database `now()` over the agent's clock.

## Logging

`[YYYY-MM-DD HH:MM ET] approval-expiry-sweeper → expired: {N}, default_actions_taken: {N}, P0_escalated: {N}`

When 0 expired:
`[YYYY-MM-DD HH:MM ET] approval-expiry-sweeper → no expired cards, healthy queue`

## When invoked
- Hourly scheduled task: `0 * * * *`
- Manually after deploying a fix to an approval flow
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('approval-expiry-sweeper', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'approval-expiry-sweeper', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
