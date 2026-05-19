---
name: vertical-9-16-edit-pipeline
description: Take a horizontal clip + caption JSON → output a 9:16 vertical video with dynamic captions (word-by-word highlight), face-tracking crop, optional music bed. The full short-form factory.
triggers:
  - "vertical video"
  - "9:16"
  - "short form"
  - "tiktok video"
  - "reel"
pack: video-social
---

# vertical-9-16-edit-pipeline

> Horizontal video posted vertically = death.
> This skill does the full transform: crop, captions, polish.

## What it does

1. Input: clip + caption .json + optional music bed path
2. Re-crops to 1080×1920 (9:16) with face-tracking via OpenCV
3. Burns word-level captions (highlights the current word):
   - Font: Bold sans (Inter / Anton)
   - Position: lower third
   - Color: white text, black outline, yellow highlight on current word
4. Adds music bed at -18dB (under voice)
5. Adds 0.5s fade-in/out
6. Exports to `{clip}-vertical.mp4` (H.264, 8 Mbps)

## Hard rules

1. **Never re-crop without face-tracking** — random crops cut off mouths.
2. **Always include captions** — 85% of social video is watched muted.
3. **Always check loudness norm** — target -14 LUFS for TikTok/Reels.
4. **Never use copyrighted music** — only royalty-free or licensed.
5. **Always preserve original horizontal** version too (some platforms want both).

## Dependencies

`brew install ffmpeg opencv`

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('vertical-9-16-edit-pipeline', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'vertical-9-16-edit-pipeline', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
