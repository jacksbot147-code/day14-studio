---
name: appointment-no-show-recovery
description: Customer no-shows → 30 min later auto-text 'You okay?' (warm, not punitive) + reschedule link. Captures 40% of would-be lost appointments.
triggers:
  - "no show"
  - "missed appointment"
pack: appointment-pipeline
---

# appointment-no-show-recovery

## The flow

1. Appointment time + 30 min passes with no check-in
2. Mark no-show
3. Send warm text: "Hey {name}, missed you for the {service} today. Everything okay? Want to grab another slot? {reschedule link}"
4. If no response in 48h: re-engagement sequence with discount option

## Hard rules

1. **Always lead with concern, not punishment**.
2. **Never charge no-show fee on first offense** (unless policy explicit at booking).
3. **Always offer reschedule** even after no-show.
4. **Track no-show patterns** — 3 no-shows = require deposit going forward.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('appointment-no-show-recovery', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'appointment-no-show-recovery', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
