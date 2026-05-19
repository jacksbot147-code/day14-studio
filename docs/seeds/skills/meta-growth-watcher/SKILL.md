---
name: meta-growth-watcher
description: The recursive layer of growth-always-on. Watches the growth system itself for ad-hoc patterns. When the growth cluster has 2+ gaps in its own behavior, this skill auto-drafts new growth-cluster skills. Empire grows the tools that grow the empire.
triggers:
  - "meta growth"
  - "growth system gap"
  - "growth cluster expansion"
  - "self-recursive growth"
---

# meta-growth-watcher

> growth-always-on grows the empire's domain skills. meta-growth-watcher
> grows the growth cluster ITSELF. Every recursion deepens the system.

## What it watches

The growth cluster (currently 16 skills) is a system. Like any system,
it has its own ad-hoc moments. Examples:

- growth-watcher.mjs encounters a phrase it can't normalize cleanly → ad-hoc judgment → meta-gap
- skill-spec-generator drafts a SKILL.md that's missing a section nothing else fills → meta-gap
- draft-promoter keeps rejecting drafts for the same reason → meta-gap
- skill-merge-suggester proposes 5 merges Jack rejects → meta-gap

These aren't customer-domain gaps. They're growth-system gaps. Different
pipeline, different drafts, different parent_anchor.

## The two-tier pipeline

```
Domain agent does work
       ↓
logAdHoc("watermark photo...", "customer-acme")    [meta=false default]
       ↓
growth-watcher (5 min)
       ↓
2+ patterns? → _drafts/{name}/ (domain skill)

VS

Growth-system component does work
       ↓
logAdHoc("merged drafts at 60% threshold...", "growth-watcher", { is_meta: true })
       ↓
meta-growth-watcher (also runs in growth-watcher.mjs, but separate scan)
       ↓
2+ patterns? → _drafts/_meta/{name}/ (meta-growth skill)
```

The `_drafts/_meta/` subdir keeps growth-cluster proposals separate from domain drafts so Jack's approval pipeline shows them with different urgency / tone.

## How meta gets flagged

Every `logAdHoc` / `logAction` accepts an optional `is_meta: true` flag.

Default: `false` (domain pattern).

The growth-cluster code that does logging passes `is_meta: true` when:
- Logging happens inside growth-watcher.mjs itself
- Logging happens inside draft-promoter, skill-registrar, etc.
- The work_phrase contains a growth-cluster skill name as a keyword
- The context starts with `growth-` or `skill-` (cluster components)

## The throttle (delegated to recursive-growth-throttle)

Meta-growth has higher risk of runaway. Hard caps:

- Max 1 new meta-skill per week
- Max 3 meta-skills in flight (in `_drafts/_meta/`) at any time
- A meta-skill candidate must have 3+ occurrences (not 2 — stricter for meta)

If thresholds exceeded: queue but don't draft. Surface to Jack via P1 ("meta-growth queue full").

## The draft template difference

Meta-growth drafts get extra frontmatter:

```yaml
---
name: {meta-skill-name}
description: ...
pack: meta-growth
parent_anchor: growth-always-on
is_meta: true
recurrence_risk: <0.0-1.0>  # how likely this spawns more meta-skills
---
```

The `recurrence_risk` score is computed by meta-growth-watcher based on how "infrastructural" the proposed skill is. >0.5 = surface to Council before promoting (high recursion risk).

## Hard rules

1. **Never let meta-growth happen unobserved.** Every meta-draft fires a P2 Telegram notification (not P3 like domain drafts) — Jack must consciously approve infrastructure changes.
2. **Always require 3+ occurrences for meta-drafts** (vs 2 for domain). Higher bar.
3. **Always surface recursion-risk** in the draft. Some meta-skills spawn more meta-skills; that's fine if intentional but must be visible.
4. **Never auto-promote meta-skills.** Even very-low-risk ones. Meta-growth touches the empire's growth architecture itself.
5. **Always log meta-drafts to a separate growth-log section** (`## Meta-growth proposals`) so the audit trail is distinct.

## Sample meta-skill candidates this watcher might surface

Based on observed growth-cluster behavior so far:

- `growth-watcher-error-handler` — when growth-watcher hits errors, what's the recovery pattern
- `draft-naming-conflict-resolver` — when two drafts get the same auto-generated name
- `growth-throttle-tuner` — adjusts the 2-occurrence rule per category based on outcome data
- `meta-skill-cluster-balancer` — keeps the growth cluster from outgrowing the rest of the empire
- `growth-velocity-curve-fitter` — predicts when growth will plateau / accelerate

## Failure modes

- **Meta-growth keeps drafting same near-skill repeatedly**: probably the SHOULD be the same skill — surface as merge candidate
- **Meta-drafts pile up because Jack ignores them**: meta-growth is high-leverage; if Jack's behind, the system itself is starved. Pause meta-growth until queue drains.
- **Recursive growth produces a draft that proposes growing meta-growth-watcher itself**: ALLOW but require Council. Self-modification is OK with deliberation.

## When invoked

- Continuously by growth-watcher.mjs alongside the domain scan (same poll cycle, different bucket)
- Manually when Jack notices "the growth system itself is doing X repeatedly"
- Inside `weekly-council-review` for meta-pattern surfacing

## Logging

`[YYYY-MM-DD HH:MM ET] meta-growth-watcher → meta_patterns_found: N, meta_drafts_created: N, in_flight: N/3`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('meta-growth-watcher', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context, undefined, { is_meta: true })`. Feeds `meta-growth-watcher` recursively.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'meta-growth-watcher', notes: 'failure_mode', is_meta: true })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
