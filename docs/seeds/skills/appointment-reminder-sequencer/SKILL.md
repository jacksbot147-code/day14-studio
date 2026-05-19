---
name: appointment-reminder-sequencer
description: Email + SMS reminders at 48h, 24h, 2h before appointment. Cuts no-shows by 60%.
triggers:
  - "appointment reminder"
  - "reduce no-shows"
pack: appointment-pipeline
---

# appointment-reminder-sequencer

## The sequence

| Time before | Channel | What |
|---|---|---|
| 48 hours | Email | Friendly reminder, includes prep instructions |
| 24 hours | SMS + email | Confirm or reschedule link |
| 2 hours | SMS only | 'See you soon!' + location/address |

## Hard rules

1. **Always include reschedule link** — easier than no-show.
2. **Always include directions** in 2-hour reminder.
3. **Never send between 9 PM and 8 AM**.
4. **Always honor unsubscribe** for reminder texts.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('appointment-reminder-sequencer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'appointment-reminder-sequencer', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
