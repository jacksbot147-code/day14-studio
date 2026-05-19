---
name: etsy-product-mockup-prompts
description: Produces 6-10 image-generator prompts (Midjourney/DALL-E/Imagen) covering all Etsy image slots: hero, lifestyle, detail, scale, what's included, in-context.
triggers:
  - "etsy-product-mockup-prompts"
  - "etsy product mockup prompts"
pack: etsy-execution
---

# etsy-product-mockup-prompts

Produces 6-10 image-generator prompts (Midjourney/DALL-E/Imagen) covering all Etsy image slots: hero, lifestyle, detail, scale, what's included, in-context.

See implementation: `src/lib/skills/etsy-product-mockup-prompts.ts`.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('etsy-product-mockup-prompts', context, customer_slug)` from `@/lib/work-register`.
- **When it almost fires:** call `logAdHoc('describe what you did instead', context)`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'etsy-product-mockup-prompts', notes: 'failure_mode' })`.

Triggered by → `growth-always-on` skill.
