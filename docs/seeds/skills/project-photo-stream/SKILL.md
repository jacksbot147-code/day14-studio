---
name: project-photo-stream
description: Daily photo upload from job site → tagged + timestamped → customer dashboard. Triples customer satisfaction during builds.
triggers:
  - "job site photo"
  - "daily photos"
  - "build photos"
pack: project-pipeline
---

# project-photo-stream

> Customers checking up on the project = friction.
> Daily photos = customers stop calling. They watch progress.

## Flow

1. Crew uploads photos via Telegram bot or email to dedicated address
2. Skill auto-tags: project_id, date, milestone-in-progress
3. Watermarks (optional) and resizes
4. Pushes to project dashboard customer can see
5. Customer gets daily push notification: 'New photos for your project'

## Hard rules

1. **Always preserve EXIF date** for chronological accuracy.
2. **Always strip GPS** before publishing publicly.
3. **Max 5 photos per day per project** — quality > volume.
4. **Always queue Jack-tap if customer is in dispute** — photos can be evidence.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('project-photo-stream', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'project-photo-stream', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
