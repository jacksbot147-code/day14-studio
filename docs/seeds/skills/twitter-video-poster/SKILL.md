---
name: twitter-video-poster
description: Post a video to Twitter/X. 140-char tweet body. Optimal upload format. Threads work well for series. Quote-tweet your own video later for re-amplification.
triggers:
  - "tweet video"
  - "twitter video"
  - "X video post"
  - "post to twitter"
pack: video-social
---

# twitter-video-poster

> Twitter favors short clips with bold first frames.
> Tweet body matters less than the video itself.

## Rules

- Video: 1080×1920 (vertical) or 1280×720 (horizontal) both work
- Max length: 2:20 (free), 10 min (Premium)
- Tweet body: 100-140 chars including spaces; under 240 max
- First frame must hook — autoplays muted
- Quote-tweet 24-48 hours later for second wave

## Output

```
Tweet body: "Pool service tip nobody tells you: salt cells die in 3-5 yrs. Most owners pay to replace pumps instead."
Video: ./clip-vertical.mp4
Scheduled: Wednesday 8:30am ET
```

## Hard rules

1. **Never use link shorteners** — Twitter penalizes them.
2. **Always upload native video** (don't link YouTube) — algorithm prefers.
3. **Always include closed captions** (.srt file) on upload.
4. **Quote-tweet for amplification**, don't re-post the same video.
5. **Never use trending hashtags unrelated to content** — shadow-banned.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('twitter-video-poster', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'twitter-video-poster', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
