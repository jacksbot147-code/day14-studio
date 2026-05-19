---
name: viral-hook-rewriter
description: Take a clip's existing first-3-seconds copy → generate 5 alternate hooks optimized for retention. A/B test which hook gets best CTR + watch time.
triggers:
  - "viral hook"
  - "hook rewriter"
  - "first 3 seconds"
  - "thumbnail copy"
pack: video-social
---

# viral-hook-rewriter

> The first 3 seconds of a short video decide if it gets 100 views or 100,000.
> This skill is the hook lab.

## What it does

1. Input: clip + existing hook text
2. Generates 5 variant hooks across these styles:
   - Stake-in-the-ground claim ("Your pool guy is lying about X")
   - Curiosity gap ("This pool maintenance trick costs nothing")
   - Number list ("3 ways your pool service rips you off")
   - Personal story ("I almost lost my pool deck to this mistake")
   - Counterintuitive ("Don't shock your pool. Here's why.")
3. Predicts retention (heuristic, not magic) and ranks
4. Output: 5 hooks + recommended pick

## Hard rules

1. **Never overpromise** — clickbait that doesn't deliver tanks watch-time.
2. **Always specific > generic** — "3 mistakes" beats "some mistakes".
3. **Always test 2-3 hooks** per clip when launching new account.
4. **Never use "in this video"** in any hook — kills retention.
5. **Always front-load value** in first 3 sec — no greetings, no intros.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('viral-hook-rewriter', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'viral-hook-rewriter', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
