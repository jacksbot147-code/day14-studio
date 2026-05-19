---
name: telegram-conversation-state
description: Track multi-turn conversation memory with Jack via Telegram. So when Jack types "yes" after the bot showed him a card, "yes" means "approve that card." Lightweight state machine. Phase 2 supporting skill.
triggers:
  - "telegram context"
  - "what was the last message"
  - "follow-up reply"
  - "yes" without context
---

# telegram-conversation-state

> Telegram conversations are stateful. Without memory, a reply of
> "yes" is ambiguous. This skill preserves enough state to make
> "yes" actionable.

## What gets remembered

Per chat_id (just one — Jack's), maintain a state file at:
`~/Documents/businesses/_shared/telegram/state.json`

```json
{
  "chat_id": "...",
  "last_outbound": {
    "type": "approval-card | question | digest | freeform",
    "card_id": 42,
    "subject": "...",
    "sent_at": "ISO",
    "expires_at": "ISO (state expires after 5 min usually)"
  },
  "pending_clarification": {
    "original_message_id": 123,
    "ambiguous_text": "remind me later",
    "options_offered": ["1 hour", "tomorrow", "next week"],
    "expires_at": "ISO"
  },
  "active_snooze": {
    "until": "ISO",
    "set_at": "ISO"
  }
}
```

## State lifecycle

- **Write**: every outbound from Day14 that expects a follow-up update state
- **Read**: every inbound from Jack checks state for context
- **Expire**: state entries auto-expire after 5 minutes (configurable). After expiry, "yes" no longer maps.
- **Clear on contradiction**: if Jack sends a NEW unrelated message, prior state is cleared.

## How "yes" gets disambiguated

When `telegram-inbound-parser` sees a low-confidence "yes" / "ok" / "approve":

1. Read state.json
2. Check `last_outbound.type`
3. If `approval-card` and `expires_at > now`: route to approve that card
4. If `question` and `options_offered` present: route to "answer was yes"
5. Otherwise: reply "Yes to what?" with no auto-action

## Snooze management

When Jack sets a snooze (`/snooze 4h` or button tap):
- Write `active_snooze.until` = now + 4h
- Outbound formatter checks this before sending non-P0 messages
- Auto-clears when reached

## Pending clarification

When Day14 asks Jack a question and gives him 3 options:
- State remembers the question + options
- Jack can reply with the option label OR number
- After 5 min, state expires → next reply is treated fresh

Example flow:
- Day14: "Got 'remind me later' — when?  [1 hour] [tomorrow] [next week]"
- State stored: pending_clarification + ambiguous_text + options
- Jack: "tomorrow" → state.options matches → execute "remind me tomorrow"
- State cleared

## Hard rules

1. **Never persist secret context.** Even within state.json. Operations relevant to credentials live in dossier files, not the bridge state.
2. **Never let state grow unbounded** — single state per chat_id; overwrite previous.
3. **Never make state survive across days** — anything 24h+ old gets purged.
4. **Always log state mutations** for debugging.

## Failure modes

- **State file corrupted**: rebuild empty; surface to operator
- **Two outbounds in <1 sec** (race): the latter overwrites; expected
- **Snooze accidentally never cleared**: surface to operator after 24h with active snooze

## When invoked
- Inside `telegram-inbound-parser` on every inbound message
- Inside `telegram-outbound-formatter` on every outbound to record context
- Inside `telegram-command-router` for disambiguation
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('telegram-conversation-state', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'telegram-conversation-state', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
