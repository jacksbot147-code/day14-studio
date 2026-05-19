---
name: urgency-classifier
description: Score every notification, approval card, and proactive push with a P0/P1/P2/P3 urgency rating. Determines whether Jack's phone buzzes now, buzzes silently, or batches into morning digest. Cross-phase skill.
triggers:
  - "how urgent"
  - "P0 P1 P2 P3"
  - "urgency rating"
---

# urgency-classifier

> Not every notification deserves a buzz. P0 = phone screams. P3 =
> waits for morning digest. The line between matters because every
> false P0 erodes future P0 attention.

## The 4 levels

| Level | What it means | Delivery treatment |
|---|---|---|
| **P0** | Customer-facing emergency. Money in motion. Site down. | Telegram with sound + vibration regardless of time |
| **P1** | Needs Jack's attention within 4h. Approval blocking work. | Telegram with sound during waking hours; defers to digest at night |
| **P2** | Needs attention today. Routine approvals. Daily kickoff. | Telegram silent (no buzz) during waking; batches at night |
| **P3** | Informational. Logs. Nightly polish all-clear. | Morning digest only; never solo-pushed |

## Per-event classification

### P0 examples (auto-tag if)
- Production site returns 5xx for >5 min
- Stripe webhook signature verification failed
- Customer site SSL cert <3 days from expiry
- Leaked secret detected anywhere in repo
- Customer's email lands tagged `complaint`
- Hurricane in cone within 72h of SWFL impact

### P1 examples
- Approval card with `expires_at` < 8h
- Customer asks for change requiring code work
- Lighthouse drops >10 points week-over-week
- Customer payment late by 24h+
- DM reply from outreach lead

### P2 examples
- Daily kickoff (9 AM)
- EOD report (5 PM)
- New approval card with 72h expiry
- Routine customer reply draft for review
- Weekly council review output

### P3 examples
- Nightly polish all-clear
- Hourly health check (when all green)
- Skill invocation metrics
- Background log entries

## Classification rules

For each event, run through the table in order; first match wins:

```
if event is customer-facing-down OR money-issue OR secret-leak OR P0-storm:
  → P0
elif event expires-within-8h OR customer-asks-for-change OR negative-review:
  → P1
elif event is daily-routine OR routine-approval OR weekly-cadence:
  → P2
else:
  → P3
```

## Output

A simple object:
```json
{
  "urgency": "P1",
  "reason": "approval card with 6h expiry; customer-blocking",
  "expedited": false,
  "delivery_recommendation": {
    "channel": "telegram",
    "sound": true,
    "respect_quiet_hours": false,
    "include_in_digest": true
  }
}
```

## How other skills use this

- `telegram-outbound-formatter` sets `disable_notification` for P3 only
- `batching-quiet-hours` skips P0; batches P1-P3
- `jack-asleep-detector` controls when P1 gets delivered
- `telegram-status-pusher` only pushes P0/P1 in real-time; P2/P3 wait for digest

## Hard rules

1. **Never auto-classify P0 without a verifiable trigger.** "Probably P0" → it's P1.
2. **Never escalate without aging data.** A pattern of "every approval marked P1 actually wasn't" → tune the rules down.
3. **Never let urgency drift downward.** If an event is tagged P1 and starts aging toward expiry, escalate to P0 at 4h-remaining.
4. **Always include "reason"** in the classification. Helps debugging.

## Calibration

After 2 weeks of operation:
- Count false-P0s (Jack interrupted, wasn't actually urgent) — target: <5%
- Count missed-P0s (P1 that should've been P0) — target: <1%
- If either out of range: tune the rules

## When invoked
- Every outbound message via Telegram
- Every approval card filed
- Every event written to Supabase events table (for routing logic)

## Logging

`[YYYY-MM-DD HH:MM ET] urgency-classifier → event: {kind}, urgency: {P}, reason: {one-line}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('urgency-classifier', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'urgency-classifier', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
