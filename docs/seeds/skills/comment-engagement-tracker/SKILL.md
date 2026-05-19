---
name: comment-engagement-tracker
description: Pull comments from posted videos across platforms. Surface high-engagement threads. Suggest replies. Spike alerts on negative sentiment. Drives community velocity.
triggers:
  - "comments"
  - "engagement"
  - "reply to comments"
  - "comment tracker"
pack: video-social
---

# comment-engagement-tracker

> Comments = the algorithm's #1 signal for what to push.
> Replying within 1 hour boosts that signal further.

## What it does

1. Polls each platform's API for new comments on recent posts
2. Classifies:
   - Question (priority — reply within 1hr)
   - Praise (acknowledge with emoji + ❤️)
   - Negative / complaint (escalate to Jack)
   - Spam (auto-delete if permission allowed)
3. Drafts reply for each non-spam comment
4. Queues to Jack as approval card: original + draft reply

## Hard rules

1. **Always reply to questions within 1 hour** if possible (algorithm goldmine).
2. **Always acknowledge praise** — but vary the response (no canned).
3. **Never argue with negative comments publicly** — DM if needed.
4. **Never auto-reply** — looks robotic, kills trust.
5. **Always check engagement spikes** — sometimes a single comment goes viral and needs amplification.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('comment-engagement-tracker', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'comment-engagement-tracker', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
