---
name: etsy-shop-policies-generator
description: Generates all 4 Etsy shop policies (about, shipping, returns, privacy) tuned for digital/physical/mixed product types. Plain language, warm-but-firm voice.
triggers:
  - "etsy-shop-policies-generator"
  - "etsy shop policies generator"
pack: etsy-execution
---

# etsy-shop-policies-generator

Generates all 4 Etsy shop policies (about, shipping, returns, privacy) tuned for digital/physical/mixed product types. Plain language, warm-but-firm voice.

See implementation: `src/lib/skills/etsy-shop-policies-generator.ts`.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('etsy-shop-policies-generator', context, customer_slug)` from `@/lib/work-register`.
- **When it almost fires:** call `logAdHoc('describe what you did instead', context)`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'etsy-shop-policies-generator', notes: 'failure_mode' })`.

Triggered by → `growth-always-on` skill.
