---
name: event-rollup-summarizer
description: Turn a noisy sequence of events into one shippable paragraph. Used by eod-update-writer when 20+ events fired today and the customer's email needs to summarize them. Compresses without lying. Supporting skill for eod-update-writer.
triggers:
  - "summarize today's work"
  - "rollup events"
  - "compress activity"
  - "today's summary"
---

# event-rollup-summarizer

> 23 events fired today. The customer email is one paragraph.
> Something has to compress. This skill does it without losing
> what matters.

## Input
- Customer slug
- Date range (typically today's 8am-5pm)
- Optional: max output length (default 80 words)

## The compression algorithm

### Step 1 — fetch + cluster
Query `events` table filtered to customer + date range. Cluster events by `kind`:

| Cluster | Example kinds |
|---|---|
| **Built** | commit-pushed, feature-shipped, brand-swap-applied |
| **Deployed** | preview-ready, deploy-succeeded |
| **Communicated** | customer-email-sent, sms-delivered, approval-drafted |
| **Verified** | lighthouse-checked, link-checked, ssl-verified |
| **Blocked** | error-encountered, approval-rejected |

### Step 2 — score each cluster
Each cluster scores by:
- **Count** of events (more = more time spent)
- **Newness** (a "first" of something matters more than repeat)
- **Customer-visibility** (does the customer see/feel this?)

### Step 3 — pick the 3 most-significant clusters

Output prioritizes:
1. Customer-visible work (preview, email, etc.)
2. Blockers (so they're surfaced)
3. Built/deployed work

Skip:
- Pure-internal noise (link-check passed, lighthouse-checked passed)
- Repeat events of the same kind (cluster, don't enumerate)

### Step 4 — write 3-4 sentences

```
{Day-of-the-week} brought {high-level summary in 1 phrase}. {Specific
detail of the most-important work, with measurement if available}.
{Second-most-important specific.} {What's next — one specific thing.}
```

## Example

23 events fired:
- 8 commit-pushed
- 3 preview-ready
- 1 lighthouse-checked (passed)
- 1 approval-drafted (preview-ready email)
- 4 link-checked (passed)
- 6 misc internal

Summary output (in `day14-voice`):

> Tuesday: shipped the booking flow + connected your Stripe.
> Preview is up at acmepoolco.vercel.app — Lighthouse 92 on mobile,
> 96 on desktop. Tomorrow: hero photos from your uploads, plus the
> case-study section.

24 words. One sentence per cluster. Specific.

## Hard rules

1. **Never make up an event.** Every claim in the summary must trace to a real event row.
2. **Never use "we made great progress."** Use specifics or omit the sentence.
3. **Never include internal noise** (link-check, internal commits with no customer impact).
4. **Never exceed the max length.** If 80 words isn't enough, the customer needs a longer-form update (use `eod-update-writer` in "detailed" mode), not a rollup.
5. **Never blend events across customers.** Per-customer summaries only.

## Edge cases

- **Zero events today**: don't write a fake update. Output "{Date}: no shipped work today. {Reason if known}. Tomorrow's focus: {what}."
- **All events are blockers**: lead with that. "Tuesday: hit two blockers on the booking flow. {Specific.} Working through them tomorrow."
- **One huge event** (e.g., launch-day): override the algorithm; the summary leads with the launch.

## Logging

`[YYYY-MM-DD HH:MM ET] event-rollup-summarizer → customer: {slug}, events_in: {N}, summary_words: {N}, clusters_chosen: {names}`

## When invoked
- Inside `eod-update-writer` when daily event count exceeds 10
- Manually when Jack wants a quick "what happened today" for a customer
- Inside `daily-eod` skill to feed Jack's end-of-day kickoff
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('event-rollup-summarizer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'event-rollup-summarizer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
