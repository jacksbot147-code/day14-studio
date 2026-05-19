---
name: instagram-reel-caption-writer
description: Write the in-app caption for an Instagram Reel. 200-2200 chars (longer is fine here). Story-first, no hashtag spam, includes CTA.
triggers:
  - "instagram caption"
  - "reel caption"
  - "ig caption"
pack: video-social
---

# instagram-reel-caption-writer

> Instagram rewards story-driven captions, especially with line breaks.
> Different rhythm from TikTok.

## IG Reel caption rules

- 200-500 chars is the sweet spot
- First line is the hook (same as TikTok)
- Use line breaks generously (one thought per line)
- Hashtags go in first comment, NOT caption (cleaner look)
- Include CTA: "save this for later" or "share with someone who needs this"
- Em-dashes OK on Instagram — looks editorial, not AI

## Output

```
[hook line — short, surprising]

[mid section — 2-3 paragraphs of value]

[CTA — what to do next]

. . . . . [hashtag block in first comment, not here]
```

## Hard rules

1. **No hashtags in caption itself** — first comment.
2. **Always include a save-CTA** ("save this") — saves boost Reach more than likes.
3. **Always preview line breaks on mobile** — IG renders them oddly sometimes.
4. **Never copy-paste from TikTok** — different audience, different voice.
5. **Always include @-mentions** if quoting/featuring someone.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('instagram-reel-caption-writer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'instagram-reel-caption-writer', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
