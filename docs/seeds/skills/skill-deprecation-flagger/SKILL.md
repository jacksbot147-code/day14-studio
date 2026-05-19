---
name: skill-deprecation-flagger
description: The pruning counterpart to growth. When a skill goes 90+ days without firing, this skill flags it for archive. Prevents the empire from bloating with dead weight.
triggers:
  - "skill dormant"
  - "never fires"
  - "deprecate skill"
  - "archive candidate"
---

# skill-deprecation-flagger

> Growth-always-on adds skills constantly. Without pruning, the
> library bloats. This skill catches the dead weight before it accumulates.

## The 90-day rule

A skill is "deprecation candidate" if ALL true:

1. **Zero invocations** in past 90 days (per `skills_invoked` table or work-register)
2. **NOT on the expected-dormant allowlist** (see `skill-invocation-monitor` for the list — storm skills off-season, etc.)
3. **NOT a recently-created skill** (within last 30 days — too young to judge)
4. **Has been actually deployable** (not a future-phase spec sitting idle)

## What "flagged" means

Different from archived. Flagged = surfaced for Jack's review. Three outcomes possible:

| Outcome | When |
|---|---|
| **Keep** | Jack says "still relevant, just hasn't been needed yet"; reset 90-day clock |
| **Amend** | Skill exists but the triggers are wrong; rewrite + reset |
| **Archive** | Move to `~/Documents/businesses/_shared/skills/_archived/{name}/`; remove from bootstrap loop |
| **Delete** | Only for skills that were genuinely a mistake; rare |

Default: keep until Jack actively decides.

## The flagging cycle

Monthly (1st of month):

1. Query `skills_invoked` for invocations in last 90 days
2. Cross-reference with installed skills list (from bootstrap or directory listing)
3. Compute zero-invocation candidates
4. Filter against expected-dormant allowlist
5. Filter against age (skip <30 day old)
6. Output report to `~/Documents/studio/docs/skill-deprecation-{YYYY-MM}.md`

## The report shape

```
# Skill deprecation flag — {month}

## Candidates flagged: {N}

| Skill | Last fired | Days dormant | Recommendation |
|---|---|---|---|
| skill-foo | 2025-12-01 | 142 | Archive (likely superseded by skill-bar) |
| skill-baz | never | 95 | Amend triggers — purpose unclear |
| skill-quux | 2026-01-15 | 95 | Keep — clearly seasonal pattern |

## Expected-dormant skills (skipped)
- storm-week-comms: dormant Dec-May (correct)
- chemistry-reading-parser: dormant until pool customer onboards (correct)
- ...

## Recommended actions (rank-ordered)
1. **Archive 2 skills** — both have replacements; clean removal
2. **Amend 1 skill** — triggers don't match what it actually does
3. **Keep 1 skill** — pattern likely returns

Each surfaced as approval card → Jack approves → archive/amend skill takes over.
```

## The expected-dormant allowlist

Skills that legitimately go dormant for stretches. Hard-coded in
`~/Documents/businesses/_shared/growth/expected-dormant.json`:

```json
{
  "skills": [
    {"name": "storm-week-comms", "dormant_months": [12, 1, 2, 3, 4, 5]},
    {"name": "evacuation-zone-mapper", "dormant_months": [12, 1, 2, 3, 4, 5]},
    {"name": "post-storm-damage-assessor", "dormant_months": [12, 1, 2, 3, 4, 5]},
    {"name": "hurricane-watch-poller", "dormant_months": [12, 1, 2, 3, 4, 5]},
    {"name": "chemistry-reading-parser", "reason": "no pool customer yet"},
    {"name": "case-study-writer", "reason": "no Day14 customer launched yet"},
    {"name": "launch-day-customer-email", "reason": "no Day14 customer launched yet"},
    {"name": "complaint-escalation", "reason": "GOOD if dormant — no complaints"}
  ]
}
```

These bypass the 90-day check.

## Archive mechanics

When Jack approves archive for skill `foo`:

1. Move `~/Documents/studio/docs/seeds/skills/foo/` → `_archived/foo/`
2. Add timestamped frontmatter:
   ```
   archived_at: 2026-08-15T...
   archive_reason: "superseded by bar; 142 days dormant"
   reversible: yes
   ```
3. Remove `foo` from bootstrap.sh skills loop
4. Run bootstrap to clear it from `_shared/skills/`
5. Append to growth-log.md: archive event

Reversible: archived skills can be unarchived by reversing steps 1-4.

## Hard rules

1. **Never auto-archive** without Jack's tap. Surfacing is automatic; archiving is not.
2. **Always check expected-dormant allowlist first.** Storm skills are not bloat — they're season-bound.
3. **Always include "Recommendation" rank** in the report. Spell out the action verbatim.
4. **Preserve archived skills indefinitely.** Storage is cheap; rediscovery happens.

## Failure modes

- **Skill is dormant because nothing's wired up to invoke it**: not a skill problem; bug in the wiring. Surface as code fix, not deprecate.
- **Skill is dormant because Jack hasn't reviewed Telegram drafts**: that's the drafts dir, not deprecation. Different problem.
- **Skill name in the expected-dormant list doesn't exist anymore** (renamed/archived): clean up the allowlist itself

## When invoked
- Monthly (1st of month) scheduled task
- After bulk skill additions (e.g., a harvest round adds 15 skills; some may already overlap dormant ones)
- Manually when Jack asks "what's dead weight in the library?"

## Logging

`[YYYY-MM-DD HH:MM ET] skill-deprecation-flagger → candidates: {N}, archive_recommended: {N}, amend_recommended: {N}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('skill-deprecation-flagger', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'skill-deprecation-flagger', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
