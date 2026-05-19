---
name: skill-spec-generator
description: Generate a draft SKILL.md file from a gap description + observed evidence. Follows the canonical 70-150 line format. Supporting skill for skill-tree-grower.
triggers:
  - "draft skill spec"
  - "generate SKILL.md"
  - "write skill file"
---

# skill-spec-generator

> Once a gap is confirmed real, this skill writes the SKILL.md. Same
> shape as every existing skill in the library — frontmatter, sections,
> hard rules, logging line. Predictable structure = easy to maintain.

## Inputs
- `name` — kebab-case skill name (validated by `skill-naming-validator`)
- `description` — 1-2 sentence purpose
- `triggers` — array of 3-5 trigger phrases (what makes this skill fire)
- `evidence` — array of {file/situation, brief} occurrences justifying the skill
- `pack` — optional grouping (build, ops, customer, etc.)
- `parent_anchor` — optional, if this is a support skill

## Output template

```markdown
---
name: {name}
description: {description}
triggers:
  - {trigger 1}
  - {trigger 2}
  - {trigger 3}
---

# {name}

> {Why this skill exists — 2 sentences. Mention the parent anchor if any.}

## When to invoke

{1-2 paragraphs on when this skill fires vs when it doesn't}

## Inputs
- {field}: {description}

## The protocol / mechanics

{1-3 steps or sections of how the skill operates}

## Output

{What the skill returns / writes / changes}

## Hard rules

1. {rule}
2. {rule}
3. {rule}

## Failure modes

- **{mode}**: {how to handle}

## When invoked
- {context 1}
- {context 2}

## Logging

`[YYYY-MM-DD HH:MM ET] {name} → {what gets logged}`
```

## Section requirements (every SKILL.md must have)

Mandatory sections, in order:
1. Frontmatter (name, description, triggers)
2. Opening quote/intent block (the `>` paragraph after the H1)
3. "When to invoke" or equivalent
4. At least one "Hard rules" section
5. "Failure modes" section
6. "When invoked" list
7. "Logging" line at the end

Optional but encouraged:
- Code examples (especially for code-generating skills)
- Tables for choice rules
- "Failure modes" list with specifics
- Cross-skill references to related skills

## Length budget

| Skill type | Target length |
|---|---|
| Anchor (orchestrator) | 120-200 lines |
| Support (specific function) | 60-120 lines |
| Anti-pattern guardrail | 40-80 lines |
| Pure-protocol (decision rules) | 80-150 lines |

If exceeding 200 lines: probably 2 skills; split.

## Voice rules

Same as every existing skill (matches the empire's accumulated style):
- Imperative voice ("Run the audit." not "The audit should be run.")
- Specific over general (cite real files, real patterns)
- Hard rules as numbered list, not paragraphs
- "Failure modes" use bullet shape `**{name}**: {how}`
- Logging line uses bracketed timestamp format

## How the skill is invoked

When `skill-tree-grower` calls this:

```typescript
const draft = await generateSkillSpec({
  name: "discount-rejection-template",
  description: "...",
  triggers: ["...", "...", "..."],
  evidence: [
    { situation: "Customer X asked for 30% off on 2026-01-12", file: "..." },
    { situation: "Customer Y...", file: "..." },
    { situation: "Customer Z...", file: "..." },
  ],
  pack: "pricing",
  parent_anchor: "pricing-decision-helper",
});

// Returns the SKILL.md string, ready for skill-registrar to write
```

## Hard rules

1. **Never generate a SKILL.md without 3+ evidence entries.** Justify why it's needed.
2. **Always include the `triggers` block in frontmatter** — that's how agents find the skill.
3. **Never use placeholder text like "TBD" or "fill in"** — generate complete drafts.
4. **Always include logging line at the end** — observability is non-optional.
5. **Always cross-reference the parent_anchor** if specified, by inline mention.

## Failure modes

- **Evidence is thin (only 2 occurrences but compelling)**: surface to operator; let Jack decide whether to lower the 3-occurrence rule for this case
- **Skill name conflicts with existing**: defer to `skill-naming-validator`; rename or merge
- **Skill spec wants to be 300+ lines**: split into 2 skills; one anchor + 1 support

## When invoked
- By `skill-tree-grower` when a gap promotes to skill
- Manually when Jack drafts a skill via Cowork

## Logging
`[YYYY-MM-DD HH:MM ET] skill-spec-generator → name: {name}, length: {lines}, evidence_count: {N}, pack: {pack}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('skill-spec-generator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'skill-spec-generator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
