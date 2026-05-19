---
name: dm-follow-up-detector
description: When a Day14 outreach DM goes unanswered past the cadence window, decide whether to follow up — and with what message. Enforces the 3-touch rule so leads aren't pestered. Supporting skill for outreach-trigger.
triggers:
  - "follow up DM"
  - "no reply"
  - "DM went cold"
  - "second touch"
---

# dm-follow-up-detector

> A DM with no reply is data. The right follow-up cadence converts
> 30% of "no-replies" into conversations. The wrong cadence (too
> aggressive) burns the lead AND Jack's IG reputation.

## The 3-touch rule

Maximum 3 touches per lead, ever. After that, drop them.

| Touch | When | What |
|---|---|---|
| 1 | Initial (via `outreach-trigger` or `warm-dm-personalizer`) | Personalized opener |
| 2 | 5 days after touch 1 (if no reply) | Short, no link, gentle |
| 3 | 14 days after touch 2 (if no reply) | One-line "last try" |
| n/a | After touch 3 | Drop. Never re-engage same lead. |

## Cooldown / no-follow-up exceptions

NO touch 2 if any of:
- Recipient blocked / reported Jack
- Recipient's profile shows they sold the business
- Holiday window (don't DM Dec 23-26 or Jul 4)
- It's been > 30 days since touch 1 (too stale; lead is cold-cold)

NO touch 3 if any of:
- Touch 2 was opened but no reply (Instagram shows "seen" without reply — they've decided)
- Touch 2 generated negative non-verbal signal (unfollowed, blocked)
- Lead bookmarked something on Day14 in the meantime (organic conversion — let it happen)

## Touch 2 draft template

Tone: warm, short, no second pitch.

```
Hey {first_name} — Jack again. Realized my last DM might've gotten
buried. No pressure, just wanted to make sure it landed.

If now's not the right time, no worries.

— Jack
```

Under 200 characters. NO link.

## Touch 3 draft template

Tone: graceful exit. Permission-respecting.

```
Last one from me, {first_name}. If Day14 isn't your thing right now,
totally understand — I'll stop messaging. If it's a "maybe next year"
situation, save my number: 239-XXX-XXXX. Either way, hope the business
keeps growing.

— Jack
```

Permission-respecting closes leave a positive last impression. Even
no-replies sometimes come back 6-12 months later because the FINAL
message wasn't aggressive.

## Hard rules

1. **Never send touch 2 or 3 without checking the "exception" list first.**
2. **Never include a Cal.com or Stripe link** in touch 2 or 3. Links in follow-up = "this is a sales bot."
3. **Never reference the original DM's offer** in touch 2/3. They saw it.
4. **Never auto-send.** Drafts go into `outreach/dm-threads/{handle}.md`; Jack sends manually.
5. **Always log non-responses too.** "No reply at touch 1" is data; pattern-spot which openers convert.

## What "no reply" precisely means

Instagram doesn't give us a clean API for "did they read it." Approximations:
- Touch 1 sent date + 5 days elapsed + no reply in `dm-threads/{handle}.md` → eligible for touch 2
- Manual check if Jack can see "Seen" indicator on the DM in IG: if seen + no reply, lead is decided; skip touch 2

## Logging

`[YYYY-MM-DD HH:MM ET] dm-follow-up-detector → handle: {handle}, touch: {2|3}, eligible: {yes|no}, drafted: {yes|no}, reason: {if no}`

When a follow-up converts (rare but possible):
`[YYYY-MM-DD HH:MM ET] dm-follow-up-detector CONVERTED → handle: {handle}, touch: {2|3}, lead source: {warm-dm-followup}`

Quarterly: what % of touch 2 / touch 3 lead to a reply? If touch 3 converts <2%, drop it from the cadence entirely (save Jack time).

## When invoked
- Daily scheduled task scans `outreach/dm-threads/*.md` for leads at 5+ days (touch 2) and 14+ days (touch 3)
- Manually when Jack reviews the outreach pipeline
- Inside `weekly-council-review` to surface "we've sent N touch-3 messages; what's the conversion?"
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('dm-follow-up-detector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'dm-follow-up-detector', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
