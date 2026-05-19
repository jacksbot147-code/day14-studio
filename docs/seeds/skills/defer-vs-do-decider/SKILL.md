---
name: defer-vs-do-decider
description: For any incoming ask (email, DM, Telegram), classify: do-now, schedule, delegate-to-agent, or drop. Replaces the "I'll get to it" backlog that secretly grows into burnout.
triggers:
  - "should I do this now"
  - "defer or do"
  - "what about this email"
  - "/triage"
---

# defer-vs-do-decider

> Every yes to "I'll get to it later" is a debt to future Jack with
> compound interest. This skill makes the debt visible at point of contact.

## The 4-option triage

For any incoming ask, force-classify:

```
DO_NOW       — < 5 min OR critical path; handle in next 30 min
SCHEDULE     — > 5 min but real value; put on calendar with explicit time
DELEGATE     — an agent or skill can handle it; route + remove from Jack
DROP         — not worth the time; reply "no" or auto-archive
```

Default classification when uncertain: DROP. Bias to dropping.

## Decision criteria

Per ask, score:

| Dimension | Weight | High score = |
|---|---|---|
| Time required | 25 | quick → do |
| Reversibility | 20 | reversible → do/delegate |
| Critical path | 30 | blocking customer or revenue → do |
| Long-tail value | 15 | compounds over months → schedule, not drop |
| Personal interest | 10 | low → drop, don't fake-defer |

Score → suggestion:
- >70 → DO_NOW
- 40-70 → SCHEDULE or DELEGATE (prefer DELEGATE)
- <40 → DROP

## Hard rules

1. **Never default to SCHEDULE.** The schedule bucket is where things go to die. Force DROP or DELEGATE first.
2. **DELEGATE > SCHEDULE.** If an agent can do it, route it. Even imperfectly.
3. **Always set a calendar time on SCHEDULE.** Vague "later this week" = forget. Specific = real.
4. **DROP requires a 1-line decline.** Auto-archive without reply is rude AND breaks future deals.
5. **Track classification accuracy.** If 60% of SCHEDULE items never happen, raise the threshold.
6. **Never use this skill inside a decision-fatigue gate.** When fatigued, default DROP.

## What this skill does

1. Receives an ask (text + source)
2. Asks 4 quick questions if not clear: time, reversible, critical, interest
3. Computes score
4. Suggests classification
5. On Jack tap → executes:
   - DO_NOW: open the relevant skill or workflow
   - SCHEDULE: add to calendar via cal.com or Apple Calendar
   - DELEGATE: route to skill or sub-agent
   - DROP: send 1-line decline + archive

## Inputs

- `ask_text` (the email / DM / task)
- `source` (where it came from)

## Output

```
ask: "Want me to join a podcast next month about Day14?"

scoring:
  time:        90 min recording + 30 min prep = 120 min → 20
  reversibility: easy to decline → 80 → 16
  critical_path: not blocking anything → 10 → 3
  long_tail:   maybe 2 customers → 25 → 4
  interest:    Jack rated low → 10 → 1

score: 44 → SCHEDULE or DELEGATE

suggestion: DROP
reason: low score + scheduled-but-not-critical items historically slip
action: reply "appreciate it, not the right time for me — try @daniel"
```

## When invoked

- Inside `inbound-classifier` for unclear-route emails
- `/triage` Telegram command on any forwarded item
- During `daily-eod` to clean up day's drift
- Inside `weekly-priorities-flush`

## Failure modes

- **All 4 options feel wrong**: probably means the framing is off; ask Jack to rephrase the ask
- **Score 50 (exactly on edge)**: default DELEGATE, then DROP, never SCHEDULE
- **Repeat asks for same item**: after 2 DROPs, treat as do-not-contact

## Logging

`[YYYY-MM-DD HH:MM ET] defer-vs-do-decider → ask: "{8 words}", score: {N}, classification: {do_now|schedule|delegate|drop}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('defer-vs-do-decider', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'defer-vs-do-decider', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
