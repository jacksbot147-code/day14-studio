---
name: youtube-shorts-caption-writer
description: Write the YouTube Shorts title + description. Title is CRITICAL (CTR driver). Description is searchable but secondary. 100-char title, ~500-char description.
triggers:
  - "youtube shorts"
  - "shorts title"
  - "yt shorts caption"
pack: video-social
---

# youtube-shorts-caption-writer

> YouTube Shorts title is searchable AND determines thumbnail click-through.
> It's the most-leveraged text in the whole pipeline.

## YouTube Shorts rules

### Title (100 chars max, 50-60 ideal)
- Curiosity-first
- Include the niche keyword
- Question form often wins
- Numbers in title work ("3 mistakes", "top 5")

### Description (~500 chars)
- First 2 lines visible (rest behind "show more")
- Include channel niche keywords
- 1-3 hashtags at bottom (#Shorts + niche)
- Link to long-form version if relevant

## Output

```
Title: 3 Pool Maintenance Mistakes Most SWFL Homeowners Make
Description:
If your pool turns green in 2 days, you're probably doing #2 wrong.

Full breakdown: youtube.com/watch?v=...

#Shorts #PoolService #SWFL
```

## Hard rules

1. **Always include "#Shorts"** — categorization matters for distribution.
2. **Never duplicate title and description verbatim** — looks spammy.
3. **Always link to long-form** if it exists (drives subs).
4. **Limit hashtags to 3** — beyond that, no boost.
5. **Always tag the video as #Shorts** in YT Studio after upload (belt-and-suspenders).

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('youtube-shorts-caption-writer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'youtube-shorts-caption-writer', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
