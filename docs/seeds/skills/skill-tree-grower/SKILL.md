---
name: skill-tree-grower
description: The meta-anchor of the self-expanding skill system. When an agent encounters a gap (situation no current skill covers), this skill orchestrates the creation of new skills + their supporters. The empire grows itself.
triggers:
  - "no skill for this"
  - "need a new skill"
  - "skill gap"
  - "extend the empire"
  - "this should be a skill"
---

# skill-tree-grower

> 156+ skills is a lot. But customer #5 will surface a need none of
> them cover. Without self-expansion, Jack has to manually author
> every new skill. With it, the agent proposes + drafts + registers
> + commits — Jack just approves.

## The expansion protocol

When the agent hits a gap (detected by `skill-gap-detector`):

### Step 1 — Confirm the gap is real
Cross-check with `skill-coverage-auditor`:
- Search existing skills for similar coverage by name + triggers + description
- If a near-match exists (>80% overlap): use the existing skill; don't grow
- If <80% overlap: confirmed gap; proceed

### Step 2 — Determine the right shape
Is this a:
- **Standalone skill** — one self-contained capability
- **Supporting skill for an existing anchor** — part of an existing cluster
- **New anchor + 3 supports** — entirely new domain

Use `skill-promotion-criteria` to validate (must meet 3-occurrence rule).

### Step 3 — Draft via skill-spec-generator
Generate the SKILL.md(s) using the canonical 70-150 line tight format.

### Step 4 — Validate naming
Run through `skill-naming-validator`:
- kebab-case
- No collision with existing 150+ skills
- Action-oriented (verb-first or noun phrase)
- Conventional package prefix if applicable

### Step 5 — Register via skill-registrar
- Write SKILL.md to `~/Documents/studio/docs/seeds/skills/{name}/`
- Update `bootstrap-day14-os.sh` to seed the new skill(s)
- Stage a git commit (don't push without Jack's tap)
- Surface as approval card: "New skill drafted. Approve to seed + commit?"

### Step 6 — Verify with pre-flight-verification-pass
After Jack approves: re-run bootstrap; confirm skill landed in `_shared/`.

## When to grow (vs. when not to)

Grow IF:
- The gap has been hit 3+ times (use `emergent-skill-graduator` as detector)
- The gap is meaningful (not a one-off edge case)
- An LLM can express the skill in 70-150 lines (anything bigger is multiple skills)
- The skill has clear triggers (not "use this when something feels off")

Don't grow IF:
- The gap can be filled by amending an existing skill
- The "gap" is really a code bug (postmortem-writer territory)
- The pattern is one-customer-specific (lives in tenant code)
- Jack hasn't seen the pattern enough to confirm it's real

## The "3-occurrence" rule

A pattern qualifies for promotion ONLY when:
- Observed 3+ times in distinct contexts (different customers, different sessions, different days)
- Each occurrence had the same underlying need
- No existing skill could be amended to cover all 3

Below 3 occurrences = log + watch. Don't promote prematurely.

## Cross-cluster awareness

If the new skill needs to plug into an existing cluster:
- Update the anchor skill's SKILL.md to reference the new support
- Update the anchor's cluster map in `~/Documents/studio/docs/day14-os-skills-and-empire.md`
- Surface to Jack so the cluster map stays current

## Hard rules

1. **Never auto-create a skill** without Jack's approval (per approval-card-builder).
2. **Never write a skill spec >200 lines.** If it wants to be longer, it's actually 2 skills.
3. **Always name the parent anchor explicitly** for support skills.
4. **Always include the 3+ occurrences as evidence** in the draft skill's "Why this skill exists" section.

## Failure modes

- **Gap detector keeps firing on same situation, but Jack rejects every proposal**: the pattern isn't real OR Jack's preference is to handle it inline. Pause growth for that pattern; surface to Council.
- **New skill conflicts with existing one (naming or scope)**: surface to Jack as ambiguous; have him choose merge vs. split.
- **Bootstrap re-run fails after registering**: roll back the registration; surface the error.

## When invoked
- Detected by `skill-gap-detector` during normal agent operation
- Manually via `/grow-skill <description>` Telegram command (future)
- Inside `pattern-recurrence-detector` when a 3+ pattern surfaces

## Logging
`[YYYY-MM-DD HH:MM ET] skill-tree-grower → gap: {brief}, action: {draft|amend|skip}, new_skill: {name|null}, approved_by_jack: {yes|no|pending}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('skill-tree-grower', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'skill-tree-grower', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
