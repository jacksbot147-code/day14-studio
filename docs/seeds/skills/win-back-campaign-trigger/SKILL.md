---
name: win-back-campaign-trigger
description: After a customer churns, wait 30 days then send a tasteful "still around?" sequence. ~10% of churned customers come back when asked properly. Free money if done well; insulting if done badly.
triggers:
  - "win back"
  - "winback"
  - "churned customer outreach"
  - "bring them back"
---

# win-back-campaign-trigger

> "Hey, just checking in" beats "WE WANT YOU BACK!!" every time.

## The sequence (3 emails over 30 days)

| Day post-churn | Tone | Subject | What it says |
|---|---|---|---|
| Day 30 | Curious | "How's it been since {date}?" | No pitch. Just check-in. Ask what they're using instead. |
| Day 60 | Helpful | "Quick update on {their_vertical}" | Share something useful (new feature, vertical trend). Soft re-pitch. |
| Day 90 | Direct | "If you wanted to come back, here's how" | Clear offer: 25% off first 3 months. One-tap signup. |

After day 90: stop. Don't be that ex.

## Hard rules

1. **Never start before day 30.** Earlier feels desperate.
2. **Never call them "lost customer" or "you left us".** Frame: "we built something for you; if it's not the right fit anymore that's fine."
3. **Always reference what they had** — their site URL, what worked.
4. **Discount only on Day 90 email.** Not earlier — devalues the relationship.
5. **Pause sequence if they reply.** Real conversation > automated sequence.
6. **Hard stop at Day 90.** Multiple win-back rounds = harassment.
7. **Never win-back fraudsters or chargeback customers.** They sorted themselves out.

## Discount floor

Win-back discount: max 25% off first 3 months. After that, full price.

NEVER discount the lifetime price — sets a precedent that the deal is "wait + come back".

## What this skill does

1. Triggered 30 days after `subscription.deleted` (cancel) or pause-expired
2. Loads dossier for context — what they had, what they said when leaving
3. Generates personalized Day-30 email using `warm-dm-personalizer` style
4. Schedules Day-60 and Day-90 sends (cancellable on reply)
5. On reply → routes to `inbound-classifier`
6. On signup → re-fork their old dossier as new active customer

## Inputs

- `customer_slug` (the churned customer)
- `cancel_date` (used to schedule +30, +60, +90)
- `cancel_reason` (from refund-handler or cancel handler)

## When invoked

- Auto-trigger 30d after subscription.deleted event
- `/winback {slug}` Telegram command
- Inside `dunning-email-sequencer` after Day 14 fail-out

## Output

```
✓ Win-back scheduled: splash-jacks-pools
  Cancelled: 2026-04-17
  Reason: "decided to do it ourselves"
  Send schedule:
    2026-05-17 (Day 30): "How's it been?"
    2026-06-16 (Day 60): "Pool industry update"
    2026-07-16 (Day 90): "Want to come back? 25% off first 3 mo"
  LTV-if-recovered: $5,964 projected
```

## Failure modes

- **Email bounces** (they switched email providers): mark address dead; don't continue
- **They reply angrily**: cancel sequence + add to do-not-contact list
- **They sign up at full price without discount**: cancel Day-90 — they came back for value, don't undercut

## Logging

`[YYYY-MM-DD HH:MM ET] win-back-campaign-trigger → customer: {slug}, day: {30|60|90}, action: {sent|reactivated|opt-out}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('win-back-campaign-trigger', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'win-back-campaign-trigger', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
