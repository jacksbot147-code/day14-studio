---
name: telegram-inbound-parser
description: Parse a raw Telegram message file from the inbox into structured intent + payload. Handles text, photos, voice notes, documents, inline button callbacks. Supporting skill for telegram-bridge.
triggers:
  - "parse telegram message"
  - "inbox message"
  - "what does this telegram say"
---

# telegram-inbound-parser

> Telegram message comes in as JSON. This skill extracts: what
> did Jack want?

## Input
A file from `~/Documents/businesses/_shared/telegram/inbox/`

## Output schema

```json
{
  "intent": "approval | command | query | freeform | callback | attachment",
  "subject": "approval-42 | customer-acme-pool | mrr | ...",
  "raw_text": "...",
  "attachments": [{"type": "photo|voice|document", "path": "..."}],
  "voice_transcription": null,
  "callback_action": null,
  "confidence": 0.95,
  "needs_followup": false
}
```

## Parsing rules

### Slash commands
Anything starting with `/` is a command. Map:
- `/start` → onboard chat; reply with chat_id
- `/help` → show available commands
- `/mrr` → query MRR; reply with current
- `/customer <slug>` → show customer status
- `/approvals` → list pending approval cards
- `/snooze <hours>` → mute notifications for N hours
- `/wake` → cancel any active snooze

### Approval responses
Patterns that should map to approvals:
- `approve 42` → callback `approve:42`
- `reject 42` → callback `reject:42`
- `42 ✅` or `42 yes` → `approve:42`
- `42 ❌` or `42 no` → `reject:42`
- Just `yes` or `✅` (when context = pending card just shown) → `approve:{last_shown_card}`

The "context-aware" parsing uses `telegram-conversation-state` to remember the last card shown.

### Customer queries
- `customer acme-pool` → look up customer
- `status acme-pool` → same
- `acme-pool last visit` → narrower query

### Free-form
Anything that doesn't match a pattern. Routed to:
- If contains "remind me" or "schedule" → scheduled-tasks
- If contains "draft" or "reply" or "respond" → drafting skill
- Otherwise → general AI inference (use Anthropic API for parsing intent)

### Inline button callbacks
When Jack taps a button, the bot receives `callback_query` with `data` field. Parse:
- `approve:42` → approve card #42
- `reject:42` → reject card #42
- `info:42` → show more info about card #42
- `snooze:1h` → snooze for 1 hour

### Voice notes
If attachment is type=voice:
- Download the .ogg file
- Mark `needs_followup: true`
- Hand off to `voice-message-transcriber`
- Once transcribed, re-parse the transcribed text through this skill

### Photos
If attachment is type=photo:
- Download
- Hand off to `telegram-attachment-handler`
- Don't auto-parse the image content; require explicit text command ("photo of pump — needs replacement quote")

### Documents
Same as photos. Hand off to attachment handler.

## Confidence scoring

- **0.9-1.0**: Exact pattern match (slash command, "approve N")
- **0.7-0.89**: Strong fuzzy match
- **0.5-0.69**: Free-form with one clear intent signal
- **<0.5**: Don't auto-route; reply: "Got that. What do you want me to do with it?" + 3 button options

## Hard rules

1. **Never act on confidence < 0.7** without confirmation. Reply with options.
2. **Never auto-classify "yes" / "no" / "ok"** without recent context (last 5 minutes of conversation state).
3. **Never persist sensitive parse output** beyond the inbox + immediate processing. After processed, mark `processed: true` but redact any quoted secrets.

## Failure modes

- **Telegram sent a message type we don't handle** (sticker, video, location): log "unsupported type"; reply "I don't handle that type yet — text or voice please"
- **Voice transcription fails**: reply "couldn't transcribe — can you type it?"
- **Photo is sent without caption**: reply "got the photo. What did you want me to do with it?"

## Logging

`[YYYY-MM-DD HH:MM ET] telegram-inbound-parser → message_id: {id}, intent: {parsed}, confidence: <0.0-1.0>`

## When invoked
- Every file written to telegram/inbox/ by the Node poller
- Inside `telegram-command-router` for re-parsing after voice transcription
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('telegram-inbound-parser', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'telegram-inbound-parser', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
