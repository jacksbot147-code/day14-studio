---
name: growth-skill-spec-generator
description: The meta-version of skill-spec-generator. Drafts SKILL.md for proposed growth-cluster skills. Different template — includes recurrence_risk, is_meta frontmatter, infrastructure considerations. Supporting skill for meta-growth-watcher.
triggers:
  - "draft meta skill"
  - "growth-cluster spec"
  - "meta SKILL.md"
---

# growth-skill-spec-generator

> `skill-spec-generator` produces drafts for domain skills.
> This skill produces drafts for growth-cluster skills.
> Meta drafts have different structure + higher bar.

## Differences from base spec-generator

| Aspect | Domain spec | Meta spec |
|---|---|---|
| Frontmatter `pack` | varies (customer, ops, etc.) | always `meta-growth` |
| `parent_anchor` | usually a domain anchor | always `growth-always-on` or a sub-cluster anchor |
| `is_meta` field | absent or false | always `true` |
| `recurrence_risk` field | absent | required, 0.0-1.0 |
| Triggers | customer/ops vocabulary | growth-cluster vocabulary |
| Length | 60-150 lines | 80-200 lines (more architecture context) |
| Section: "Sample meta-patterns this catches" | n/a | required |
| Section: "Infrastructure dependencies" | optional | required |
| Section: "Recursion guard" | n/a | required (how this skill prevents spawning runaway sub-skills) |

## Output template

```markdown
---
name: {meta-skill-name}
description: {what + why}
pack: meta-growth
parent_anchor: growth-always-on
is_meta: true
recurrence_risk: 0.X
triggers:
  - "trigger 1"
  - "trigger 2"
  - "trigger 3"
---

# {meta-skill-name}

> {2-sentence intent — must explain why this is a meta vs domain skill}

## When this fires

{Describe the growth-system situation that triggers this skill}

## The protocol

{Steps. For meta-skills, often involves cross-referencing the work-register + the growth-log}

## Inputs

{Usually file paths + growth-cluster state, not customer data}

## Outputs

{What gets written / which growth-cluster file gets updated}

## Hard rules

{Same shape as domain skills}

## Infrastructure dependencies

{Required: which growth-cluster components must exist for this skill to function}

## Recursion guard

{Required: explicit description of how this skill prevents itself from spawning more meta-skills uncontrollably}

## Sample meta-patterns this catches

{Required: 2-3 concrete examples of growth-system patterns that would trigger this}

## Failure modes

{Same shape}

## When invoked

{Almost always: meta-growth-watcher fires it; never customer-facing}

## Logging

`[YYYY-MM-DD HH:MM ET] {name} → ...`
```

## Recurrence risk computation

For each proposed meta-skill, compute risk based on:

- **Does this skill propose creating other skills?** (e.g., a meta-skill that drafts more meta-skills) → +0.3
- **Does this skill modify how growth-watcher operates?** → +0.2
- **Does this skill change thresholds or rules globally?** → +0.2
- **Does this skill add a new logging dimension?** → +0.1
- **Does this skill just observe / log?** → +0.0

Sum, cap at 1.0.

- **risk < 0.3** → safe to auto-draft + Telegram P3
- **risk 0.3-0.5** → draft + Telegram P2 (visible)
- **risk 0.5-0.7** → draft + Telegram P1 + require Council review
- **risk > 0.7** → don't draft; surface as design question to Jack via P0 if recurring

## Hard rules

1. **Never produce a meta-skill with `recurrence_risk` unknown.** Default = 1.0 if uncertain (forces review).
2. **Always include "Infrastructure dependencies" and "Recursion guard" sections.** These are non-optional for meta-skills.
3. **Always link to the evidence** (meta-gap entries) that justified the draft.
4. **Never produce a meta-skill that doesn't have at least one explicit "Sample meta-pattern"** with citation.

## How the generator decides triggers

For meta-skills, triggers are vocabulary internal to the growth cluster:

- "the watcher hit X" (growth-watcher operational vocabulary)
- "draft was archived 3x" (draft-promoter outcomes)
- "skill merged with Y" (skill-merge-suggester actions)
- "version bumped to N" (skill-version-bumper actions)

NOT customer-facing vocabulary. Meta-skills fire from inside the cluster, never from a customer interaction.

## Failure modes

- **Recurrence_risk can't be computed cleanly**: default to 1.0; surface as "Jack must classify before draft proceeds"
- **Generated spec is >200 lines**: split into multiple meta-skills (with documented relationship)
- **Generated spec lacks Recursion guard section**: refuse to generate; flag for Jack's input

## When invoked

- Inside `meta-growth-watcher` when a meta-gap reaches threshold (3+ occurrences across 2+ components)
- Manually when Jack drafts a meta-skill via Cowork

## Logging

`[YYYY-MM-DD HH:MM ET] growth-skill-spec-generator → name: {name}, recurrence_risk: {N}, length: {lines}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('growth-skill-spec-generator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context, undefined, { is_meta: true })`. Feeds `meta-growth-watcher` recursively.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'growth-skill-spec-generator', notes: 'failure_mode', is_meta: true })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
