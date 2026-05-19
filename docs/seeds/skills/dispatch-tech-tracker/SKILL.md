---
name: dispatch-tech-tracker
description: Real-time tech location (via simple GPS-enabled mobile check-in). Customer-facing 'tech is 10 min away' page. Captures the Uber-experience for service businesses.
triggers:
  - "tech location"
  - "tech tracking"
  - "where is my tech"
pack: dispatch-routing
---

# dispatch-tech-tracker

## What it does

1. Tech opens day in mobile app (or just texts /start to dispatch bot)
2. Phone GPS auto-pings every 5 min
3. Customer-facing page shows tech's current location + ETA
4. Tech can manually update status: 'on my way', 'arrived', 'completed'

## Hard rules

1. **Never expose tech home address** — only en-route to customer view.
2. **GPS off when tech clocks out**.
3. **Always anonymize tech name** to 'your technician' in customer view.
4. **Privacy-respecting** — tech opts in, can pause anytime.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('dispatch-tech-tracker', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'dispatch-tech-tracker', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
