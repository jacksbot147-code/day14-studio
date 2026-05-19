---
name: emergent-skill-graduator
description: Promote recurring one-off actions into reusable skills. When the agent does the same thing 3+ times without a skill backing it, this skill notices and pulls in skill-tree-grower. The accumulator of the self-expanding system.
triggers:
  - "we keep doing this"
  - "3rd time"
  - "promote to skill"
  - "this is becoming routine"
---

# emergent-skill-graduator

> Some skills are designed top-down (from a doc). Others emerge —
> the agent does X once because Jack asked, then a second time, then
> a third. By the third, it's a pattern. This skill catches that.

## The graduation criteria

A behavior is "emergent skill candidate" when it meets ALL:

1. **Repetition count** ≥ 3 across distinct contexts
2. **Same shape** — same inputs / outputs / decision tree across the 3 occurrences
3. **Not currently a skill** — no existing skill covers it
4. **Not customer-specific** — applies across 2+ customers OR is a Day14-level operation

## The detection method

Two ways:

### Pattern 1 — agent self-report
Every time the agent does substantive work, log to a "work register":

```jsonl
{"timestamp":"...","action":"watermark photo + resize + upload","context":"customer-abc visit"}
{"timestamp":"...","action":"watermark photo + resize + upload","context":"customer-xyz visit"}
```

At end of each session, this skill scans for action patterns repeating 3+. Each promotion candidate gets flagged.

### Pattern 2 — postmortem analysis
After `pattern-recurrence-detector` flags a 3+ failure pattern, check inverse:
- For the FIX, did the same fix appear 3+ times?
- If yes: the FIX is the candidate skill (not just the prevention).

## The work register

A simple append-only log at:
`~/Documents/studio/docs/work-register.jsonl`

Each line: `{timestamp, action_phrase, context, agent_name?, customer_slug?}`

The "action_phrase" is short (8-15 words) describing what the agent did.

Pattern detection runs nightly:
```bash
sort work-register.jsonl | uniq -c -f3 | awk '$1 >= 3 { print }' | head -20
```

Each frequent-action becomes a graduation candidate.

## Graduation proposal

For each candidate, the skill produces:

```
# Graduation candidate: {action_name}

**First seen:** {date}
**Occurrences:** {N}
**Contexts:** {list of slugs / sessions}

**Proposed skill:**
- Name: {kebab-case-name}
- Pack: {best guess}
- Triggers: {3-5 inferred phrases}

**Justification:**
- Why this should be a skill (vs continuing ad-hoc)
- What the skill would automate
- Estimated time saved per future invocation

**Action:** Surface to Jack as approval card.
```

Approved → `skill-tree-grower` takes over.

## Hard rules

1. **Never auto-graduate without Jack's approval.** Surface, don't act.
2. **3+ rule is non-negotiable.** Don't lower it.
3. **Always provide concrete "evidence" entries** — the 3+ occurrences with timestamps.
4. **Don't promote variations as one skill.** If 3 occurrences differ meaningfully, they're 3 different patterns.

## What does NOT graduate

- One-off creative work (writing a unique blog post for customer A)
- Customer-specific configuration (Acme Pool wants this; nobody else)
- Highly judgmental decisions (those use `council-decision`)
- Decisions covered by existing skill but tuned per customer

## How this interacts with rest of self-expanding system

```
work-register.jsonl ←── agent logs actions
       ↓
emergent-skill-graduator (this) ←── scans for 3+ patterns
       ↓
skill-tree-grower ←── orchestrates the build
       ↓
skill-spec-generator → skill-registrar → committed
```

## Failure modes

- **Same action logged 10 times in one session**: not 3 distinct contexts; reject
- **Action phrase varies slightly** (e.g., "watermark photo" vs "stamp brand on image"): cluster by similarity, not exact match; threshold = 80% phrase overlap
- **Action is "ad-hoc judgment"**: doesn't promote; surfaces as Council candidate instead

## When invoked
- Nightly scheduled task scans work-register.jsonl
- Inside `weekly-council-review` aggregate pass
- Manually when Jack says "we should make a skill for X"

## Logging
`[YYYY-MM-DD HH:MM ET] emergent-skill-graduator → patterns_found: {N}, promotion_candidates: {N}, surfaced_to_jack: {N}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('emergent-skill-graduator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'emergent-skill-graduator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
