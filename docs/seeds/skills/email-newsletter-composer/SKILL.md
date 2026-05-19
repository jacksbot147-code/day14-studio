---
name: email-newsletter-composer
description: Compose a weekly email newsletter from the past 7 days of blog posts, customer wins, and SWFL local events. Format: scannable, 5-min read, single primary CTA. Powered by MailerLite.
triggers:
  - "newsletter"
  - "weekly email"
  - "email digest"
  - "/newsletter"
---

# email-newsletter-composer

> Newsletter open rate dies when it reads like a press release.
> The good ones read like a sharp friend's text.

## Structure (every issue)

```
Subject: {curiosity hook, < 50 chars, no emoji unless unique}
Preheader: {one-line tease that DOESN'T repeat subject}

Header (visual): Day14 logo + issue number + date

Opening (50-80 words): one personal observation from Jack's week
   — NOT "this week we shipped X" (boring)
   — YES "I almost broke production at 11 PM Thursday because..."

Section 1: What's new (one item, 60-100 words + link)

Section 2: SWFL bit (one item, 60-100 words)
   — local event, weather pattern, vertical observation

Section 3: One useful thing (60-100 words)
   — a tip, a checklist, a useful link from elsewhere

CTA (single, clear): book a call, reply with feedback, etc.

Footer: unsubscribe + reply
```

## Hard rules

1. **Single primary CTA per issue.** Multiple CTAs = no clicks.
2. **Always include a reply prompt** ("hit reply with...") — replies > clicks for relationship.
3. **Never send mid-day weekdays.** Tuesday or Thursday, 7 AM ET = best for SWFL.
4. **Always preview-text-test.** Open in inbox preview to confirm preheader renders.
5. **Subject line A/B if list > 200.** Split 20/80 for first hour.
6. **Always include 1 SWFL-specific bit.** Local relevance > generic value.

## Output

```
✓ Newsletter drafted: "Issue #14 — the storm that almost shipped"

Subject:    "Almost broke prod at 11pm Thursday"
Preheader:  "Plus: hurricane prep for pool customers"
Length:     487 words, 4 min 12 sec read

Sections:
  Opening:   Personal Thursday-night story (78 words)
  What's new: Stripe live + 8 new skills (94 words)
  SWFL bit:  Tropical storm forecast Mon (88 words)
  Useful:    Hurricane prep checklist for pool owners (104 words)
  CTA:       Reply with your pool's storm-prep state

Send: Tuesday May 20, 7:00 AM ET
Queued in MailerLite (DRAFT — not sent).
```

## Inputs

- `issue_number` (auto-increments)
- `target_day` (default: next Tuesday or Thursday, whichever is closer)

## When invoked

- Weekly via scheduled task (Friday 3 PM ET drafts; Tue/Thu 7 AM ET sends)
- `/newsletter` Telegram command
- Inside `content-calendar-orchestrator`

## Failure modes

- **No customer wins this week**: surface SWFL bit + tip + skip wins section
- **MailerLite API failure**: save draft locally + queue manual post

## Logging

`[YYYY-MM-DD HH:MM ET] email-newsletter-composer → issue: {N}, words: {N}, sections: {N}, subject: "{first 30 chars}"`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('email-newsletter-composer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'email-newsletter-composer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
