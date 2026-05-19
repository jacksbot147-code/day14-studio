---
name: warmth-calibrator
description: Adjusts the EOD email's tone based on customer's relationship age. Day 1 customer = more orienting / explanatory. Day 12 customer = curt and presumed-knowledge. Day +30 customer = relaxed familiar. Supporting skill for eod-update-writer.
triggers:
  - "tone for this customer"
  - "first email"
  - "long-term customer"
  - "calibrate familiarity"
---

# warmth-calibrator

> The right tone for a customer on day 1 is wrong on day 14.
> Day 1 needs orientation; day 14 needs presumed familiarity.
> This skill adjusts.

## Input
- Customer slug
- `customers.deposit_paid_at` (relationship start date)
- `events` table for prior interactions

## The 5 relationship stages

### Stage A — Day 1-2 (orienting)
- Customer just paid
- Doesn't yet know Day14's pace, voice, or what to expect
- Email tone: explain a bit, set expectations, build confidence

Tone marker: introduce yourself + the rhythm. "I'll send a one-paragraph update at 5pm every weekday until launch."

### Stage B — Day 3-7 (settling in)
- Customer has received 2-3 EODs already
- Knows the rhythm; expects updates without preamble
- Tone: direct, friendly, can presume context

Tone marker: skip "as I mentioned yesterday" preamble; reference today's work directly.

### Stage C — Day 8-13 (presumed-knowledge)
- Customer knows what's in scope, what's coming
- Tone: curt, confident, milestone-aware

Tone marker: shorter sentences. Less explanation. More "shipping {X}, on track for Friday launch."

### Stage D — Launch day (event)
- One-off tone: factual, celebration-light (no champagne emoji)
- Different from any other email; treat as a unique tonal moment

Use `launch-day-customer-email` skill instead — this skill defers to it.

### Stage E — Day +1 to +30 (post-launch warranty)
- Relationship is now ongoing
- Tone: relaxed, occasional check-ins, "anything off — text me"
- Less frequent than build phase (weekly, not daily)

### Stage F — Day +30 onward (long-term)
- Familiar, low-overhead
- Email becomes rare; SMS / text-back becomes default
- Tone: friend who happens to maintain your site

## How the calibration applies

Take a base draft (from `eod-update-writer`). Run through the calibrator:

| Stage | Adjustments |
|---|---|
| A | Add 1 sentence of context if base has none ("Day 1 of the 14-day build."). Lengthen the opener slightly. |
| B | Remove any "as we discussed" filler. Drop greeting if it's a follow-up email. |
| C | Compress. Drop adjectives. Front-load specifics. |
| D | Defer to `launch-day-customer-email`. |
| E | Reduce frequency to weekly. Drop daily EODs entirely. |
| F | Move to SMS check-in pattern; EOD email no longer applies. |

## Output

A version-2 of the input draft with stage-appropriate adjustments. Annotations:

```
Stage detected: B (settling-in, day 5 of 14)

Adjustments made:
- Removed opener "Just to follow up on yesterday's update,"
- Compressed sentence 3 from 28 to 14 words
- Kept signature as-is

Final draft:
{adjusted text}
```

## Hard rules

1. **Never apply this skill to non-customer text.** Internal updates, build logs, etc. stay at base voice.
2. **Never go below Stage A's level of context** for a new customer just because they "seem to get it." Confidence builds from over-explaining, not under-explaining.
3. **Never override `launch-day-customer-email`'s tone** on launch day. That email is its own moment.
4. **Always re-detect stage** based on `deposit_paid_at` and current date — don't cache the stage between calls.

## Failure modes

- **Customer paid deposit but no other activity for 14 days**: still in Stage A; don't advance the calibration based on time alone. Activity drives stage.
- **Customer is mid-rebuild after a complaint**: reset to Stage A for the rebuild duration. Trust resets.
- **Long-term customer asks for a major new build**: that's a new SOW; new clock; reset to Stage A for that scope.

## Logging

`[YYYY-MM-DD HH:MM ET] warmth-calibrator → customer: {slug}, stage_detected: {A-F}, adjustments_made: N`

## When invoked
- Always before sending an EOD email (default-on for all customer-facing email)
- Inside `eod-update-writer` automatically
- Manually when Jack feels "this draft is too formal" or "this draft is too casual"
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('warmth-calibrator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'warmth-calibrator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
