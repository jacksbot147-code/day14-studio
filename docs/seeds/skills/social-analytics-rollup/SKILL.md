---
name: social-analytics-rollup
description: Daily/weekly rollup of social performance across all platforms. Top posts, worst posts, follower growth, engagement rate, best posting times. Surfaces what's working.
triggers:
  - "social analytics"
  - "performance rollup"
  - "social stats"
  - "engagement report"
pack: video-social
---

# social-analytics-rollup

> Most creators check stats per-platform. This skill aggregates them
> and tells you what's working without you having to dig.

## What it does

1. Daily 8 PM ET: pull per-platform analytics:
   - Followers (current vs 7d ago)
   - Posts in last 7d
   - Views per post (avg, top, worst)
   - Engagement rate (likes+comments+shares / views)
   - Best-performing post (and why — hook, timing, topic)
   - Worst-performing post (and lesson — too long, weak hook, etc.)
2. Identifies trends:
   - Best posting time (audience active hours)
   - Best content type (which template format wins)
   - Topics that consistently perform
3. Writes report to `~/Documents/businesses/{tenant}/social/reports/{date}.md`

## Hard rules

1. **Always show 7-day trend** in addition to all-time.
2. **Always identify ONE thing working + ONE thing to fix** — don't dump 50 metrics.
3. **Always tie posts to clips** (so we know which source video performed best).
4. **Never compare across platforms** in absolute numbers (TikTok views > IG views always).
5. **Always queue weekly to Telegram** as a P3 summary.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('social-analytics-rollup', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'social-analytics-rollup', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
