---
name: template-version-tracker
description: Track which version of each template each customer was forked from. When a template update lands, we know which customers might benefit from a rebase. Supporting skill for template-forker; the institutional memory layer.
triggers:
  - "template version"
  - "rebase customer"
  - "which template version"
  - "template diff"
---

# template-version-tracker

> Templates evolve. Customer #3 forks the template at v0.5. Template
> advances to v0.7 with a Lighthouse fix. Customer #3's site still
> runs v0.5. This skill knows that.

## What gets tracked

In `customers` table, add column (or use existing JSON field):
- `template_version_at_fork` — git SHA of the template's main branch when forked
- `template_name` — site / portal / platform

On every fork, `template-forker` records both.

Also maintain a registry at:
`~/Documents/businesses/_shared/templates/registry.md`

```
# Template Version Registry

| Template | Version | Released | Notes |
|---|---|---|---|
| studio-template-site | abc1234 | 2026-04-15 | initial release |
| studio-template-site | def5678 | 2026-05-01 | hero loading fix |
| studio-template-portal | 1a2b3c4 | 2026-05-10 | v0.1.0-partial; Pool→Item incomplete |
| studio-template-portal | 5d6e7f8 | 2026-05-20 | v0.2.0; full rename support |
```

Each template version is a tagged commit on the template repo's main branch. Tag names follow `v{semver}-{date}`.

## What this skill does

### Mode 1 — record on fork
Called by `template-forker`. Looks up current SHA of template main, records to:
- `customers.template_version_at_fork` (Supabase)
- `02-build-log.md` Day 0 entry

### Mode 2 — diff customer vs current template
Called manually or by nightly job. For each launched customer:
1. Look up `customers.template_version_at_fork`
2. Get current template main SHA
3. If different → run `git log {fork_sha}..{current_sha} --oneline` on template
4. Categorize the diff: bug fixes / new features / breaking changes
5. Surface to Jack as informational report; NOT auto-rebase

### Mode 3 — recommend rebase
For each customer with diff:
- **Bug fix in template since fork**: surface as opportunity (customer might want the fix)
- **New feature**: surface as upsell opportunity (use `upsell-detection`)
- **Breaking change**: surface as risk (customer's customizations may not survive)

## Output

Append to `~/Documents/studio/docs/template-status.md` (overwritten weekly):

```
# Template Status — {date}

## Current versions
- studio-template-site: {sha} ({date}, "{commit msg}")
- studio-template-portal: {sha} ({date}, "{commit msg}")
- studio-template-platform: {sha} ({date}, "{commit msg}")

## Customers on outdated forks
| Customer | Template | Forked at | Behind by | Diff type |
|---|---|---|---|---|
| acme-pool | site | abc1234 (2 weeks ago) | 5 commits | 1 bug fix + 2 chore |
| bonita-lawn | portal | 1a2b3c4 (1 month ago) | 12 commits | 1 breaking + 3 features + 8 chores |

## Recommended actions
- Send acme-pool the optional rebase offer (bug fix in Lighthouse score)
- Hold bonita-lawn at current version (breaking change risk; customer is stable)
```

## Hard rules

1. **Never auto-rebase a customer** to a new template version. Each rebase is a manual call.
2. **Never skip recording version on fork.** That's the entire foundation of this skill.
3. **Always tag template releases** with semver + date so the diff is human-readable.
4. **Never rebase a customer mid-build.** Only after launch + 14 days of stability.

## When invoked

- Mode 1: every time `template-forker` runs (auto)
- Mode 2 + 3: weekly via scheduled task
- Manually: "is {customer} on the latest template?"

## Logging

`[YYYY-MM-DD HH:MM ET] template-version-tracker → mode: {1|2|3}, customers_checked: N, behind: N, rebase_recommended: N`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('template-version-tracker', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'template-version-tracker', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
