---
name: phase-numbered-cross-reference
description: Every recommendation, action, and skill maps to a specific phase in the active agenda (e.g., "Phase 4.2 webhook layer" or "Week 2 of laptop-interim plan"). Lets Jack see at-a-glance whether a piece of work is on-plan or scope-creep.
triggers:
  - "what phase"
  - "is this on plan"
  - "agenda reference"
---

# phase-numbered-cross-reference

> Day14 OS has three active agendas:
> - `day14-os-laptop-interim-plan.md` (Week 1-6 toward Mac mini)
> - `day14-os-autonomous-agenda.md` (Phase 1-6 toward Telegram + full auto)
> - `day14-agenda.md` (6-month roadmap toward full-time)
>
> Any work the agent does should map to a specific (agenda, phase, step).
> If it doesn't, it's scope-creep.

## The required suffix

Every recommendation, every skill-creation, every scheduled-task gets a phase tag:

```
[Phase {N}.{M} | Week {W} | Out-of-agenda]
```

Examples:
- `[Phase 1.3 of autonomous agenda]`
- `[Week 1 of laptop-interim plan]`
- `[Out-of-agenda — emergent]`

The "Out-of-agenda — emergent" tag is OK but should trigger a check: is this worth doing? Why now?

## What "on-plan" means

A recommendation is on-plan if it matches a numbered phase in one of the three agendas. Specifically:

| Tag | Status |
|---|---|
| Phase 1.X of autonomous | active build; Phase 1 = Telegram core |
| Week N of laptop-interim | active; N = current week |
| 6-month roadmap step N | strategic; not week-specific |
| Out-of-agenda — emergent | tactical pickup; should be brief |
| Out-of-agenda — speculative | likely scope-creep; defer or surface to Council |

## The check

When the agent is about to propose new work:

1. Identify which agenda(s) it could fit in
2. Tag with phase number if any match
3. If "out-of-agenda" and >30 min effort → surface as "should we add this to the agenda or defer?"
4. If "out-of-agenda" and <15 min → proceed but note it

## Example outputs

### On-plan
```
Recommendation: Build the next 3 supporting skills for `telegram-status-pusher`.

[Phase 3.2 of autonomous agenda]
Budget: 30 min
Gates: none
Confidence: 0.92
```

### Emergent but tracked
```
Recommendation: Add a `voice-secret-scanner` skill (block secrets from telegram outbound).

[Out-of-agenda — emergent, but addresses Phase 1 security risk]
Budget: 15 min
Gates: none
Confidence: 0.95
```

### Scope creep flag
```
Recommendation: Build an automated podcast-publishing skill.

[Out-of-agenda — speculative]
Defer suggested. None of the active 3 agendas require this in next 30 days.
```

## Hard rules

1. **Every substantive recommendation gets a phase tag.** Tiny one-line answers don't need it.
2. **"Out-of-agenda — speculative" is a soft block.** Don't proceed without checking with Jack.
3. **If multiple agendas contain the work**, tag the most-recent / most-relevant one.
4. **Quarterly**, audit "Out-of-agenda — emergent" work. If a class of emergent work appears repeatedly, it should become an agenda item.

## When invoked
- Every recommendation surfaced to Jack
- Inside `daily-kickoff` for each priority
- Inside `confidence-and-gate-statement` (pairs with that skill — both fire together)

## Logging
`[YYYY-MM-DD HH:MM ET] phase-numbered-cross-reference → recommendation: {brief}, phase: {tag}`

Quarterly:
- % of work that was "on-plan" — target ≥80%
- "Out-of-agenda emergent" rate — target <15%
- "Out-of-agenda speculative" rate — target <5% (would-be scope creep)
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('phase-numbered-cross-reference', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'phase-numbered-cross-reference', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
