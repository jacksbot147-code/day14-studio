---
name: linkedin-thought-leadership-post
description: Compose a LinkedIn thought-leadership post around a specific learning or counterintuitive take. Story → insight → invitation. ~1200 chars. Drives B2B-side Day14 inbound.
triggers:
  - "linkedin post"
  - "thought leadership"
  - "linkedin story"
  - "/li"
---

# linkedin-thought-leadership-post

> LinkedIn rewards stories that end with a question. Insights that
> challenge consensus. Specifics, not platitudes.

## Structure

```
Hook (1 line, all caps allowed): a surprising claim or question
[blank line]
Story (60-100 words): a specific moment from this week
   — date / place / who was there
   — the friction or surprise
[blank line]
Insight (40-60 words): what you learned
   — counterintuitive is best
   — must be specific, not "communication matters"
[blank line]
Application (30-40 words): how to use it
[blank line]
Invitation: open question for comments
```

## Hard rules

1. **Never use AI-stink phrases**: "Let me share", "Here's a thought", "What if I told you..."
2. **Always start with a hook line that stands alone.** If reading just the first line wouldn't make me want line 2, rewrite.
3. **Always include specifics.** "Last Thursday at 11 PM I almost broke production" > "Recently I made a mistake".
4. **Never include 5+ hashtags.** 2-3 max, and only relevant. Hashtag spam = de-ranked.
5. **Always end with a real question.** Not rhetorical. Actually want answers.
6. **Never use bullet lists in LinkedIn.** Solid paragraphs only.
7. **Always count to 1,300 chars.** LinkedIn's "see more" cuts at ~1,200; first 1,200 must be self-contained.

## What this skill does

1. Takes a "moment" input (or pulls from work-register entries with notes)
2. Generates 3 variants:
   - Story-first
   - Insight-first
   - Question-first
3. Voice-drift checks each
4. Queues all 3 to Jack for selection

## Output

```
✓ 3 LinkedIn variants for moment: "almost broke prod at 11pm Thursday"

Variant A (story-first, 1,247 chars):
  Hook: "Almost shipped a bug to production at 11pm Thursday."
  Story: ...

Variant B (insight-first, 1,189 chars):
  Hook: "The most expensive mistakes happen at 11pm."
  ...

Variant C (question-first, 1,156 chars):
  Hook: "When was the last time you almost shipped a disaster?"
  ...

All 3 voice-drift < 0.2 ✓
Queued for Jack pick.
```

## Inputs

- `moment` (free text, 1-3 sentences)
- `category` (mistake | win | observation | counterintuitive)

## When invoked

- After a notable work-register entry (auto-suggest)
- `/li {moment}` Telegram command
- Weekly via scheduled task (Wed 6 PM ET, before Thu morning post)
- Inside `content-calendar-orchestrator`

## Failure modes

- **Moment too vague**: ask for specifics
- **Voice drift > 0.3 on all 3**: regenerate with hand-picked style examples

## Logging

`[YYYY-MM-DD HH:MM ET] linkedin-thought-leadership-post → moment: "{first 8 words}", variants: 3, chosen: {A|B|C|none}, drift: {avg}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('linkedin-thought-leadership-post', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'linkedin-thought-leadership-post', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
