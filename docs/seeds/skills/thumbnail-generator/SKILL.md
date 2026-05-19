---
name: thumbnail-generator
description: Auto-generate YouTube thumbnails from clip frames + caption text. Picks the highest-motion frame, adds bold-text overlay, exports 1280×720. Critical for click-through.
triggers:
  - "thumbnail"
  - "youtube thumbnail"
  - "video preview image"
pack: video-social
---

# thumbnail-generator

> YouTube thumbnail = the highest-leverage 1280×720 pixels you'll make.
> Bad thumbnail = 1% CTR. Good thumbnail = 8% CTR. 8x the views.

## What it does

1. Input: clip + caption .json + optional headline override
2. Picks 5 candidate frames at 20%/40%/60%/80%/peak-motion timestamps
3. For each candidate:
   - Adds bold-text overlay (Anton font, 90pt, yellow on dark stroke)
   - Adds subtle vignette
   - Outputs 1280×720 JPG at 85% quality
4. Queues Jack tap: pick 1 of 5

## Hard rules

1. **Never use AI faces** — looks fake, hurts CTR.
2. **Always pick faces with eyes open** (use face detector + eye-aspect-ratio check).
3. **Text limited to 4 words max** — anything more is unreadable in mobile thumbnails.
4. **Never use clickbait that doesn't match content** — kills retention.
5. **Always test on mobile** — desktop thumbnail check is misleading.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('thumbnail-generator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'thumbnail-generator', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
