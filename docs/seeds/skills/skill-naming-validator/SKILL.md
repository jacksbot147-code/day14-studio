---
name: skill-naming-validator
description: Enforces Day14's skill-naming conventions. Catches collisions, formatting violations, and ambiguous names BEFORE skill-registrar writes anything. Supporting skill for skill-tree-grower.
triggers:
  - "validate skill name"
  - "name collision check"
  - "kebab case"
---

# skill-naming-validator

> 150+ skills accumulated. Naming convention drift = bad search,
> bad triggers, bad documentation. This is the gate.

## The validation rules

### Format
- **kebab-case only** — lowercase letters + digits + hyphens
- No spaces, no underscores, no camelCase
- No leading/trailing hyphens, no double hyphens
- Length 3-50 characters

### Shape
- **Action-oriented**: prefer verb-noun ("approve-card") or noun-purpose ("warmth-calibrator")
- Avoid pure nouns ("approval-card" works; "approval" alone too vague)
- Avoid -er-ending overload (more than 60% of skills shouldn't end in -er)

### Anti-patterns
- ❌ `manage-things` (vague)
- ❌ `helper` (too generic)
- ❌ `utility-1` (numbered)
- ❌ `do-stuff` (placeholder)
- ❌ `customer_data_processor` (snake_case)
- ❌ `theBestSkill` (camelCase)
- ❌ `🚀-skill` (emoji)

### Collision check
Verify the proposed name doesn't match:
- Any existing skill in `~/Documents/studio/docs/seeds/skills/` (exact match)
- Any installed skill in `~/Documents/businesses/_shared/skills/` (exact match)
- Any skill in `~/Documents/businesses/{tenant}/skills/` (tenant-specific)
- Any skill in `~/Documents/studio/docs/day14-os-skills-and-empire.md` (planned)

Near-misses worth flagging (≥80% similarity):
- Levenshtein distance ≤ 2 from existing → warn
- Same first word + similar second → warn
- Same prefix family (e.g., `customer-X` skills) → confirm fits the family pattern

### Conventional prefixes (informal, not enforced)

| Prefix | Domain |
|---|---|
| `customer-*` | customer-lifecycle operations |
| `telegram-*` | Telegram bridge skills |
| `vercel-route-*` | API route handlers |
| `dossier-*` | customer dossier ops |
| `no-*` | anti-pattern guardrails |
| `council-*` | LLM Council protocol |
| `daily-*` | daily-cadence operations |
| `weekly-*` | weekly-cadence operations |
| `nightly-*` | nightly-cadence operations |

Use existing prefixes when the new skill fits. Invent new prefixes sparingly.

## The check sequence

For input name N:

```
1. format_ok = /^[a-z][a-z0-9\-]{2,49}[a-z0-9]$/.test(N) && !N.includes('--')
2. shape_ok = N contains a verb OR ends in a noun-purpose word
3. collision = check 4 listed locations
4. near_miss = scan for similarity to existing skills
5. prefix_check = if uses conventional prefix, verify fits family
```

Output:
```
VALIDATION

✓ Format: pass
✓ Shape: pass (verb-noun: "validate-name")
✓ Collision: none
⚠️ Near-miss: "naming-validator" exists; rename to differentiate
  Suggestions: skill-naming-validator (proposed), skill-name-gate, skill-name-linter
- Prefix family: matches "skill-*" cluster (5 existing siblings)
```

If any FAIL: BLOCK the registration. Surface to operator with suggested fixes.

## Hard rules

1. **Never approve a name with format violations.** No exceptions.
2. **Always run all 5 checks**, even when one obviously fails. The full report helps.
3. **Always offer 2-3 alternatives** when a name fails. Don't just reject.
4. **Suggest absorbing into existing skill** when similarity is high — sometimes the right move is "amend X, not create Y."

## Failure modes

- **Skill name perfectly fits an existing skill's coverage** (true semantic duplicate): block; recommend amending the existing skill
- **Skill name fits but feels redundant with an anchor**: surface for "support skill of X?" question
- **Name passes but is genuinely bad** (formal-but-vague): can't catch all; rely on Jack's eye

## When invoked
- Inside `skill-registrar` before writing the seed file
- Manually when Jack proposes a name
- Inside `skill-tree-grower` after `skill-spec-generator` produces a name

## Logging
`[YYYY-MM-DD HH:MM ET] skill-naming-validator → name: {name}, result: {pass|fail}, warnings: {N}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('skill-naming-validator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'skill-naming-validator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
