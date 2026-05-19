---
name: growth-cluster-gap-detector
description: Watches the 16-skill growth cluster for ad-hoc moments. Sibling of skill-gap-detector but scoped to the growth-system layer only. Supporting skill for meta-growth-watcher.
triggers:
  - "growth cluster ad-hoc"
  - "growth system stretched"
  - "meta gap"
---

# growth-cluster-gap-detector

> `skill-gap-detector` watches the domain layer.
> This skill watches the growth layer.
> Different scope, same protocol.

## Detection signals (meta-specific)

A growth-cluster gap is detected when ANY:

1. **A growth-cluster skill stretches** — growth-watcher.mjs encounters a case its current logic doesn't handle, falls back to ad-hoc
2. **A growth-cluster skill's output is ignored** — skill-spec-generator produces a draft that's archived without promotion 3+ times in a row, for the same pattern type
3. **A growth-cluster skill conflicts with another** — skill-naming-validator approves a name that skill-merge-suggester later flags as duplicate
4. **A growth-cluster pattern has no parent skill** — the cluster does X repeatedly but no growth-cluster skill names that operation
5. **A growth-cluster skill is dormant** — a meta-skill never fires (signal: maybe wrong scope, candidate for archive OR amend)

## How signals are extracted

This skill scans `work-register.jsonl` for entries where the `context` matches:

```regex
^(growth-watcher|skill-spec-generator|skill-registrar|...|meta-growth-watcher|growth-cluster-gap-detector)$
```

AND `is_meta` is true (per the `is_meta` flag added to work-register).

Entries matching this filter feed the gap-detection logic.

## The meta-log

A separate log at:
`~/Documents/businesses/_shared/growth/meta-gaps.md`

```
## {YYYY-MM-DD} — {meta-gap brief}

**Component:** growth-watcher.mjs
**Pattern:** the watcher consistently can't normalize phrases containing emoji or special chars
**Occurrences:** {count}
**Best-match existing meta-skill:** none
**Promote when:** observed 3+ times across 2+ growth-cluster components
**Risk:** medium (the normalization affects all downstream skills)
```

## Promotion threshold (stricter than domain)

Domain gaps promote at 2 occurrences across 2 contexts.
Meta gaps promote at 3 occurrences across 2+ growth-cluster components.

Why stricter:
- Meta-skills affect the growth-system architecture itself
- False positives cascade: bad meta-skill → bad draft template → 100 bad domain drafts
- High-bar evidence keeps the meta-cluster lean

## Anti-pattern: meta-gap inflation

Don't log:
- One-off errors in growth-watcher (those go to postmortem-writer, not meta-gap)
- Tuning that should be a config flag (lower threshold, etc.) — those go in `auto-promote-rules.json`
- Bug fixes in growth-cluster code — those are PRs, not meta-skills

DO log:
- Patterns where the growth-system reaches for a meta-skill that doesn't exist
- Repeated workarounds inside growth-cluster components
- Stretches the cluster does to fit edge cases

## Cross-pattern with skill-gap-detector

| Signal source | Pipes to |
|---|---|
| Domain agent ad-hoc | skill-gap-detector → domain draft |
| Growth-cluster ad-hoc | growth-cluster-gap-detector → meta draft |
| Growth-cluster stretch on existing meta-skill | gap-moment-logger with is_meta=true → meta sub-skill candidate |

The pipelines are parallel; they don't cross-feed except in `growth-metrics-dashboard` where both are reported.

## Hard rules

1. **Never auto-create meta-skills.** Surface as candidates only; meta-growth-watcher orchestrates.
2. **Always require 3+ occurrences across 2+ components.** Lower than that = anecdote.
3. **Always cite the source growth-cluster components.** Patterns from a single component might be that component's bug, not a meta-pattern.
4. **Don't log the meta-growth-watcher watching itself** (avoid infinite recursion in the log).

## Failure modes

- **All growth-cluster logging missing `is_meta` flag**: filter returns empty; surface to operator — code path not wired
- **Same meta-gap keeps appearing despite Jack rejecting**: pattern is real but Jack disagrees with promotion — surface to Council
- **Meta-gap detected but no recommendable skill**: log + watch; meta-growth-watcher will see when ready

## When invoked

- Continuously inside the growth-watcher.mjs daemon loop (same 5-min cadence)
- Inside `weekly-council-review` for meta-pattern aggregation
- Manually when Jack says "the growth system keeps doing X"

## Logging

`[YYYY-MM-DD HH:MM ET] growth-cluster-gap-detector → meta_signals: N, candidates_at_threshold: N, surfaced: N`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('growth-cluster-gap-detector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context, undefined, { is_meta: true })`. Feeds `meta-growth-watcher` recursively.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'growth-cluster-gap-detector', notes: 'failure_mode', is_meta: true })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
