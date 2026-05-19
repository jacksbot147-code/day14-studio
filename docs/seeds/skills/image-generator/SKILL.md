---
name: image-generator
description: Generate images via Gemini Imagen 4 (with nano-banana fallback). Free tier supports basic image gen. Used for Etsy listing photos, POD design files, blog headers. Saves to ~/Documents/businesses/{tenant}/generated-images/.
triggers:
  - "image-generator"
  - "image generator"
pack: automation
---

# image-generator

Generate images via Gemini Imagen 4 (with nano-banana fallback). Free tier supports basic image gen. Used for Etsy listing photos, POD design files, blog headers. Saves to ~/Documents/businesses/{tenant}/generated-images/.

See implementation: `src/lib/skills/image-generator.ts` (or scripts/ for daemons).

## Growth hook (auto-attached)

- Fires: `logSkillInvocation('image-generator', context, customer_slug)`.
- Almost-fires: `logAdHoc('describe what you did instead', context)`.
- Fails: `logAction({ action_phrase, context, invoked_skill: 'image-generator', notes: 'failure_mode' })`.

Triggered by → `growth-always-on`.
