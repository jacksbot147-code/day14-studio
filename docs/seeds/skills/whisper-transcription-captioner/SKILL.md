---
name: whisper-transcription-captioner
description: Run OpenAI Whisper (locally, free) on a video file. Outputs SRT + JSON + word-level timestamps. Powers all caption/subtitle skills downstream.
triggers:
  - "transcribe"
  - "captions"
  - "subtitles"
  - "whisper"
pack: video-social
---

# whisper-transcription-captioner

> Captions raise watch-time by 40% on muted-by-default platforms.
> Whisper runs locally on Mac, no API cost.

## What it does

1. Input: video or audio file
2. Runs Whisper (model: `base` for speed, `medium` for accuracy)
3. Outputs to `{input}-caption/`:
   - `.srt` (standard subtitle file)
   - `.json` (word-level timestamps for dynamic captions)
   - `.txt` (plain transcript)
4. Punctuation cleanup: capitalize sentences, add commas

## Hard rules

1. **Use `base` model for clips < 90s** (fast: ~5s on M-series Mac).
2. **Use `medium` model for source videos** (more accurate).
3. **Always strip filler words** in plain-text output ('um', 'uh', repeated false starts).
4. **Always preserve raw transcript** in addition to cleaned version.
5. **Never auto-correct** named entities — leave them as transcribed for review.

## Dependencies

`brew install whisper-cpp` OR `pip install openai-whisper --break-system-packages`

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('whisper-transcription-captioner', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'whisper-transcription-captioner', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
