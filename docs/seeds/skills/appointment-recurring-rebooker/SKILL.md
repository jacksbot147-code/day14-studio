---
name: appointment-recurring-rebooker
description: Recurring services (monthly grooming, quarterly checkups) auto-suggest rebooking 7 days before expiration. Drives 70% rebook rate.
triggers:
  - "rebook"
  - "recurring appointment"
pack: appointment-pipeline
---

# appointment-recurring-rebooker

## Flow

1. After each appointment for a recurring-service customer, schedule next reminder
2. 7 days before next due: email with 1-tap rebook
3. Same time slot offered by default (customers love consistency)
4. If declined: 30-day re-engagement nudge

## Hard rules

1. **Always preserve customer's preferred staff member** if any.
2. **Always offer their previous time slot** first.
3. **Never auto-book** — customer must confirm.
4. **Honor seasonal patterns** — pool customer in winter ≠ pool customer in summer.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('appointment-recurring-rebooker', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'appointment-recurring-rebooker', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
