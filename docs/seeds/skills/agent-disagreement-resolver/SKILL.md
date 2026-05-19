---
name: agent-disagreement-resolver
description: When two Day14 OS agents disagree on the right action (e.g., Build Agent wants to ship, QA Agent wants to block), this skill defines the protocol. Almost always: escalate to Jack via approval card. Never let agents argue past 2 round trips.
triggers:
  - "agents disagree"
  - "agent conflict"
  - "QA blocks build"
  - "PM disagrees with Build"
---

# agent-disagreement-resolver

> Agents are aligned on outcomes but can diverge on means. The
> protocol below stops disagreements from becoming infinite loops.

## The 3-step protocol

### Step 1 — One round of clarification
The disagreeing agent writes a handoff (via `agent-handoff`) explaining:
- What it would do differently
- Why (cite the data / skill / rule)
- What it would prefer the other agent do instead

The originating agent responds with the same structure.

### Step 2 — Stop at 2 round trips
If the two agents are still disagreeing after each has stated their position once, **stop**. Don't iterate.

### Step 3 — Escalate to Jack
File an approval card titled:
`Agent disagreement — {customer-slug or topic}`

Card body:
```
**Agents in disagreement:** {agent-a} vs {agent-b}

**Topic:** {one-line description of the disputed action}

**{Agent-a}'s position:** {2-3 sentences, their reasoning}
**{Agent-b}'s position:** {2-3 sentences, their reasoning}

**What each would do if their position wins:** {specific actions}

**Why we're escalating:** Two round trips, no convergence. Operator
call needed.

**Default if no decision in 24h:** {one specific safe-fallback action,
typically the more conservative path}
```

## Examples (likely real ones)

### Build Agent vs. QA Agent
- Build: "Lighthouse 87 is fine; ship the preview"
- QA: "Lighthouse 87 is below our 90 threshold; investigate before ship"
- Resolution: QA's threshold is policy; QA wins unless Jack overrides

### PM Agent vs. Build Agent
- PM: "Customer asked for hero color change; draft as approval card"
- Build: "The change requires palette rebuild; surface as billable scope-creep"
- Resolution: Jack call. PM is closer to customer; Build is closer to scope. Either could be right.

### Build Agent vs. Customer Success
- Build: "Customer's site can't be edited until they reply to last email"
- CS: "Customer is asleep; the change is trivial; we should ship rough now"
- Resolution: Default to Build's caution unless Jack overrides.

## Hard rules

1. **Never let agents argue past 2 round trips.** Even if both are partially right, the 3rd round is wasted time.
2. **Never resolve disagreements by averaging.** Pick a winner or escalate. "Compromise" usually means both agents are wrong.
3. **Never escalate trivia.** "Should we use 'site' or 'website' in the email?" → action-bias-coach fires; ship one, iterate.
4. **Never tell Jack the disagreement is "minor" if it's costing him decision time.** A disagreement that hit escalation is by definition not minor.
5. **Always have a safe-fallback default** in the escalation card. Jack might not see it for hours.

## What constitutes "disagreement worth escalating"

Yes:
- Different recommendations on which approval card to file
- Different views on whether a quality gate has been met
- Different judgment on whether to ship rough vs. polish

No (resolved by skill, not escalation):
- One agent has a stale read of state → re-read state
- One agent missed a skill — read the skill, no disagreement now
- Disagreement about tone — `day14-voice` is canonical

## Logging

`[YYYY-MM-DD HH:MM ET] agent-disagreement-resolver → agents: {a, b}, topic: {brief}, round_trips: {N}, outcome: {resolved-internally|escalated-to-Jack}`

## When invoked
- An agent receives a handoff and disagrees with the sender's recommendation
- An agent's action would conflict with another agent's recent action
- A skill's "soft" recommendation conflicts with another skill's "hard" rule
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('agent-disagreement-resolver', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'agent-disagreement-resolver', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
