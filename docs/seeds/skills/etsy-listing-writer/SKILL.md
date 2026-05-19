---
name: etsy-listing-writer
description: Generate complete Etsy listing: title (140 chars), description with sections, 13 tags, materials, target price. Outputs ready-to-copy markdown into ~/Documents/businesses/{tenant}/listings/.
triggers:
  - "etsy-listing-writer"
  - "etsy listing writer"
pack: etsy-execution
---

# etsy-listing-writer

Generate complete Etsy listing: title (140 chars), description with sections, 13 tags, materials, target price. Outputs ready-to-copy markdown into ~/Documents/businesses/{tenant}/listings/.

See implementation: `src/lib/skills/etsy-listing-writer.ts`.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('etsy-listing-writer', context, customer_slug)` from `@/lib/work-register`.
- **When it almost fires:** call `logAdHoc('describe what you did instead', context)`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'etsy-listing-writer', notes: 'failure_mode' })`.

Triggered by → `growth-always-on` skill.
