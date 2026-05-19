---
name: social-cross-post
description: Adapt a single blog post into platform-tuned versions for LinkedIn, Twitter/X, Threads, Facebook. Each adapted to its native voice + format. Schedules per-platform optimal times.
triggers:
  - "cross-post"
  - "social repost"
  - "share on socials"
  - "/cross"
---

# social-cross-post

> Reposting the same text everywhere = lazy + ineffective.
> Adapting per platform = 3-5x engagement.

## Platform adaptations

| Platform | Format | Length | Tone | CTA placement |
|---|---|---|---|---|
| LinkedIn | Story → insight | 1200-1500 chars | Professional + personal | End, soft |
| Twitter/X | Thread | 5-9 tweets | Punchy, opinion | First tweet pin |
| Threads | Conversation starter | 300-500 chars | Casual, opening Q | Mid-post |
| Facebook | Community share | 500-800 chars | Warm, helpful | End, clear |
| Instagram | Carousel-script | 5-7 slides | Visual-first | Slide 7 |

## Hard rules

1. **Never auto-publish.** Each platform queues for Jack tap.
2. **Always strip "Read more on the blog →" CTAs from LinkedIn first 80%.** LinkedIn de-ranks external links in the first part.
3. **Always tune the hook per platform.** LinkedIn = story. Twitter = sharp claim. Threads = question.
4. **Never schedule outside the platform's active hours** for SW Florida audience (mostly 6-9 AM ET and 6-9 PM ET).
5. **Always preview before queueing.** Generate the actual post, not the template.

## Output

```
✓ 4 platform versions ready for: "Choosing a pool service in SWFL"

LinkedIn (1,234 chars): personal observation → 3 things to know → CTA
Twitter/X (7 tweets): hook → 5 specifics → CTA
Threads (387 chars): opening Q → 2 specifics → invite to discuss
Facebook (612 chars): community framing → tips → CTA

Schedule recommendations:
  LinkedIn: Mon 7:30 AM ET
  Twitter:  Tue 8:15 AM ET
  Threads:  Wed 6:45 PM ET
  Facebook: Thu 7:00 AM ET

All 4 queued for Jack approval.
```

## Inputs

- `source_url` (blog post URL or path)
- `platforms` (array, default all 4)
- `target_day` (Mon, Tue, etc.)

## When invoked

- After `blog-post-generator` publishes (auto-suggest)
- `/cross {url}` Telegram command
- Inside `content-calendar-orchestrator`

## Failure modes

- **Source content too short for thread**: skip Twitter thread, generate single tweet
- **Platform API access not configured**: queue as draft for Jack to manually post

## Logging

`[YYYY-MM-DD HH:MM ET] social-cross-post → source: "{title}", platforms: {N}, scheduled_for: {date}, total_chars: {N}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('social-cross-post', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'social-cross-post', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
