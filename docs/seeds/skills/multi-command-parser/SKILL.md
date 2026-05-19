---
name: multi-command-parser
description: When Jack sends a single message containing multiple commands ("approve 42, reject 43, draft a reply to Acme"), split into N atomic commands and execute each. Critical for voice memos where multi-command is the norm. Phase 6 supporting skill.
triggers:
  - "multiple commands"
  - "split commands"
  - "and also"
  - "multi-action message"
---

# multi-command-parser

> Voice memos almost always contain 2-5 commands. Without this skill,
> the parser sees one fuzzy intent. With it, each command is atomic.

## Input
Already-transcribed text from `voice-message-transcriber` OR free-form Jack text.

## The split

Split on these patterns (in order of priority):

1. **Explicit separators**: comma, "and", "then", "also", semicolon
2. **Action verbs at start of clauses**: "approve", "reject", "draft", "schedule", "remind", "send"
3. **Numbered enumerations**: "first... second... third..."

Each segment becomes a candidate command. Then:

- Run `telegram-inbound-parser` on each segment
- If any segment classifies with confidence < 0.6: surface the segment for clarification, but execute the others
- Maintain order — execute in the order Jack said them

## Multi-command voice memo example

Input (transcribed):
> "Approve 42 reject 43 draft a reply to Acme Pool saying I'll get back tomorrow and remind me Monday to call Casamoré"

Parsed segments:
1. `approve 42` → high confidence approval
2. `reject 43` → high confidence rejection
3. `draft a reply to Acme Pool saying I'll get back tomorrow` → drafting task
4. `remind me Monday to call Casamoré` → scheduled task creation

Execute all 4 sequentially. Batch confirmation back:

```
✓ Approved 42
✓ Rejected 43
✓ Drafted reply to Acme Pool (in dossier; review + send)
✓ Reminder set: Monday call to Casamoré
```

## Failure handling per command

If segment 3 fails (e.g., Acme Pool isn't a customer slug we recognize):
- Execute 1, 2, 4
- For 3: "Couldn't draft reply — no customer match for 'Acme Pool'. Did you mean 'acme-pool-co'?"

Don't fail the whole batch on one bad segment.

## Order preservation

Commands often have dependencies:
- "Approve 42 then immediately deploy" → approve first, deploy after
- "Reject 43 and send the customer the alternative" → reject first, then draft alternative

Always execute strictly in stated order. Surface clearly if execution interleaves.

## Hard rules

1. **Always confirm each command's outcome in the batch reply.** Jack sees what fired.
2. **Never auto-execute a command with confidence < 0.7** — surface for confirmation while executing the high-confidence ones.
3. **Always preserve order.** Even when commands could parallelize.
4. **Never split on punctuation alone** if the text is clearly one sentence. Use semantic signals.
5. **Max 5 commands per message.** More than 5 = surface as "I got 7 commands; let me execute the first 5 + you re-send the rest."

## Failure modes

- **Voice transcription smushed words together** ("approve forty-two reject forty-three"): parser must handle word-form numbers; coerce to digits
- **One command in a different language**: handle the English ones; flag the foreign one for re-send
- **Commands contradict** (approve 42 + reject 42): execute neither; surface as conflict

## When invoked
- After `voice-message-transcriber` returns text
- When `telegram-inbound-parser` detects multiple action-verbs in a single message
- Manually in long text messages with implicit multi-actions

## Logging

`[YYYY-MM-DD HH:MM ET] multi-command-parser → commands: N, succeeded: M, failed: K, source: {voice|text}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('multi-command-parser', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'multi-command-parser', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
