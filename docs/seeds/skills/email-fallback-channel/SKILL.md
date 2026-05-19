---
name: email-fallback-channel
description: When Telegram is down or Jack's phone is dead, fall back to email for critical notifications. P0/P1 messages get delivered via email; P2/P3 wait. Phase 6 supporting skill.
triggers:
  - "telegram down"
  - "email fallback"
  - "phone unreachable"
  - "alternative channel"
---

# email-fallback-channel

> Single-channel ops break when the channel breaks. This skill is
> the resilience layer.

## Trigger conditions

Use email fallback when ANY:
- Telegram API returns error (rate limit, outage)
- Outbox queue has 5+ pending messages with no successful sends in 10 min
- Jack hasn't read a P0 in 15 min (best-effort via Telegram read receipts)
- Jack manually sends `/fallback-on` (switches channel until `/fallback-off`)

## Per-urgency routing

| Urgency | Telegram down → action |
|---|---|
| P0 | Send via Resend to jacksbot147@gmail.com immediately + queue Telegram for when it recovers |
| P1 | Send via email; mark in batch as "also-via-email" |
| P2 | Queue; deliver via Telegram when up; do NOT email (avoid spam fatigue) |
| P3 | Queue; deliver in next morning digest |

## Email format

Use Resend with sender `alerts@day14.us`:

```
From: Day14 OS Alerts <alerts@day14.us>
To: jacksbot147@gmail.com
Subject: [P0] {brief}

{Same body as Telegram message, but:
- Plain text (no MarkdownV2)
- Inline buttons replaced with deep-links}

🚨 P0: production-down — acmepoolco.com returning 503

Site has been down for 12 minutes. Vercel deploy log: https://...

Quick links:
- Approve restart: https://day14.us/a/{6CHAR}
- View dossier: https://day14.us/d/acme-pool

Sent via email because Telegram appears unreachable.
— Day14 OS
```

## Idempotency

Don't double-send P0 via both channels. Send via email FIRST when channel-state is "telegram down." When Telegram recovers, send a single "P0 was sent via email at {time}; status: {current state}."

## Recovery detection

Telegram is "back up" when:
- Successful sendMessage call returns 200
- Bot's getUpdates returns normally (not error)

When recovery detected:
- Resume Telegram-first sends
- Log channel recovery event

## Hard rules

1. **Email is fallback ONLY.** Don't use email for normal notifications — Telegram is the primary.
2. **Never P3 via email.** Inbox fatigue kills the fallback's utility.
3. **Always include "sent via email" disclaimer** so Jack knows the channel is degraded.
4. **Always escalate to phone call** (manual, not automated) if P0 sits unread for 30+ min — Jack's actual phone, last resort.
5. **Never share customer secrets via email.** Email is less secure than Telegram for this; same rule applies.

## Failure modes

- **Resend also down (rare)**: log it; nothing else we can do automatically
- **Email goes to spam**: ensure DMARC + DKIM are right for `day14.us`; warm the sender
- **Channel oscillates** (up/down rapid): debounce — require 5 min of consistent state before switching

## When invoked
- Continuously monitored by `autonomous-health-check`
- Before any P0 send, check Telegram status first
- Manually via `/fallback-on` slash command

## Logging

`[YYYY-MM-DD HH:MM ET] email-fallback-channel → state: {telegram-up|down|recovering}, P0_sent_via_email: N, P1: N`

When state changes:
`[YYYY-MM-DD HH:MM ET] email-fallback-channel TRANSITION → from: {state}, to: {state}, duration_outage: {N min}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('email-fallback-channel', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'email-fallback-channel', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
