---
name: telegram-command-router
description: Map a parsed Telegram message to the right downstream skill or action. The central dispatcher. Knows which skill handles which intent. Supporting skill for telegram-bridge.
triggers:
  - "telegram command"
  - "route inbound"
  - "dispatch telegram"
---

# telegram-command-router

> Inbound parsed → router maps to action → action executes →
> result formatted back to Telegram. This skill is the central hub.

## Input
Output from `telegram-inbound-parser` — structured intent + payload.

## The routing table

| Intent | Subject prefix | Routes to |
|---|---|---|
| `command` | `/start` | onboard chat; reply with welcome + chat_id |
| `command` | `/help` | reply with command list |
| `command` | `/mrr` | `mrr-calculator` → format result |
| `command` | `/customer <slug>` | `customer-history-lookup` → format result |
| `command` | `/approvals` | query pending approvals → format list |
| `command` | `/snooze <hours>` | update `_shared/telegram/config.json` snooze field |
| `command` | `/wake` | clear snooze |
| `command` | `/status` | aggregate health check → format summary |
| `command` | `/customers` | list all active customers → format compact |
| `command` | `/recent` | last 10 events → format timeline |
| `command` | `/skills` | list all installed skills → format compact |
| `command` | `/council <question>` | invoke `council-decision` → format result |
| `approval` | (any) | look up card → execute approve/reject via approval-card-builder API |
| `query` | `customer-*` | `customer-history-lookup` |
| `freeform` | (any) | invoke a fallback LLM to determine intent OR ask clarifying question |
| `callback` | `approve:42` | look up card 42 → flip status → reply confirmation |
| `attachment` | photo/voice/doc | route to `telegram-attachment-handler` |

## Failure: unknown command

If a slash command doesn't match the table:

```
Unknown command: /{cmd}

Try: /help to see what I respond to.
```

## Failure: freeform with low confidence

If freeform text has confidence < 0.7 from parser:

```
Got that. What do you want me to do with it?

[💬 Draft response] [📅 Schedule task] [📝 Just save as note] [❓ Other]
```

Each button writes back a callback that re-routes with confirmed intent.

## The /help command output

```
Day14 OS — commands I respond to:

*Approvals*
- `approve 42` — approve card #42
- `reject 42` — reject card #42
- `/approvals` — list pending

*Customers*
- `/customers` — all active customers
- `/customer <slug>` — specific customer status
- `/recent` — last 10 events

*Decisions*
- `/council <question>` — run council protocol
- `/mrr` — current MRR
- `/status` — system health

*Quiet hours*
- `/snooze <hours>` — mute for N hours
- `/wake` — clear snooze

Or just message me freely — I'll figure out what you mean.
```

## How re-routing handles attachments

If parser flagged `needs_followup: true` (e.g., voice note awaiting transcription):
1. Router does NOT immediately process
2. It queues the message + sets reminder for when transcription completes
3. Voice-message-transcriber fires; result re-enters inbox
4. Router processes the transcribed text + the original message context

## Hard rules

1. **Never auto-execute a destructive command** (`delete`, `revoke`, `cancel`) without inline-button confirmation.
2. **Never route a callback for a chat_id other than configured Jack's.** Strangers can't approve Day14 things.
3. **Never block on a missing skill.** If a referenced skill doesn't exist yet, reply: "I don't have that skill yet. Want me to log this for later?"
4. **Always log every routing decision** to `~/Documents/studio/docs/overnight/MASTER_LOG.md` so we can audit.
5. **Never silently fail.** Every inbound gets SOME reply, even if it's "I didn't understand."

## Special routing: voice memo

When parser hands off a voice memo:
1. Wait for `voice-message-transcriber` output
2. Re-feed transcribed text through `telegram-inbound-parser`
3. The parser may return multi-command (e.g., "approve 42, reject 43, draft a reply to Acme")
4. Router executes each command sequentially, batching results into one outbound message

## When invoked
- After every successful `telegram-inbound-parser` execution
- Manually when testing routing paths

## Logging

`[YYYY-MM-DD HH:MM ET] telegram-command-router → message_id: {id}, intent: {parsed}, routed_to: {skill}, outcome: {success|fail}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('telegram-command-router', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'telegram-command-router', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
