---
name: morning-headline-format
description: The universal shape for any morning-side digest or status doc — bold one-line headline, single "first action" line, view-links at the top. Codifies the pattern observed across daily-kickoff, wakeup-status, morning-briefing across multiple tenants.
triggers:
  - "morning headline"
  - "digest format"
  - "wakeup status"
---

# morning-headline-format

> Every morning artifact across Day14, Splash Jacks, Casamoré, Empire
> follows the same shape. Without it, Jack has to read 50 lines to
> find the action. With it, he reads 3 lines, then 2-tap the action.

## The required top 3 lines

```
*{Headline — 6-10 words, bold, what's new and what matters}*

First action: {one specific verb-led line, < 15 words}

Files: [view this](computer://path) · [view that](computer://path)
```

That's the FIRST 3 LINES of any morning doc. Below the fold, more detail can follow.

## Examples

### Daily kickoff
```
*Empire stable; Day14 Vercel deploy pending env vars*

First action: Paste new Supabase secret key into Vercel env vars (~3 min).

Files: [today's kickoff](computer:///path) · [yesterday's EOD](computer:///path)
```

### Wakeup status (after overnight run)
```
*4 overnight tasks complete, 1 blocker on Resend domain*

First action: Approve Resend DKIM record (Vercel DNS tab).

Files: [morning briefing](computer:///path) · [overnight log](computer:///path)
```

### Failure case (don't sugarcoat)
```
*0-ship day yesterday — Stripe webhook still failing*

First action: Re-test the Stripe webhook locally (signature still mismatched).

Files: [postmortem](computer:///path) · [error log](computer:///path)
```

## Hard rules

1. **The headline is one line.** Not two. Bold. Sentence case.
2. **The "first action" is verb-led** ("Paste...", "Approve...", "Re-test..."). No "consider" / "think about" / "review."
3. **The files section is ≤3 links.** More = visual clutter. Anything beyond the top 3 lives in a "Full briefing" link.
4. **The "first action" exists even on bad days.** If the day is blocked, the action is "unblock {what}."
5. **No emoji in the headline.** Reserved for severity/state in body.

## How to invoke

Before writing any of these doc types, call this skill first:
- daily-kickoff output
- morning briefing (overnight summary)
- weekly-council-review output
- post-storm-damage-assessor report
- empire-daily-build outputs (for any tenant)

The skill formats the top 3 lines; the writing skill handles body.

## Failure modes

- **No clear single "first action"** → the doc isn't ready. Pause writing; identify what should happen first.
- **Headline keeps wanting to be 15 words** → split. Top-line is the conclusion; reasons go in body.
- **More than 3 files matter** → pick the 3 highest-leverage; mention "+N more" with link to file list.

## When invoked
- Inside any morning-cycle skill (daily-kickoff, post-storm-damage-assessor, etc.)
- Manually when authoring a one-off briefing for Jack

## Logging
`[YYYY-MM-DD HH:MM ET] morning-headline-format → doc: {type}, headline_chars: {N}, files_linked: {N}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('morning-headline-format', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'morning-headline-format', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
