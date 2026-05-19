---
name: pod-design-brief-generator
description: Generates 5-8 ready-to-paste Midjourney/DALL-E prompts for POD products in a given niche × product type. Includes color palettes, headline text, AR for mug/tee/poster.
triggers:
  - "pod-design-brief-generator"
  - "pod design brief generator"
pack: pod-execution
---

# pod-design-brief-generator

Generates 5-8 ready-to-paste Midjourney/DALL-E prompts for POD products in a given niche × product type. Includes color palettes, headline text, AR for mug/tee/poster.

See implementation: `src/lib/skills/pod-design-brief-generator.ts`.

## Growth hook (auto-attached)

- Fires: `logSkillInvocation('pod-design-brief-generator', context, customer_slug)`.
- Almost-fires: `logAdHoc('describe what you did instead', context)`.
- Fails: `logAction({ action_phrase, context, invoked_skill: 'pod-design-brief-generator', notes: 'failure_mode' })`.

Triggered by → `growth-always-on`.
