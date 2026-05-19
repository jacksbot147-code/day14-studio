---
name: lead-first-touch-personalizer
description: When a lead form gets submitted on a Day14 customer's site, draft the first response. Personalized to the specific question, vertical, and customer's voice. Drafts within 30 seconds of submission so Jack (or the customer) can review and send.
triggers:
  - "lead form"
  - "contact form"
  - "new lead"
  - "first touch"
  - "lead arrived"
  - "form submission"
---

# lead-first-touch-personalizer

> Lead reply speed is the #1 conversion factor for SWFL service
> businesses. Customer-typed-from-scratch replies take 30-60 min.
> A drafted reply gets to Jack in 30 seconds.

## Inputs

When a lead form posts, capture:

```yaml
business_slug: <which customer's site received the lead>
business_vertical: <mobile-service | membership | food | custom>
form_fields:
  name: "First Last"
  email: "..."
  phone: "..."
  service_interest: "..."  # what they checked / selected
  message: "..."           # free-text if any
  source_page: /contact    # which page they submitted from
  utm_campaign: <if any>
submitted_at: timestamp
```

## Output

Draft saved to the customer's dossier:
`~/Documents/businesses/day14/customers/{slug}/04-feedback.md`
under section "## Lead — {timestamp}"

Plus an approval card (via `approval-card-builder`) titled:
`First-touch reply — {lead name}`

## Draft structure

3 parts, plain text, ~80-150 words total:

### Part 1 — Acknowledge specifically (1-2 sentences)
- Use their name
- Reference the specific service they asked about (NOT generic "your inquiry")
- Confirm you received the message

### Part 2 — Answer or next step (1-2 sentences)
- If they asked a question that has a simple answer → answer
- If it needs a quote → say what's needed for a quote
- If it needs a site visit → propose a window

### Part 3 — Soft close (1 sentence)
- Direct phone number for fastest response
- Specific time you'll get back to them if they wait

## Per-vertical tuning

### Mobile-service (pool, lawn, AC, etc.)
- Common asks: quote for service, problem diagnosis, scheduling
- Default response: confirm + ask 2-3 qualifying questions OR propose site visit

Example for "Pool service quote — 12,000 gallon pool, salt":

> Got your message, {first_name}.
>
> For a 12k-gallon salt pool, weekly service runs $145/mo (chemistry,
> brush, vacuum, equipment check). One-time first visit is $95 for the
> setup audit.
>
> Easiest path: text me a photo of your pool + equipment. I can quote
> exactly + book your first visit this week.
>
> — {tech_or_owner_first_name}
> {business_phone}

### Membership (gym, yoga, salon)
- Common asks: class schedule, pricing, trial offers
- Default: send schedule + offer first-visit special if they're new

### Food (restaurant, food truck)
- Common asks: catering inquiry, event booking, large reservation
- Default: ack + send menu + propose date range

## Voice

Use Day14 customer's voice — every Day14 customer has a `brand.json`
with their own voice notes. If brand.json doesn't include voice
notes, default to `day14-voice` (operator, plain English, no
exclamation points).

## Speed targets

- **Draft within:** 60 seconds of form submission
- **Approval card filed within:** 90 seconds
- **Jack sends within:** ideally 5 min during business hours, 1 hour after-hours
- **Customer response window:** 24 hours to be considered "responsive"

If business is in `feature_flags.storm_mode: true`, auto-reply with
"We're in storm-mode, will respond within 48h" template instead.

## Auto-classification of lead quality

Append a score to the internal log:

| Score | Signal |
|---|---|
| **Hot** | Specific service + budget + timeline mentioned |
| **Warm** | Specific service mentioned but vague timeline |
| **Cold** | Generic "more info" with no specifics |
| **Spam** | Form submitted by bot / unrelated to business |

Hot/warm: surface as P1 approval. Cold: P2. Spam: auto-archive without draft.

## Hard rules

1. **Never auto-send.** Drafts only. Customer's brand depends on their voice; agent might mismatch.
2. **Never promise specific pricing** unless `brand.json` includes a `published_pricing` flag.
3. **Never schedule appointments without checking availability** (which we don't have unless Cal.com is wired per-customer).
4. **Never reply to spam** — adds to deliverability problems.
5. **Never copy a previous reply verbatim across leads** — each reply must reference the specific lead's words.

## Failure modes

- **Lead form had no email/phone:** unable to reply. Surface to Jack for triage.
- **Multiple submissions from same person in 5 min:** classify as urgent, surface as P0.
- **Lead message in language other than English:** flag as `needs-human-review`, don't draft.
- **Form submission appears to be spam (random text, suspicious email):** auto-archive, log for spam-filter tuning.

## Logging

Append to MASTER_LOG:
`[YYYY-MM-DD HH:MM ET] lead-first-touch-personalizer → customer: {slug}, lead: {lead_id}, score: {hot|warm|cold|spam}, draft_chars: N`

Track Jack's edit rate on the drafts. If >50% of drafts get edited
before send, the voice mapping is off — recalibrate `brand.json`
voice notes for that customer.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('lead-first-touch-personalizer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'lead-first-touch-personalizer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
