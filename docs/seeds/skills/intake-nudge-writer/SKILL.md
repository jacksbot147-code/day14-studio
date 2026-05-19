---
name: intake-nudge-writer
description: When a customer paid the deposit but hasn't submitted the intake form (or finished it partway), draft a gentle nudge. Tone scales by silence duration — friendly check at 48h, more direct at 5 days, escalation at 7+ days. Supporting skill for customer-readiness-check.
triggers:
  - "customer silent"
  - "intake not done"
  - "nudge customer"
  - "follow up on intake"
---

# intake-nudge-writer

> Customer paid. Customer went silent. The build clock can't start
> until they finish intake. This skill writes the nudge that gets
> them back in.

## Trigger
`customers.deposit_paid_at` set AND `customers.intake_done_at` null AND silence duration > 48h.

## The silence-duration ladder

| Silence duration | Channel | Tone |
|---|---|---|
| 48h | Email | Friendly, "checking in" |
| 5 days | Email + SMS | More direct, "two-day reminder" |
| 7 days | SMS only | Concerned, "everything OK?" |
| 10 days | Phone call (Jack manually) | "Want to make sure we're still good" |
| 14 days | Escalation | Surface as approval card: refund or proceed-anyway |

## Drafts per stage

### 48h email

```
Subject: Day14 intake — when works?

{First name},

Deposit cleared 2 days ago. Whenever you can, fill the intake here:
{INTAKE_LINK}

It's the only thing between us and starting your build. Takes ~12 min.

Questions before you start, text me: 239-XXX-XXXX.

— Jack
Day14
```

### 5-day email

```
Subject: Day14 — 5-day check

{First name},

5 days post-deposit. Haven't seen the intake come through. Two
possibilities:

1. You got busy (totally fine — finish when you can: {INTAKE_LINK})
2. Something's off (tell me — I'll fix)

Either way: text me 239-XXX-XXXX or finish at the link.

— Jack
Day14
```

### 5-day SMS (sent same time as email)

```
Hey {first_name} — Jack from Day14. Quick nudge on the intake form so we can start your build. {INTAKE_LINK}. Or text back here.
```

### 7-day SMS

```
Hey {first_name} — 7 days since deposit. Want to make sure everything's good on your end. Reply OK if you're still in, or LATER if you need more time, or REFUND if you want out (deposit-back guarantee applies).
```

### 10-day escalation

Switches to Jack-manually-calls mode. Skill drafts a one-page brief:

> "Customer {name} silent 10 days post-deposit. Phone: {phone}. Intake gaps: {what's missing}. Recommended ask: 'Wanted to check in — still good for this build, or should we pause and revisit later?' Options to offer: continue, pause 30 days, refund."

### 14-day escalation
Surface to Jack via approval card titled `Silent customer — proceed or refund?`:

> "{Customer} has been silent 14 days post-deposit. Per SOW deposit-back guarantee applies on request. Three options:
> a) Wait another 7 days, then refund
> b) Refund proactively (no further nudges)
> c) Call them today; decide after
> Recommended: (c) — direct call has higher resolution rate than more emails."

## Hard rules

1. **Never auto-send.** Every nudge is drafted; Jack reviews + sends. Even SMS.
2. **Never escalate the tone faster than the ladder.** A 48h nudge is friendly even if Jack is frustrated.
3. **Never threaten refund/cancellation** before the customer brings it up. The 7-day SMS offers it as an option, not a threat.
4. **Never spam.** One nudge per stage, max.
5. **Never assume bad intent.** Default explanation is "customer got busy" — Day14 customers run service businesses; their day jobs come first.

## Failure modes

- **Customer replies to a nudge but doesn't complete intake**: log the reply in `04-feedback.md`; don't send the next nudge in the ladder; let Jack triage.
- **Customer says "I want to cancel"**: switch to refund-processing flow; suppress all future nudges.
- **Customer's email bounces**: switch entirely to SMS for that customer; surface bounce to Jack.

## Logging

`[YYYY-MM-DD HH:MM ET] intake-nudge-writer → customer: {slug}, stage: {48h|5d|7d|10d|14d}, channel: {email|sms|both|phone-prep}, draft_path: {path}`

When customer completes intake post-nudge:
`[YYYY-MM-DD HH:MM ET] intake-nudge-writer SUCCESS → customer: {slug}, nudge_stage_that_worked: {stage}`

Quarterly: count which nudge stage produces the most completions. Tune the ladder.

## When invoked
- Scheduled task fires daily at 9am, checks all customers with deposit but no intake, drafts nudges per silence duration
- Manually when Jack asks "did {name} ever come back?"
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('intake-nudge-writer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'intake-nudge-writer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
