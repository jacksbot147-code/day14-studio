---
name: case-study-from-customer
description: Turn a customer's launch + first-month results into a case study. 600-800 words, real numbers, real photos. Powers landing pages + sales conversations + retention.
triggers:
  - "case study"
  - "customer story"
  - "success story"
  - "/case"
---

# case-study-from-customer

> A case study is a sales asset that closes deals while you sleep.
> But only if it has real numbers, real photos, and real friction.

## Structure

```
1. Headline (one specific result)
   "How splash-jacks-pools added 14 customers in 30 days post-launch"

2. The customer (60-80 words)
   Who they are, what they do, why they came to Day14

3. The challenge (80-120 words)
   What was broken before — be specific, name the friction

4. The build (120-180 words)
   What got built — features, decisions, why
   Include 2-3 screenshots / photos

5. The results (100-150 words)
   ACTUAL NUMBERS:
   - Before vs after lead count
   - Conversion rate before/after
   - Time-to-quote before/after
   - Customer's own words (pull quote)

6. The customer's words (50-80 words)
   Direct quote, attributed, with photo of customer
   No glowing fluff — specific, real

7. CTA (40-60 words)
   "Book a similar build" / "See the live site"
```

## Hard rules

1. **Always get customer's written approval** before publishing. Email screenshot is enough.
2. **Always include real numbers.** "Significantly improved" → DEAD. "From 4 leads/wk to 27/wk" → ALIVE.
3. **Always include 1-2 photos.** Stock photos kill credibility instantly.
4. **Never embellish.** If results were modest, find the angle that's honest.
5. **Always show the build, not just the result.** Screenshots > prose.
6. **Always link to the live site.** If site is taken down or changed, story dies.
7. **Cap claims at what customer would say in court.** If they wouldn't testify to it, don't write it.

## Output

```
✓ Case study drafted: case-study-splash-jacks-pools.md

  Headline: "From 4 leads/wk to 27/wk in 30 days"
  Words: 712
  Sections: 6
  Photos: 4 (logo, before-site, after-site, jack's photo)
  Customer quote: 67 words, attributed, photo-included
  Customer approval: pending (email queued)

  Path: ~/Documents/businesses/day14/content/case-studies/splash-jacks-pools.md
  
  Action: send approval email to customer, then publish.
```

## Inputs

- `customer_slug` (required)
- `time_window_days` (default 30 post-launch)
- `result_focus` (leads | revenue | time-saved)

## When invoked

- 30 days post-customer-launch (auto-trigger)
- After a customer review hits 5 stars
- `/case {slug}` Telegram command
- Inside `upgrade-nudge-detector` (use as upsell asset)

## Failure modes

- **No measurable results** (too early or no analytics wired): defer 30 days
- **Customer declines to be featured**: archive draft, never publish

## Logging

`[YYYY-MM-DD HH:MM ET] case-study-from-customer → customer: {slug}, words: {N}, photos: {N}, approval_status: {pending|approved|declined}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('case-study-from-customer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'case-study-from-customer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
