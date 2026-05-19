---
name: appointment-availability-publisher
description: Push staff availability to public booking page + internal admin. Handles vacation, time-off, sick days, double-booking rules.
triggers:
  - "set availability"
  - "time off"
  - "staff schedule"
pack: appointment-pipeline
---

# appointment-availability-publisher

## What it does

1. Staff sets working hours + exceptions (vacation, sick days)
2. Skill computes effective availability per week
3. Publishes to public booking page (only available slots show)
4. Pushes internal calendar with red/yellow/green per slot
5. Auto-cancels affected appointments if staff time-off claims previously-booked time (with Jack-tap)

## Hard rules

1. **Never auto-cancel customer appointments** without Jack-tap.
2. **Always announce vacation 2 weeks ahead** via newsletter to existing customers.
3. **Always block buffer for setup/cleanup time**.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('appointment-availability-publisher', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'appointment-availability-publisher', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
