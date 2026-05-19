---
name: telegram-outbound-formatter
description: Format an outbound message into Telegram's MarkdownV2 + inline-button schema. Handles escape characters, button layouts, attachment metadata. Supporting skill for telegram-bridge.
triggers:
  - "format telegram message"
  - "outbound telegram"
  - "telegram markdown"
  - "inline buttons"
---

# telegram-outbound-formatter

> Telegram's MarkdownV2 has 15+ escape requirements. Inline buttons
> have specific JSON schema. This skill handles both.

## Input
- `chat_id` — destination chat
- `text` — message body (raw, not yet escaped)
- `buttons` — optional 2D array of {text, callback_data}
- `attachment` — optional {type, path}
- `urgency` — `P0 | P1 | P2 | P3`

## Output
A file written to `~/Documents/businesses/_shared/telegram/outbox/{timestamp}-{purpose}.json`, ready for the Node poller to send.

## MarkdownV2 escape rules

These chars MUST be escaped with `\` in MarkdownV2:
`_ * [ ] ( ) ~ \` > # + - = | { } . !`

Common cases:
- `5.2 ppm` → `5\.2 ppm`
- `(price below)` → `\(price below\)`
- `#42` → `\#42`
- File path `/tmp/foo.txt` → `\/tmp\/foo\.txt`

Always run text through the escaper before sending.

## Allowed formatting

- `*bold*` → bold (no escape needed inside)
- `_italic_` → italic
- `` `code` `` → inline code
- ` ```pre``` ` → code block
- `[link text](url)` → link (escape parens in URL though)

## Inline button layout

Telegram allows up to 8 rows × 8 columns of inline buttons per message. Day14 conventions:

- **Approval cards**: single row, 3 buttons max: `[✅ Approve] [❌ Reject] [💬 More info]`
- **Multiple choice**: 1-2 rows, each option as button
- **Long lists**: 2-column grid, max 8 rows; use scrollable file link if more

Button text rules:
- ≤ 15 chars per button
- Emoji prefix optional but conventional
- Callback data ≤ 64 chars: format `action:id` or `action:id:param`

## Urgency formatting

| Urgency | Visual treatment |
|---|---|
| P0 | `🔔 *URGENT* — ` prefix; no quiet-hours suppression |
| P1 | `⚠️ ` prefix |
| P2 | no prefix; respects quiet hours |
| P3 | batched into morning digest only |

## Voice consistency

All outbound text passes through `voice-drift-detector` AND `voice-secret-scanner` first:

1. Voice drift → reject banned phrases ("we're excited!" etc.)
2. Secret scanner → reject if any `sb_secret_`, `sk_live_`, etc.

If either check fails → don't send; log; surface to operator.

## Template format

```json
{
  "chat_id": 789,
  "text": "✅ Approval card \\#42 approved\\.\n\nCustomer build for *Acme Pool* will resume in \\~5 min\\.",
  "parse_mode": "MarkdownV2",
  "reply_markup": {
    "inline_keyboard": [[
      {"text": "📂 Dossier", "callback_data": "dossier:acme-pool"},
      {"text": "↩️ Undo", "callback_data": "undo:42"}
    ]]
  },
  "urgency": "P2",
  "queued_at": "2026-05-16T20:00:00Z",
  "sent_at": null
}
```

## Length limits

- Single message: 4096 chars max
- If longer: split into multiple messages OR write to a file + link
- Captions on photos: 1024 chars max

## Hard rules

1. **Always escape MarkdownV2.** Forgetting one char = message fails to send.
2. **Never include unescaped user-supplied text.** Customer names, file paths, etc. must be escaped.
3. **Never send during quiet hours** unless urgency = P0. Queue instead.
4. **Always include `queued_at`** so poller knows freshness.
5. **Never send same message twice in 60s** — dedupe based on (chat_id, text-hash).

## Failure modes

- **Message fails to send (Telegram returns 400)**: usually escape error. Fall back to plain text (no parse_mode); retry.
- **Rate limit hit (30 msgs/min)**: queue; back off; retry in 30s.
- **Outbox file written but poller dead**: watchdog skill detects + restarts.

## When invoked
- Any skill that wants to push to Telegram (daily-kickoff-telegram-formatter, telegram-approval-card, etc.)
- Manually for debugging/testing the bridge

## Logging

`[YYYY-MM-DD HH:MM ET] telegram-outbound-formatter → chat: {id}, length: {chars}, urgency: {P}, queued: {file}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('telegram-outbound-formatter', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'telegram-outbound-formatter', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
