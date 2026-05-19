---
name: photo-proof-watermarker
description: Add subtle brand watermark to customer-facing photos. Bottom-right corner, semi-transparent. Drives word-of-mouth when customers share.
triggers:
  - "watermark"
  - "brand photos"
  - "photo brand"
pack: photo-proof-pipeline
---

# photo-proof-watermarker

## Rules

- Watermark: brand logo + tagline (e.g., 'Splash Jack's Pools — Naples')
- Position: bottom-right, 60% opacity
- Size: ~8% of image width
- Font: brand's primary font
- Color: brand's primary color with white shadow for legibility

## Hard rules

1. **Subtle, not gaudy** — customers will share organically, not begrudgingly.
2. **Never watermark internal-only photos** (Jack/tech reference).
3. **Always keep original unmarked version** in archive.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('photo-proof-watermarker', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'photo-proof-watermarker', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
