---
name: skill-version-bumper
description: When a skill's spec evolves substantively (new section, changed hard rule, expanded scope), bump its version + preserve the prior. Lets the empire iterate without losing institutional memory.
triggers:
  - "bump version"
  - "skill evolved"
  - "update skill spec"
  - "revise hard rule"
---

# skill-version-bumper

> Skills aren't static documents. They evolve as the agent + Jack
> learn what works. Without versioning, evolution erases history.
> With it, every prior version is a fallback + an audit trail.

## When to bump

Bump the version when any of:

1. A hard rule is added, changed, or removed
2. A new section is added (e.g., "Per-vertical adjustments")
3. The skill's scope materially expands (covers a new use case)
4. The skill's name changes (rename = version bump + alias)
5. The skill's parent_anchor changes

DON'T bump for:
- Typo fixes
- Reformatting
- Growth-hook auto-attachments
- Reordering bullets within a section

## The versioning scheme

Semver-like, in the SKILL.md frontmatter:

```yaml
---
name: approval-card-builder
version: 2.3.1
previous_version: 2.3.0
changed_at: 2026-08-15T14:32:00Z
change_reason: "Added per-customer urgency override based on growth-watcher pattern"
---
```

- **Major (X.0.0)**: removed a hard rule, changed scope significantly, breaking change
- **Minor (X.Y.0)**: added section, added hard rule, expanded scope (non-breaking)
- **Patch (X.Y.Z)**: clarified language, added example, added growth-hook

## Preserving the prior

Before writing the new SKILL.md, archive the prior version:

```
~/Documents/studio/docs/seeds/skills/{name}/SKILL.md            ← current
~/Documents/studio/docs/seeds/skills/{name}/versions/2.3.0.md   ← prior
~/Documents/studio/docs/seeds/skills/{name}/versions/2.2.0.md   ← older
...
```

Keep the last 5 minor versions. Older than that → archive separately or delete.

## The bump sequence

1. Read current SKILL.md, extract `version` from frontmatter (default to `1.0.0` if missing)
2. Determine bump type from the change classification
3. Compute new version
4. Move current SKILL.md → `versions/{old-version}.md`
5. Write new SKILL.md with updated frontmatter + content
6. Append entry to `~/Documents/studio/docs/skill-changelog.md`
7. Re-run `attach-growth-hook.sh` (in case the new version lost it)
8. Stage git commit

## The changelog

`~/Documents/studio/docs/skill-changelog.md`:

```
# Skill changelog

## 2026-08-15
- approval-card-builder 2.3.0 → 2.3.1 (patch)
  - Added "Per-customer urgency override" sub-section
  - Reason: growth-watcher detected 3 occurrences

## 2026-08-10
- day14-voice 1.5.0 → 2.0.0 (MAJOR)
  - Removed: "Sentence case for headings" hard rule
  - Added: "Customer-context-aware voice override" hard rule
  - Reason: per Council 0042 customer-voice-mapper decision
```

## Migration / breaking changes

A major bump = breaking change. Action items:

1. Surface to Jack as P1 (not P3) because downstream may break
2. Run `grep` for callers of this skill — every reference may need review
3. Update reference docs (day14-os-skills-and-empire.md)
4. After 30 days of stable major version, archive the prior major

## Hard rules

1. **Never silently change a skill.** Always bump.
2. **Always preserve the prior version.** Reversibility matters more than tidiness.
3. **Always update changelog.** Even patch versions get an entry.
4. **Never reuse a version number.** 2.3.0 means one thing forever; if you re-bump, it's 2.3.1.

## Failure modes

- **Skill has never been versioned** (no frontmatter version): treat current as 1.0.0; this bump becomes 1.0.1 or 1.1.0 per bump type
- **Versions/ dir doesn't exist**: create it
- **Multiple consecutive bumps in one day**: each gets its own entry; don't batch

## When invoked

- Inside `draft-promoter` when a draft replaces an existing skill (= bump)
- Manually when Jack edits a skill via Cowork
- Inside `skill-merge-suggester` when consolidating two skills (= bump on the surviving one)

## Logging

`[YYYY-MM-DD HH:MM ET] skill-version-bumper → skill: {name}, {old} → {new}, type: {major|minor|patch}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('skill-version-bumper', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'skill-version-bumper', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
