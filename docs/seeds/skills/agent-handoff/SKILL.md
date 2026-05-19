---
name: agent-handoff
description: When work moves between agents (e.g., Build Agent finishes scaffold → hands off to PM Agent for customer communication), the receiving agent gets a structured handoff packet. Prevents context loss at the agent boundary. Supporting skill for the agent crew architecture.
triggers:
  - "agent handoff"
  - "transfer to"
  - "pass work to"
  - "next agent picks up"
---

# agent-handoff

> Day14 OS has multiple agent roles (Build, PM, QA, Customer
> Success). Work moves between them. Without structured handoffs,
> the receiving agent reconstructs context — wasteful, error-prone.

## The handoff packet

When an agent (the "sender") completes its slice and the work moves
to another agent (the "receiver"), write a handoff file:

`~/Documents/businesses/day14/customers/{slug}/_handoffs/{NNN}-{from}-to-{to}.md`

Sequential numbering, 3 digits, kebab-case agent names.

```
# Handoff {NNN} — {from-agent} → {to-agent}

**When:** {ISO timestamp}
**Customer:** {slug}
**Build day:** {N of 14}

## What I (the sender) just did
- {bullet list, max 5 items, concrete actions taken}

## State I'm handing over
- `customers.status`: {value}
- Latest commit: {sha} on branch {name}
- Open approval cards: {IDs}
- Pending issues I noticed but didn't fix: {list, or "none"}
- Files modified in this session: {list of paths}

## What I think the receiver should do next
- {one specific recommended action}

## Notes / quirks
- {anything the receiver needs to know but isn't in the standard state}

## Verification questions for the receiver
- {1-3 yes/no checks the receiver should run before acting}
- e.g., "Is the preview URL actually loading?"
- e.g., "Did the customer reply to the last draft?"
```

## Hard rules

1. **Always write the handoff file BEFORE pinging the receiver.** Don't say "passing to PM Agent" without the file landing first.
2. **Always include the latest commit SHA.** The receiver should be able to git-checkout that exact state if needed.
3. **Never assume the receiver has session memory.** Write the handoff as if they're a fresh agent (they probably are).
4. **Never overwrite a previous handoff file.** Append-only via numbering.
5. **Always include "verification questions"** — they prevent the receiver from acting on stale state.

## When handoffs happen (Day14 OS architecture)

| From | To | Triggered by |
|---|---|---|
| Build Agent | QA Agent | Preview deploy ready; before customer-send |
| QA Agent | PM Agent | QA pass complete; ready to draft customer email |
| PM Agent | Build Agent | Customer feedback received; needs code change |
| PM Agent | Jack | Approval card needs operator decision |
| Build Agent | Customer Success | Site launched; transition to maintenance |

## Inbound verification

When an agent receives a handoff, FIRST action is always:

1. Read the handoff file
2. Run the verification questions
3. If any verification fails → reply in a new handoff file marked "{NNN+1}-{to}-to-{from}-RETURN" with the failed check
4. If all pass → proceed; append "received and verified at {timestamp}" to the original handoff file

## Failure modes

- **Receiver acts without reading the handoff:** add to `postmortem-writer` the next time this happens — agent skill needs reinforcement
- **Verification questions can't be answered with available tools:** receiver surfaces to Jack via approval card; doesn't proceed on guesswork
- **Sender forgets to write a handoff:** receiver's first action should be to flag "I don't see a handoff from {sender}; please write one" rather than reconstruct

## Logging

`[YYYY-MM-DD HH:MM ET] agent-handoff WRITTEN → from: {agent}, to: {agent}, customer: {slug}, file: {path}`

When verified:
`[YYYY-MM-DD HH:MM ET] agent-handoff VERIFIED → file: {path}, by: {receiving-agent}`

## When invoked
- End of every distinct agent work session that hands off to another agent
- Beginning of every receiving agent's work session (to read the inbound)
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('agent-handoff', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'agent-handoff', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
