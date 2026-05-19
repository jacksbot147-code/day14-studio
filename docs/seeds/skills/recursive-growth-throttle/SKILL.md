---
name: recursive-growth-throttle
description: The safety lid on meta-growth. Prevents the growth-cluster from spawning meta-skills faster than Jack can review them. Hard caps + circuit breakers. Without this, recursive growth spirals.
triggers:
  - "throttle meta growth"
  - "meta growth cap"
  - "growth runaway"
  - "circuit breaker"
---

# recursive-growth-throttle

> Self-improving systems are powerful. Self-improving systems
> without a throttle are runaway. This skill is the throttle.

## The hard caps

| Rule | Cap | Why |
|---|---|---|
| Meta-skills drafted per 7 days | 1 | Jack can review 1 infrastructure change/week |
| Meta-skills in flight (`_drafts/_meta/`) | 3 | Queue depth Jack can hold in head |
| Meta-skills promoted per 30 days | 2 | Architecture changes need bedding-in time |
| Meta-skills with recurrence_risk > 0.7 | 0 (block) | Self-modifying skills require Council |
| Total meta-cluster size | 30 skills | Beyond this, signal-to-noise drops |
| Meta-skills per cluster anchor (growth-always-on supports) | 12 | Already at this; tighten threshold to "merge over add" |

If any cap exceeded: PAUSE meta-growth. Surface to Jack via P1.

## The circuit breaker

A circuit breaker auto-engages when ANY:

- 3+ meta-drafts in 7 days (faster than the cap; pre-emptive)
- 2+ meta-skills got promoted then archived within 14 days (signal: drafts weren't ready)
- A meta-skill produced a draft that itself triggered meta-growth (recursion observed)
- `growth-watcher.mjs` heartbeat shows >10x normal activity (volume spike — likely bug)
- Jack hasn't reviewed pending meta-drafts in 14+ days (engagement gap)

When tripped:
1. Set `_shared/growth/meta-circuit-state.json` to `{"open": true, "since": "...", "reason": "..."}`
2. Pause `meta-growth-watcher` execution
3. Drain queue: process pending meta-drafts normally; just don't add new ones
4. P0 notification to Jack: "Meta-growth paused — review queue + decide reset"

To reset: Jack types `/growth-reset` or manually edits the state file.

## Why a throttle (not just thresholds)

Thresholds are static. Throttles + circuit breakers adapt:

- If Jack is engaged, drafts get reviewed, system runs near caps
- If Jack is busy/away, the system self-pauses rather than piling up infrastructure changes
- If the system shows runaway behavior, it stops itself before the user has to

The throttle is the safety property that makes recursive growth safe.

## Adaptive cap tuning (slow, with audit)

After 90 days of operation, the throttle's caps can shift based on outcomes:

- **Meta-skills promoted with 0 reversals**: raise cap slowly (e.g., 1/wk → 1.5/wk)
- **Meta-skills promoted then archived**: lower cap (1/wk → 0.5/wk)
- **Circuit breaker trips repeatedly**: lower all caps; surface to Council for redesign

Always: surface tuning proposals to Jack; never auto-tune the throttle itself.

## Hard rules

1. **The throttle's own thresholds NEVER auto-modify.** Even via meta-growth. Threshold changes require Council.
2. **Never bypass the throttle** for "urgent" meta-skills. Urgency at the meta layer = wait + design properly.
3. **Always log throttle decisions** to `~/Documents/businesses/_shared/growth/throttle-log.md`. Audit trail of every block.
4. **Always surface circuit breaker trips to Jack** as P0. He needs to know the system paused itself.
5. **Never include the throttle's logic INSIDE a meta-skill it would block.** Recursion through itself = unstable.

## Why caps differ from domain growth

Domain growth caps (in `growth-always-on`):
- 2-occurrence rule for drafts (low bar)
- Drafts pile up to dozens
- Telegram P3 (no buzz)

Meta growth caps (here):
- 3-occurrence rule for drafts (higher bar)
- 1 draft/week max
- Telegram P2 (visible; Jack should notice)

Reason: domain skills are about Day14's customers. Meta-skills are about Day14 OS's architecture. Architecture moves slowly.

## Failure modes

- **Circuit breaker won't reset** (state file corrupted): manual fix; ship `/growth-reset` as a Telegram command
- **Throttle stops legitimate meta-growth**: surface to Council; reconsider cap
- **Throttle never trips even though things feel out of control**: caps are too loose; tighten + surface for Council review

## When invoked

- Inside `meta-growth-watcher` before every meta-draft creation
- Inside `growth-watcher.mjs` daemon as a pre-check
- Manually when Jack runs `/growth-status` Telegram command
- Inside `weekly-council-review` to surface throttle trend

## Logging

`[YYYY-MM-DD HH:MM ET] recursive-growth-throttle → action: {pass|block}, cap: {which}, current: {N}, limit: {N}`

When circuit breaker trips:
`[YYYY-MM-DD HH:MM ET] 🔴 recursive-growth-throttle CIRCUIT BREAKER TRIPPED — reason: {one-line}, action: PAUSE meta-growth-watcher`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('recursive-growth-throttle', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context, undefined, { is_meta: true })`. Feeds `meta-growth-watcher` recursively.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'recursive-growth-throttle', notes: 'failure_mode', is_meta: true })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
