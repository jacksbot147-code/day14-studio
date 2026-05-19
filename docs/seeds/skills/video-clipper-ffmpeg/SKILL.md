---
name: video-clipper-ffmpeg
description: Take a long video file, identify clip moments (silence detection, scene cuts, manual timestamps), output N short clips. FFmpeg under the hood. Foundation of the video pipeline.
triggers:
  - "clip video"
  - "video clipper"
  - "cut video"
  - "highlights from video"
pack: video-social
---

# video-clipper-ffmpeg

> One 30-minute video → 8-15 clips for socials.
> This skill turns the raw file into shippable assets.

## What it does

1. Input: path to long video file (.mp4/.mov/.mkv)
2. Auto-detect clip points via:
   - Silence detection (gaps > 1.5s)
   - Scene change (FFmpeg `scenedetect`)
   - Manual timestamps from a sidecar .txt
3. Output: N clips at `{input}-clips/clip-{NN}.mp4`
4. Each clip: 30-90 sec, lossless cut (no re-encode when possible)
5. Generates a metadata JSON: `{clip, start_sec, end_sec, hook_text}`

## Hard rules

1. **Never re-encode if cut on keyframe** (preserves quality).
2. **Always preserve audio** at 48kHz.
3. **Max clip length: 90 sec** (social platforms cap there).
4. **Min clip length: 15 sec** (otherwise not enough hook).
5. **Always output metadata.json** for downstream skills to use.

## Dependencies

`brew install ffmpeg` (one-time setup)

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('video-clipper-ffmpeg', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'video-clipper-ffmpeg', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
