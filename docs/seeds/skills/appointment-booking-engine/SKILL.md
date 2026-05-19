---
name: appointment-booking-engine
description: Customer-facing online booking. Reads Cal.com availability or local calendar, shows open slots, books on confirmation. Foundation for vet/mobile/charter/med-spa.
triggers:
  - "book appointment"
  - "online booking"
  - "schedule appointment"
pack: appointment-pipeline
---

# appointment-booking-engine

## What it does

1. Customer visits site → sees real-time availability
2. Picks service + time slot
3. Confirms with email + phone
4. Booking syncs to Cal.com / Google Calendar / staff app
5. Auto-creates customer record if new

## Hard rules

1. **Never double-book** — atomic slot lock at confirmation.
2. **Always send confirmation immediately** (email + optional SMS).
3. **Always include cancellation policy** in confirmation.
4. **Always block buffer time** (15 min between appointments default).
5. **Never expose internal staff names** in public availability.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('appointment-booking-engine', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'appointment-booking-engine', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
