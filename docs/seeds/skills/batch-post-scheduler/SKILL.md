---
name: batch-post-scheduler
description: Schedule N posts across TikTok / IG Reels / YT Shorts / X / FB for the week. Single submission → distributed posts. Tracks performance per platform per post.
triggers:
  - "schedule posts"
  - "batch schedule"
  - "post calendar"
  - "queue posts"
pack: video-social
---

# batch-post-scheduler

> 1 idea + 1 video = 4 platform posts.
> Manual cross-posting is the highest-friction part of social.
> This skill collapses it.

## What it does

1. Input: a directory of ready-to-post assets:
   ```
   {clip-folder}/
     ├── vertical.mp4
     ├── thumbnail.jpg
     ├── captions/
     │   ├── tiktok.txt
     │   ├── ig-reel.txt
     │   ├── yt-shorts-title.txt
     │   ├── yt-shorts-description.txt
     │   └── x.txt
     └── post-schedule.json
   ```
2. Reads post-schedule.json:
   ```json
   {
     "tiktok": "2026-05-19T12:00:00-04:00",
     "ig_reel": "2026-05-19T18:00:00-04:00",
     "yt_shorts": "2026-05-20T09:00:00-04:00",
     "x": "2026-05-20T07:30:00-04:00"
   }
   ```
3. Queues each platform via its API (or via Buffer/Later if no native API)
4. Tracks status: queued → posted → engagement_tracked

## Hard rules

1. **Always stagger posts** across days (over-posting in 1 day = algorithm penalty).
2. **Never post the same content within 1 hour** across platforms — looks spammy.
3. **Always pre-fill captions** before scheduling (don't queue blanks).
4. **Always queue Jack-tap** for first 5 posts to a new account (avoids brand drift).
5. **Always log per-post analytics** at +24hr and +7d for analytics-rollup.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('batch-post-scheduler', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'batch-post-scheduler', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
