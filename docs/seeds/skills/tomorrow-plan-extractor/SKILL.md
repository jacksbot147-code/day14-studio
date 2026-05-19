---
name: tomorrow-plan-extractor
description: Read today's events + pending approvals + build log to produce a one-sentence "tomorrow's plan" line for the EOD email. Specific, dated, achievable. Supporting skill for eod-update-writer.
triggers:
  - "what's tomorrow"
  - "tomorrow plan"
  - "next steps"
  - "what's next"
---

# tomorrow-plan-extractor

> Customer reads the EOD email. The most-important sentence is the
> last one: "Tomorrow: {X}." This skill writes that X.

## Input
- Customer slug
- Today's date
- Optional: customer's calendar / Cal.com availability

## The source data

Read in order:

1. **Build runbook for this customer's SKU** — what's the typical day-N work?
   - Day 2-4: design polish, content fill-in
   - Day 5-7: integration wiring (Stripe, Resend)
   - Day 8-10: QA, customer feedback loop
   - Day 11-13: production prep
   - Day 14: launch

2. **Today's pending approval cards** — anything blocking tomorrow?

3. **Today's customer messages** — anything they asked for that's queued?

4. **Build agent's `02-build-log.md` "What's pending" section** — explicit handoff

## The output

A single sentence, 8-18 words, in day14-voice. Examples:

Good:
- "Tomorrow: hero photos from your uploads, plus the case-study section."
- "Tomorrow: wiring Stripe webhooks. Then we test with a $1 transaction."
- "Tomorrow: DNS records prep, then we cut the production domain over Friday morning."

Bad:
- "Tomorrow we'll continue working on improvements." (no specifics)
- "Tomorrow: many things." (vague)
- "Tomorrow I'll work on more features and updates to the site." (no commitments)

## Specificity test

Before output, run this check: could the customer write back tomorrow with "did you do X?" where X is the specific thing? If yes, the plan is specific enough. If no, rewrite.

## When tomorrow is blocked

If the agent's pending list is empty or fully blocked-on-customer:
- "Tomorrow: waiting on the photos you mentioned. Once those land, I'll wire them into the hero section that morning."
- "Tomorrow: pause day — waiting on your DNS host login. Send when you have a sec."

These are honest. The customer needs to know what their input is for.

## When tomorrow is launch day

Special handling for the day-13 EOD email (one day before launch):

> "Tomorrow: launch day. Production cutover at {time ET}. I'll text you the moment your site is live."

Tone shifts to milestone-aware.

## Hard rules

1. **Never promise more than 1 day of work** in the tomorrow plan. If 3 things are queued, lead with the most-customer-visible one; the rest goes in Day +2's plan.
2. **Never re-state today's work** as tomorrow's plan.
3. **Never use "we'll see" or "depending on"** — those are non-plans. Either commit or surface the blocker.
4. **Always end with the specific deliverable** — what the customer can expect when.

## Logging

`[YYYY-MM-DD HH:MM ET] tomorrow-plan-extractor → customer: {slug}, plan: {one-line, max-18-words}, specificity_score: {1-5}`

If specificity_score < 3, re-run the extraction with more weight on the build runbook's day-N expectations.

## When invoked
- Inside `eod-update-writer` for every EOD email (mid-build customers)
- Inside `daily-eod` skill (for Jack's own end-of-day report)
- Never for launched / archived customers
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('tomorrow-plan-extractor', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'tomorrow-plan-extractor', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
