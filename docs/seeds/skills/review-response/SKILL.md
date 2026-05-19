---
name: review-response
description: Draft replies to Google Business / Yelp / Facebook reviews for a Day14 customer (or for Splash Jacks, Casamoré, Buildbridge directly). Tone matches the vertical and the review type. Lifted from Splash Jacks tenant; portable to any service business.
triggers:
  - "review"
  - "Google review"
  - "Yelp review"
  - "Facebook review"
  - "5 star"
  - "1 star"
  - "customer wrote"
  - "responded to review"
---

# review-response

> Reviews are public. Replies are public. A bad reply to a good
> review can hurt more than no reply at all. This skill drafts
> ones Jack (or his customer) can publish unchanged.

## Classify the review first

Tag the inbound review one of:

| Type | Signal | Tone |
|---|---|---|
| **Glowing 5-star** | "amazing", "best ever", specific praise | Warm, brief, personal |
| **Standard 4-5 star** | Positive but generic | Thank them, mention one specific |
| **Mixed 3-star** | Both positives and negatives | Acknowledge both, no defensiveness |
| **Negative 1-2 star, fair** | Specific, true complaint | Apologize without grovel, propose fix |
| **Negative 1-2 star, unfair** | Vague, hostile, factually wrong | Calm, professional, public-facing facts only |
| **Spam / off-topic** | Doesn't reference the business | Don't reply publicly; flag the review |

## Response structure (by type)

### Glowing 5-star
- 1-2 sentences max
- Reference ONE specific thing they mentioned (proves you read it)
- Sign-off with first name only

> Thanks {first_name} — really appreciate it. Glad the {specific_thing_they_mentioned} worked out for you.
>
> — {owner_first_name}

### Standard 4-5 star
- 2-3 sentences
- Thank them
- Mention one specific aspect of the work
- No upsell, no plea for another visit

### Mixed 3-star
- 3-4 sentences
- Acknowledge what worked AND what didn't
- One concrete next step for the unhappy part (don't promise miracles)
- Invite them to reply directly (offer email/phone)

> Thanks for the honest review, {first_name}. Glad the {positive} hit, sorry the {negative} didn't. Email me directly at {email} — I'd rather fix it than leave it.

### Negative 1-2 star, fair
- 3-4 sentences
- Specific apology, not "we're sorry for any inconvenience"
- The exact fix
- Direct contact (don't make them re-explain in DMs)

> {First_name}, that's on me. {Specific acknowledgment}. {Specific fix}. Text me at {phone} and I'll make it right.

### Negative 1-2 star, unfair
- 2-3 sentences MAX (length signals defensiveness)
- Stick to factual record
- Offer a one-line off-platform path to resolve
- Never argue point-by-point — readers see that as small

> Thanks for the feedback. {One-line factual statement disputing the inaccurate claim, if any}. Happy to discuss directly — call {phone}.

## Voice calibration per vertical

### Mobile-service (pool, lawn, AC, etc.)
- "We" if business has employees, "I" if owner-operator
- Reference the specific service area / route ("your house on Pine Island Rd")
- Mention the tech / chemistry / equipment by name (proves expertise)

### Membership (gym, studio, salon)
- Always first-person; warmer
- Reference the class/coach/stylist by first name
- Invite them back to a specific event/class

### Food (restaurant, food truck, catering)
- First-person; chef voice
- Reference the dish / event date
- Optionally invite them to try a different dish next time

## Hard rules

1. **Never engage with insults.** Hostile replies signal "owner is unhinged" — far worse than the original review.
2. **Never share customer data publicly.** Don't reference their address, phone, full name (first name only).
3. **Never offer compensation publicly.** "Email me for a refund" — never "I'll refund you $X" in the public reply.
4. **Never reply to reviews older than 30 days** unless instructed. Old reviews resurfacing in feed is bad signal.
5. **Never copy-paste reply templates verbatim** across reviews. Each reply must reference something specific.

## Workflow

1. New review lands (Google Business / Yelp / Facebook)
2. Customer (or Jack) flags it for response
3. This skill drafts a response
4. Customer (or Jack) reviews and either:
   a. Approves verbatim → posts
   b. Edits to add specifics only they know → posts
   c. Rejects → skill regenerates with adjusted tone

## Logging

Append to MASTER_LOG:
`[YYYY-MM-DD HH:MM ET] review-response COMPLETE → tenant: {slug}, type: {classification}, draft saved to: {path}`

If review classified as negative-unfair, also append:
`[YYYY-MM-DD HH:MM ET] ⚠️ negative-unfair review for {slug} — see {path}` (so Jack sees it in next kickoff)
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('review-response', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'review-response', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
