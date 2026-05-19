---
name: product-photo-organizer
description: Sort, rename, optimize, and place product photos into catalog/photos/{sku}/. Strips EXIF, generates square + landscape variants, runs ImageOptim. Photos drive 30% of e-commerce conversion.
triggers:
  - "product photos"
  - "photo organize"
  - "resize images"
  - "image optimization"
pack: ecom-ops
---

# product-photo-organizer

> Bad photos kill e-commerce conversion faster than bad copy.
> This skill turns 200 raw camera dumps into clean, optimized, named assets.

## What this skill does

1. Watches an inbox dir: `~/Documents/businesses/{tenant}/catalog/photos/_inbox/`
2. For each new file:
   - Reads EXIF (date, camera) and renames: `{date}-{counter}.jpg`
   - Strips all EXIF (privacy + smaller file)
   - Resizes to 3 variants: 2400px square, 1600px landscape, 800px thumbnail
   - Runs ImageOptim/oxipng to compress
   - Prompts Jack via Telegram: "Which SKU does this belong to?" (multiple-choice)
3. On Jack tap: moves to `catalog/photos/{sku}/`
4. Updates products.json with new photo path

## Hard rules

1. **Never delete originals** — keep at `_originals/` for 90 days.
2. **Always strip EXIF** — GPS data leaks have killed brands before.
3. **Always run ImageOptim** — 30-50% file size reduction with no visible loss.
4. **Always Jack-tap SKU assignment** until model is trained.
5. **Never upload photos with people's faces** to public store without releases.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('product-photo-organizer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'product-photo-organizer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
