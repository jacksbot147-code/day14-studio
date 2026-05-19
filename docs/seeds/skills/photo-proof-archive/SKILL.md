---
name: photo-proof-archive
description: Archive old service photos after 24 months. Compresses, moves to cold storage, removes from active customer portal but keeps for audit.
triggers:
  - "photo archive"
  - "old photos"
  - "storage cleanup"
pack: photo-proof-pipeline
---

# photo-proof-archive

## Cycle

- 0-24 months: hot storage, on customer portal
- 24-60 months: archived to compressed zip, removed from portal but accessible
- 60+ months: deleted unless customer requested retention

## Hard rules

1. **Always notify customer** when their photos are about to be archived (offer download).
2. **Always preserve appointment record** even after photos deleted.
3. **Honor retention requests** from customer.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('photo-proof-archive', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'photo-proof-archive', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
