---
name: inbound-classifier
description: When a customer email lands at hello@day14.us, route it to the right action — scope question, change request, complaint, general chatter, payment, launch question. Drafts a reply in Day14 voice, queues it for Jack's approval. Invoked by the Resend inbound webhook at day14.us/api/webhooks/inbound.
triggers:
  - "inbound email"
  - "customer reply"
  - "classify message"
  - "Resend webhook"
  - "hello@day14"
---

# inbound-classifier

> Every customer email lands here first. The job: classify the message,
> route it to the right downstream action, draft Jack's reply.
> Jack reviews + sends. Never auto-send.

## The 6 classifications

Every inbound message gets exactly one tag from this list:

| Tag | What it means | Downstream action |
|---|---|---|
| `scope-question` | Customer asking for clarification about deliverable | Draft reply that points at the SOW or intake |
| `change-request` | Customer wants something different | Draft an approval card with the proposed change + preview |
| `complaint` | Customer is unhappy with something | P0 — draft apology + proposed fix, SMS Jack if Twilio wired |
| `general` | Small talk, acknowledgment, "thanks" | Draft a 1-line friendly reply |
| `payment` | About invoicing, billing, refunds | Surface to Jack — don't auto-draft money-related responses |
| `launch-question` | About going live, domain cutover, post-launch issue | Reference the launch checklist + draft specific reply |

If a message could fit two tags, pick the one with the higher
operational stakes (complaint > change-request > scope-question > general).

## Classification signals

For each tag, look for these signals in the inbound text:

### scope-question
- "what does X include"
- "is Y part of this"
- "can you also"
- references to features in the SOW

### change-request
- "can you change"
- "I want X instead of Y"
- "make this Z"
- specific UI/copy/feature edits

### complaint
- frustrated tone (multiple exclamation points, ALL CAPS, "this is unacceptable")
- "I'm not happy"
- "this isn't what I asked for"
- threat of refund/lawyer/review
- delays cited specifically

### general
- "thanks"
- "got it"
- "looking forward to"
- short messages without a specific ask

### payment
- "invoice"
- "refund"
- "deposit"
- "Stripe"
- "charge"
- dollar amounts

### launch-question
- "go live"
- "cutover"
- "DNS"
- "production"
- "when can my customers"
- date-specific questions about launch

## Confidence scoring

Always include a confidence score 0.0–1.0 with the classification:

- **0.9–1.0:** Unambiguous signal. Multiple matches.
- **0.7–0.89:** Strong signal but one-shot.
- **0.5–0.69:** Ambiguous; took best guess.
- **<0.5:** Don't classify. Tag as `needs-human-review` and surface
  to Jack directly.

## Output: append to dossier 04-feedback.md

For each inbound message, append to the customer's `04-feedback.md`:

```
## Entry — {timestamp}

**From:** {sender_email}
**Subject:** {subject}
**Classification:** {tag}
**Confidence:** {0.0-1.0}

### The message
> (quoted verbatim, never paraphrased — preserve formatting)

### Draft reply (for Jack to send)

*To: {sender_email}*
*Subject: Re: {subject}*

(draft body in day14-voice — short, specific, no buzzwords)

— Jack
Day14

### Any action this triggers
- (e.g., "draft an approval card to change hero photo")
- (e.g., "no action — pure acknowledgment")
- (e.g., "flag P0 — operator SMS sent")
```

## Reply-drafting rules

Always invoke **day14-voice** for the draft. Per-tag specifics:

### scope-question replies
- Quote the relevant SOW section verbatim
- Short answer first, expansion second
- "Yes, that's covered" / "No, that's outside the scope, but..."

### change-request replies
- Don't commit to the change in the reply
- Say "drafting a preview of that change now"
- Mention the approval card is coming

### complaint replies
- Acknowledge specifically (don't generic-apologize)
- State the fix you're proposing, not the apology
- One sentence of empathy max — Jack doesn't grovel

### general replies
- One line. Maybe two.
- "Thanks, on it" is a complete reply

### payment replies
- DO NOT draft — surface to Jack directly
- Money decisions are operator-only

### launch-question replies
- Reference the launch checklist in 05-launch.md
- Give specific dates if known
- Don't promise dates that aren't in 05-launch.md

## Boundaries — what you NEVER do

1. **Never auto-send.** Every draft goes to 04-feedback.md for Jack
   to review.
2. **Never draft a payment-related reply.** Tag as `payment` and stop.
3. **Never make a scope concession in a reply** ("sure, we can add X
   for free"). Surface scope-creep risks to Jack as an approval card.
4. **Never threaten or warn** the customer in any reply.
5. **Never copy any external party** (lawyer, CC chains) on a draft.

## Failure modes

- **Spam / phishing:** if the inbound message doesn't reference Day14
  or a known customer, tag as `general` with confidence 0.3 and let
  Jack triage.
- **Message in a language other than English:** flag as
  `needs-human-review` and don't draft.
- **Auto-reply / vacation responder:** tag as `general`, no draft
  needed.
- **Message references a customer that doesn't exist in our records:**
  flag as `needs-human-review`.

## Logging

After classifying, append to MASTER_LOG:
`[YYYY-MM-DD HH:MM ET] inbound-classifier COMPLETE → {customer-slug}/04-feedback.md, tag: {tag}, confidence: <0.0-1.0>`

If the classification was `complaint`, also append an alert line:
`[YYYY-MM-DD HH:MM ET] ⚠️ complaint from {customer-slug} — see 04-feedback.md`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('inbound-classifier', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'inbound-classifier', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
