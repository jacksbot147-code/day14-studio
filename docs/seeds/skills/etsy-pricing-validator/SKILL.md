---
name: etsy-pricing-validator
description: Web-grounded competitor pricing research. Finds 5-8 similar live Etsy listings with actual prices, returns recommended range + verdict on proposed price.
triggers:
  - "etsy-pricing-validator"
  - "etsy pricing validator"
pack: etsy-execution
---

# etsy-pricing-validator

Web-grounded competitor pricing research. Finds 5-8 similar live Etsy listings with actual prices, returns recommended range + verdict on proposed price.

See implementation: `src/lib/skills/etsy-pricing-validator.ts`.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('etsy-pricing-validator', context, customer_slug)` from `@/lib/work-register`.
- **When it almost fires:** call `logAdHoc('describe what you did instead', context)`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'etsy-pricing-validator', notes: 'failure_mode' })`.

Triggered by → `growth-always-on` skill.
