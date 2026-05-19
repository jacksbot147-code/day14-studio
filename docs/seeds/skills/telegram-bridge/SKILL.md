---
name: telegram-bridge
description: The protocol contract for Day14 OS's Telegram interface. Anchor skill that defines how messages enter (inbound) and leave (outbound) the system. Supporting skills handle parsing, formatting, command routing. The phone-first operator UX lives here.
triggers:
  - "telegram"
  - "send to phone"
  - "push to Jack"
  - "phone notification"
---

# telegram-bridge

> Jack lives in Telegram. Day14 OS speaks Telegram. This skill is
> the protocol between them.

## The architecture (3 components)

```
┌─────────────┐       ┌─────────────────┐       ┌──────────────┐
│  Telegram   │ ←───→ │  Node poller    │ ←───→ │  Cowork +    │
│  bot        │       │  (long-running) │       │  scheduled   │
│  (cloud)    │       │  on laptop/mini │       │  tasks       │
└─────────────┘       └─────────────────┘       └──────────────┘
                              │
                              ↓
                      ┌──────────────────┐
                      │ Queue folders:   │
                      │ telegram/inbox/  │
                      │ telegram/outbox/ │
                      └──────────────────┘
```

1. **Telegram bot** — cloud-side, free, lives on Telegram's servers. Configured via @BotFather.
2. **Node poller** — runs locally on Jack's laptop (or eventually the Mac mini). Polls Telegram every 5s for new messages → writes to `telegram/inbox/`. Reads `telegram/outbox/` and sends to Telegram.
3. **Cowork agents** — read `telegram/inbox/`, process, write replies to `telegram/outbox/`. Fire on scheduled cadence (every 5 min) OR on-demand.

## Required env vars

```bash
TELEGRAM_BOT_TOKEN=  # from @BotFather
TELEGRAM_CHAT_ID=    # Jack's personal chat ID (from /start command response)
```

## Inbox file format

Each inbound message lands at `~/Documents/businesses/_shared/telegram/inbox/{timestamp}-{message_id}.json`:

```json
{
  "message_id": 123,
  "from": {"id": 456, "first_name": "Jack", "username": "jacksbot147"},
  "chat": {"id": 789},
  "date": 1747393200,
  "text": "approve 042",
  "attachments": [],
  "voice_note": null,
  "received_at": "2026-05-16T20:00:00Z",
  "processed": false
}
```

## Outbox file format

Outbound messages at `~/Documents/businesses/_shared/telegram/outbox/{timestamp}-{purpose}.json`:

```json
{
  "chat_id": 789,
  "text": "✅ Approval card #42 approved.",
  "parse_mode": "MarkdownV2",
  "reply_markup": {
    "inline_keyboard": [[
      {"text": "✅ Approve", "callback_data": "approve:42"},
      {"text": "❌ Reject", "callback_data": "reject:42"},
      {"text": "💬 More info", "callback_data": "info:42"}
    ]]
  },
  "queued_at": "2026-05-16T20:00:01Z",
  "sent_at": null,
  "sent_status": "queued"
}
```

Poller sees `sent_at: null` → posts to Telegram → writes back `sent_at` + `sent_status`.

## Hard rules

1. **Never send secrets through Telegram.** Run every outbound through `voice-drift-detector` first; reject any message that contains a `sb_secret_`, `sk_live_`, `whsec_`, JWT pattern, or other secret-shaped string.
2. **Never auto-reply to messages from chat IDs other than the configured TELEGRAM_CHAT_ID.** The bot ignores strangers. Period.
3. **Never delete a message from the inbox until it's marked `processed: true`.** Idempotency: a re-run shouldn't double-process.
4. **Never send more than 30 messages per minute** (Telegram bot rate limit). Queue if approaching.
5. **Always include a queue timestamp** so we can audit message latency.

## Voice + tone (outbound)

Outbound Telegram messages follow `day14-voice` rules with these additional constraints:

- **Telegram-friendly markdown**: use MarkdownV2; escape `_`, `*`, `[`, `]`, `(`, `)`, `~`, `` ` ``, `>`, `#`, `+`, `-`, `=`, `|`, `{`, `}`, `.`, `!`
- **Short by default**: Telegram messages are read fast. 1-3 sentences typical. Long-form goes in a file link.
- **Inline buttons over questions**: instead of asking "do you want X?", show buttons "✅ Yes / ❌ No"
- **Emoji used sparingly**: ✅ ❌ ⚠️ 💬 🔔 ✉️ — only these. NOT 🎉 🚀 💪.

## Inbound parsing strategy

Inbound text falls into categories (handled by `telegram-command-router`):

| Pattern | Example | Routed to |
|---|---|---|
| Slash command | `/start`, `/help`, `/mrr` | command-router |
| Approval response | `approve 42`, `reject 42`, `42 ✅` | approval-card-builder |
| Customer query | `customer acme-pool` | customer-history-lookup |
| Free-form note | "remind me Monday to..." | scheduled-tasks |
| Voice note | (audio attachment) | voice-message-transcriber → re-parse |
| Photo | (image attachment) | telegram-attachment-handler |

## Quiet hours

By default, no messages between 10 PM - 8 AM ET unless tagged P0. Configurable in `_shared/telegram/config.json`.

## How to verify the bridge works

1. Jack sends "ping" to the bot
2. Bot's poller receives within 5s
3. Cowork scheduled task (every 5 min) sees the inbox file
4. Routes to `telegram-command-router` → identifies "ping"
5. Writes reply to outbox: "pong"
6. Poller picks up outbox → sends "pong" to Jack
7. Total latency: <5 min (or <10s if Cowork is running)

Once Mac mini arrives + a webhook URL exists, latency drops to <2s.

## When invoked
- Anchor skill — called by every other Telegram skill for protocol reference
- Manually when debugging Telegram message flow
- During Phase 1 setup to verify end-to-end works

## Logging

`[YYYY-MM-DD HH:MM ET] telegram-bridge → inbox: {N}, outbox: {N}, errors: {N}`

When a message gets rejected for security:
`[YYYY-MM-DD HH:MM ET] ⚠️ telegram-bridge BLOCKED outbound — reason: secret-detected, message preview: {first 30 chars}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('telegram-bridge', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'telegram-bridge', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
