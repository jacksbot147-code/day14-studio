---
name: dm-reply-classifier
description: When a recipient replies to a Day14 outreach DM (cold or warm), classify the reply into yes/maybe/no/spam-objection/curious. Drafts the next-touch DM. Supporting skill for outreach-trigger.
triggers:
  - "DM reply"
  - "Instagram response"
  - "they replied"
  - "outreach reply"
---

# dm-reply-classifier

> The first DM Jack sends gets a reply (sometimes). The reply
> deserves a thoughtful next move — not a generic "thanks for
> reaching out" that kills the lead. This skill classifies + drafts.

## Reply categories

| Tag | Examples |
|---|---|
| `yes` | "Sounds good, send a preview", "Yeah let's do it", "Sign me up" |
| `maybe` | "Tell me more", "What does it include?", "How does this work?" |
| `no-budget` | "Can't afford that right now", "Maybe next year" |
| `no-fit` | "Already have a website", "Got a guy for that" |
| `objection` | "Sounds too good to be true", "Is this AI?" |
| `curious` | "Are you the Splash Jacks owner?", "Where are you based?" |
| `spam-or-bot` | Single emoji, generic affirmation with no follow-up question |
| `hostile` | "Stop messaging me", "Block" |

## Per-tag next-DM draft

### `yes`
Send the preview link (Cal.com or Stripe Payment Link directly if they're ready):

```
{First_name}, easy — I'll have a preview to you by tomorrow. Quick
30-min call to lock in your colors + photos + booking flow:
{CAL_LINK}

Pick whatever time works.

— Jack
```

### `maybe`
Drop one specific detail + offer the call:

```
{First_name}, the {SKU} package is 14 days flat, $2,500. You get:
- Custom homepage / services / pricing / contact
- AI chatbot trained on your services
- Mobile-optimized, hosted, your domain

Worth a 30-min call? {CAL_LINK}

— Jack
```

### `no-budget`
Honest, no pressure, leave door open:

```
{First_name}, totally fair. Day14 isn't for everyone every month.
If your situation changes (next quarter, year), I'm at 239-XXX-XXXX.

Quick gift: my Splash Jacks site is a working example of the build:
splashjackspools.com. Steal whatever ideas help.

— Jack
```

### `no-fit`
Acknowledge + plant seed for future:

```
Makes sense, {first_name}. If the current setup ever stops working,
I'm here. {Specific reference to their current platform if mentioned —
"Jobber's renewals are getting steep, when that bites I'd love a chat"}.

— Jack
```

### `objection`
Address one specific worry directly:

```
{First_name}, fair skepticism. {Specific answer to their objection}.

Want to see real proof? I built splashjackspools.com — it's my own
pool company's stack. Working live with real customers.

— Jack
```

### `curious`
Answer the question, then circle back to offer:

```
{Yes/no answer to their question, 1-2 sentences.}

If you're at all interested in what I do, here's the 5-min walkthrough:
{video_link}

— Jack
```

### `spam-or-bot`
Don't reply. Mark contact as `do-not-engage`.

### `hostile`
Don't reply. Block on Instagram. Mark contact as `blocked`.

## Hard rules

1. **Never auto-send a DM reply.** Drafts only. Jack reviews + sends manually.
2. **Never engage with `spam-or-bot` or `hostile`.** Engagement amplifies.
3. **Never pressure-tactics on `no-budget`** ("special discount this week only"). Day14 isn't a gym promo.
4. **Never include a link in the FIRST follow-up reply.** That's when Instagram flags as spam. Save links for the third message.
5. **Always re-tag at every touch.** Their second reply might shift category from "curious" to "yes".

## Conversation tracking

Each lead's reply history goes into `~/Documents/studio/docs/outreach/dm-threads/{handle}.md`:

```
# {Instagram handle} — outreach thread

## 2026-05-20 — opening DM (cold-dm)
> {our DM text}

## 2026-05-21 — reply (curious)
> {their reply text}

## 2026-05-21 — our reply (drafted, sent by Jack at 14:32)
> {our reply text}

## ...
```

After 3 touches with no `yes` / `maybe` movement: stop. Don't pursue.

## Logging

`[YYYY-MM-DD HH:MM ET] dm-reply-classifier → handle: {handle}, tag: {tag}, draft_path: {path}, touch_number: N`

When conversion happens (booking / deposit):
`[YYYY-MM-DD HH:MM ET] dm-reply-classifier CONVERTED → handle: {handle}, source: {cold-dm|warm-dm}, touches_to_convert: N`

## When invoked
- After every DM reply received (Jack pastes the reply into Cowork; skill runs)
- Manually when Jack wants the next-message draft re-generated
- Inside `lead-source-tracker` for funnel stage tracking
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('dm-reply-classifier', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'dm-reply-classifier', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
