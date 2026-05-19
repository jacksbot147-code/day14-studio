---
name: printify-product-creator
description: Creates Printify products via real API (when PRINTIFY_API_KEY set). Falls back to writing a manual-upload manifest when no key. Closes the gap between design files and live shop.
triggers:
  - "printify-product-creator"
  - "printify product creator"
pack: pod-execution
---

# printify-product-creator

Creates Printify products via real API (when PRINTIFY_API_KEY set). Falls back to writing a manual-upload manifest when no key. Closes the gap between design files and live shop.

See implementation: `src/lib/skills/printify-product-creator.ts` (or scripts/ for daemons).

## Growth hook (auto-attached)

- Fires: `logSkillInvocation('printify-product-creator', context, customer_slug)`.
- Almost-fires: `logAdHoc('describe what you did instead', context)`.
- Fails: `logAction({ action_phrase, context, invoked_skill: 'printify-product-creator', notes: 'failure_mode' })`.

Triggered by → `growth-always-on`.
