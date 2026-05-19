---
name: feedback-classifier
description: Classify a piece of inbound feedback (review, email, chat message, DM) into actionable category. Production-proven in Splash Jacks. Sister skill to inbound-classifier (email-specific) but covers ALL channels of customer feedback.
triggers:
  - "classify feedback"
  - "tag customer message"
  - "what kind of feedback"
---

# feedback-classifier

> `inbound-classifier` handles emails. `review-sentiment-scorer`
> handles reviews. This skill is the unified front door — what KIND
> of customer signal just arrived?

## Input

A piece of feedback from any channel:
- Email (handled by `inbound-classifier` downstream)
- SMS (Twilio)
- Chatbot conversation (the floating widget)
- Google / Yelp / Facebook review (handled by `review-sentiment-scorer` downstream)
- Instagram DM
- In-person verbal feedback (transcribed by Jack)

## Categories (one of)

| Tag | Examples | Downstream skill |
|---|---|---|
| `scope-question` | "is X included?" | inbound-classifier OR direct reply |
| `change-request` | "make the hero bigger" | approval-card-builder |
| `complaint` | "this isn't working" | complaint-escalation |
| `compliment` | "this is great!" | acknowledge + log for testimonial use |
| `feature-request` | "could you also add..." | log for product backlog; surface if 3+ customers ask same |
| `bug-report` | "the form errors when I..." | postmortem-writer triggers |
| `pricing-inquiry` | "what does Site cost?" | pricing-decision-helper |
| `booking-question` | "can I book Tuesday?" | redirect to Cal.com |
| `referral-mention` | "I told my neighbor about you" | warm-dm-personalizer feed |
| `unsubscribe` | "stop emailing me" | suppression list + acknowledge |
| `legal` | mentions lawyer, legal action, threats | escalate to Jack directly; never auto-reply |
| `spam` | unrelated to business | auto-archive-spam |
| `general` | small talk, acknowledgment | drafter |

## Per-tag confidence scoring

Output a confidence per classification:
- **0.9-1.0**: Unambiguous pattern match (specific keywords + structure)
- **0.7-0.89**: Strong signal but some ambiguity
- **0.5-0.69**: Ambiguous; secondary tag also viable
- **<0.5**: Don't auto-classify; surface for human review

## Per-channel adjustments

### Chatbot transcript
- More casual; expect typos
- Multiple short messages = one logical feedback
- Look at the FULL conversation, not single message

### SMS
- Brevity is normal; don't over-read
- Emoji-only = `general` low confidence

### IG DM
- May be from non-customers (prospects); cross-check
- Tag `referral-mention` is common from someone who heard about Day14

### In-person verbal (Jack transcribes)
- Jack's transcription may compress; trust him
- Often `compliment` or `feature-request` mixed

## Cross-customer aggregation

When a `feature-request` is tagged for a customer:
- Log to `~/Documents/studio/docs/feature-requests-aggregated.md`
- Group by request type (e.g., "online ordering," "loyalty program")
- If same request from 3+ customers → escalate as a roadmap candidate for the templates

## Hard rules

1. **Never auto-classify "legal" tag.** Always surface to Jack directly.
2. **Never reply to spam.** Auto-archive only.
3. **Never engage in argumentative threads.** Tag `complaint` → escalation flow handles.
4. **Always preserve the original message** (verbatim) in the dossier.

## Failure modes

- **Multi-tag ambiguity** (e.g., "this works great BUT can you also add X?"): tag both `compliment` + `feature-request`; surface both downstream actions
- **Tag = `legal` with very low confidence**: still surface as legal — false positive is OK; false negative is dangerous
- **Customer mentions another customer by name**: privacy flag; redact in the dossier feedback log

## When invoked
- Inside `vercel-route-resend-inbound` for emails
- Inside chatbot conversation end-of-session
- Inside `review-monitoring-poller` for new reviews (parallel to `review-sentiment-scorer`)
- Manually when Jack pastes a piece of feedback

## Logging
`[YYYY-MM-DD HH:MM ET] feedback-classifier → channel: {name}, customer: {slug or 'prospect'}, tag: {category}, confidence: <0.0-1.0>`

Lifted from production in `~/Documents/splash-jacks-pools/src/lib/feedback/classify.ts`.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('feedback-classifier', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'feedback-classifier', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
