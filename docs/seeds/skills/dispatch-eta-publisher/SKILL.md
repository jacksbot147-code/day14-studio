---
name: dispatch-eta-publisher
description: Customer-facing 'tech arrival in N min' notifications via SMS. Reduces 'where are you?' calls by 80%.
triggers:
  - "eta"
  - "tech eta"
  - "on the way"
pack: dispatch-routing
---

# dispatch-eta-publisher

## Cadence

| When | Message |
|---|---|
| Tech leaves prior stop | 'On my way! ETA ~25 min' |
| 10 min before arrival | 'Almost there — see you in ~10 min' |
| Tech checks in 'arrived' | 'I'm here!' |
| Delay > 15 min | 'Running about {N} min late, sorry!' |

## Hard rules

1. **Never spam** — max 3 SMS per appointment.
2. **Always update on delay** — silent late = bad review.
3. **Include phone number** so customer can call tech directly if needed.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('dispatch-eta-publisher', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'dispatch-eta-publisher', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
