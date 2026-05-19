---
name: telegram-status-pusher
description: Orchestrate proactive status pushes from Day14 OS to Jack's Telegram. The "Stripe deposit cleared, build agent starting" type of message. Phase 3 anchor.
triggers:
  - "push status"
  - "notify Jack"
  - "send status update"
  - "proactive ping"
---

# telegram-status-pusher

> The empire pushes status TO Jack without Jack asking. Customer
> pays → push. Build agent starts → push. Site launches → push.

## What gets pushed (event → push mapping)

Driven by `event-to-telegram-mapper`. The default mapping:

| Event kind | Push? | Urgency | Sample message |
|---|---|---|---|
| `customer-deposit-paid` | yes | P1 | "💰 New customer: {company} ({sku}, ${amount} deposit). Build starting." |
| `build-started` | no | P3 | (logged only) |
| `preview-ready` | yes | P2 | "🟢 Preview ready: {url}. Approval card #N pending." |
| `customer-reply-received` | yes | P1 if complaint, P2 otherwise | "✉️ {customer} replied: {first 50 chars}..." |
| `approval-card-drafted` | yes | per card urgency | (uses `telegram-approval-card`) |
| `customer-launched` | yes | P0 (celebration) | "🚀 {company} is LIVE at {production_url}." |
| `customer-refunded` | yes | P0 | "↩️ {company} refunded ({reason}). Dossier archived." |
| `production-down` | yes | P0 | "🚨 {customer_url} returning {status}. Polish check failed." |
| `cert-expiring` | yes | P1 if <7d, P2 if 7-14d | "⏰ {customer_url} SSL expires in {N days}." |
| `lighthouse-drop` | yes | P2 | "📉 {customer_url} Lighthouse dropped {N} points." |
| `weekly-council-review` | yes | P2 | "🗳️ Weekly council review ready: {path}" |
| `nightly-polish-green` | no | P3 | (silent — only push if red) |

## How a push happens

1. Event written to Supabase `events` table OR an agent finishes work
2. This skill reads the event + checks `event-to-telegram-mapper` for push policy
3. `urgency-classifier` rates urgency
4. `jack-asleep-detector` checks state
5. If active → send via `telegram-outbound-formatter`
6. If asleep + non-P0 → batch via `batching-quiet-hours`

## Message template per event type

### customer-deposit-paid (P1)
```
💰 *New customer paid*

*{company}* — {sku} \(\${deposit}\)

Build agent will start within 60s\. First preview ETA: \~2h\.

Dossier: /customer\_{slug}
```

Buttons:
- `[📂 Dossier]` `[⏸ Pause build]`

### preview-ready (P2)
```
🟢 *Preview ready*

*{company}* preview is up:
{preview_url}

Lighthouse: {mobile}/{desktop}\. Approval card \#{N} ready for send\.
```

Buttons:
- `[✅ Send preview]` `[👀 View site]` `[❌ Reject]`

### customer-launched (P0)
```
🚀 *LAUNCHED*

*{company}* is live at:
{production_url}

Day {N} of 14\. Launch email drafted in dossier\.
```

Buttons:
- `[📂 Dossier]` `[✉️ Review launch email]`

## Hard rules

1. **Never push the same event twice.** Dedup via `events.id`.
2. **Never push without going through `urgency-classifier` + `jack-asleep-detector`.** Quiet hours respected.
3. **Never include sensitive data** (full email body with customer's address; preview URL only acceptable; full SQL data NEVER).
4. **Always include a button or follow-up command** so Jack can act immediately.

## Cross-skill flow

```
event → event-to-telegram-mapper → urgency-classifier
       → jack-asleep-detector → telegram-outbound-formatter
       → outbox file → poller → Telegram
```

## When invoked
- On every Supabase event insert (via webhook or scheduled poll)
- On every approval-card-builder filing
- On every scheduled task completion (kickoff, EOD, polish)

## Logging

`[YYYY-MM-DD HH:MM ET] telegram-status-pusher → event: {kind}, urgency: {P}, pushed: {yes|batched|skipped}, reason: {if skipped}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('telegram-status-pusher', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'telegram-status-pusher', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
