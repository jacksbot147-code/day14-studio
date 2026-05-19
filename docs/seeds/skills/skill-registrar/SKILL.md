---
name: skill-registrar
description: Once a new SKILL.md is drafted + approved, this skill writes it to the seeds dir, updates bootstrap-day14-os.sh to seed it, and stages a git commit. Supporting skill for skill-tree-grower.
triggers:
  - "register new skill"
  - "add to bootstrap"
  - "seed new skill"
---

# skill-registrar

> Drafting a skill isn't enough. It has to land in the seeds dir,
> be picked up by bootstrap, and be committed to history. This skill
> handles all three mechanically.

## Inputs
- `skill_name` — kebab-case
- `skill_content` — the SKILL.md text (from `skill-spec-generator`)
- `is_supporter_of` — optional anchor skill name

## The 4-step sequence

### Step 1 — Write the seed file
```
~/Documents/studio/docs/seeds/skills/{name}/SKILL.md
```

If the directory already exists with a file: STOP. Surface as collision.

### Step 2 — Update bootstrap-day14-os.sh
The `for skill in ...; do` loop on line ~63 contains all skill names.

Append `{name}` to the loop — keep skills alphabetical within sections OR just append at the end. Either's fine for idempotency.

Verify with grep that the skill name is now in the loop.

### Step 3 — Update day14-os-skills-and-empire.md (if applicable)
If `is_supporter_of` is specified:
- Find the anchor in the empire docs cluster map
- Add the new supporter under the anchor's bullet list

If standalone: add to the appropriate pack section.

### Step 4 — Stage the git commit
```bash
cd ~/Documents/businesses/_shared
git add skills/{name}/SKILL.md
git commit -m "feat(skill): add {name} skill"
```

Note: don't `git push` — that requires Jack's hands and we're staying inside the "safe" boundary.

For the studio repo (where seeds live + bootstrap.sh lives):
- Stage: `git add docs/seeds/skills/{name}/ scripts/bootstrap-day14-os.sh`
- Commit: `git commit -m "feat: register skill {name}"`
- Don't push.

## Hard rules

1. **Never overwrite an existing SKILL.md.** Collisions surface to operator.
2. **Always verify bootstrap.sh changes** by re-reading the updated file before claiming success.
3. **Always commit** but **never push** without explicit Jack approval.
4. **Never register a skill that fails `skill-naming-validator`.** Block first.

## Failure modes

- **`bootstrap-day14-os.sh` doesn't have the expected loop**: surface; manual intervention
- **Skill name has hyphens that break sed/regex**: skill-naming-validator should have caught this
- **Git commit fails (uncommitted changes elsewhere)**: stash or surface; don't force

## Cross-skill flow

The full skill-grow chain:
```
skill-gap-detector → skill-tree-grower → skill-spec-generator
   ↓
skill-naming-validator → skill-registrar → pre-flight-verification-pass
   ↓
Jack approves via approval card → bootstrap re-runs → skill is live
```

## When invoked
- Inside `skill-tree-grower` after Jack's approval
- Manually when Jack hand-authors a SKILL.md and wants it registered
- Inside `re-harvest` cycles when promoting old gap-log entries

## Logging
`[YYYY-MM-DD HH:MM ET] skill-registrar → name: {name}, seed_path: {path}, bootstrap_updated: yes, committed: yes`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('skill-registrar', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'skill-registrar', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
