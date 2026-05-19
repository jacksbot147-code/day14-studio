---
name: tiktok-caption-writer
description: Write the in-app caption for a TikTok post. 100-150 chars, hook-first, includes 2-3 tags. Different voice than IG/YT — TikTok rewards stake-in-the-ground takes.
triggers:
  - "tiktok caption"
  - "tiktok post"
  - "caption for tiktok"
pack: video-social
---

# tiktok-caption-writer

> TikTok caption ≠ Instagram caption ≠ YouTube title.
> Different voice, different optimal length, different conventions.

## TikTok caption rules

- 100-150 chars (longer hurts reach)
- First line must hook (no "hey guys today we're going to talk about...")
- Strong opinion / spicy take outperforms neutral
- 2-3 hashtags max — niche + broad mix (#poolservice + #fyp)
- Include a question to drive comments (engagement = reach)
- NO em-dashes (looks AI-written)

## Output

3 variants, ranked by predicted engagement:

```
A: "Your pool guy probably skipped the salt cell. Here's how to tell. #poolservice #fyp #swfl"
B: "3 lies pool service companies tell SWFL homeowners. #2 is the worst."
C: "Pool turning green in 2 days? Check this BEFORE adding chlorine. #fyp"
```

## Hard rules

1. **Never write "in this video we'll"** — kills retention.
2. **Never use "link in bio"** in caption — algorithm de-prioritizes.
3. **Always front-load the hook** in first 80 chars (caption truncates).
4. **Always include one question** to spark comments.
5. **Never use more than 3 hashtags** on TikTok (more = spam signal).

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('tiktok-caption-writer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'tiktok-caption-writer', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
