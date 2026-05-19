---
name: gap-moment-logger
description: Captures the "almost-fired" moments — when the agent reached for a skill, found a near-match, and stretched it to fit. Each near-match is a sub-skill candidate. Different from logAdHoc (no skill matched at all).
triggers:
  - "stretched skill"
  - "almost fits"
  - "near match"
  - "skill drift"
---

# gap-moment-logger

> The strongest growth signal isn't "no skill matched." It's "this
> skill almost matched but I had to stretch it." The stretch is where
> the new sub-skill lives.

## What a "gap moment" looks like

An agent encounters work where:
- A specific skill SHOULD fit (its description / triggers seem right)
- But on inspection, the skill's protocol covers 70-90% of the work
- The agent does the remaining 10-30% as judgment call
- The agent's chain-of-thought includes phrases like:
  - "this is close enough, I'll adapt"
  - "the skill covers X but not Y, doing Y inline"
  - "extending the pattern from skill-N for this case"

These are gap moments. Each one = sub-skill candidate.

## The log entry

```ts
import { logGapMoment } from "@/lib/work-register";

await logGapMoment({
  near_skill: "approval-card-builder",
  context: `customer-${slug}`,
  stretch_description: "card needed conditional buttons based on customer tier; existing skill assumed flat buttons",
  what_was_done: "added inline conditional in template; surfaced for skill amend",
});
```

This writes to a SEPARATE log: `~/Documents/businesses/_shared/growth/gap-moments.jsonl`

## How it differs from logAdHoc

- `logAdHoc` = no skill matched at all. Pure ad-hoc work.
- `logGapMoment` = a skill matched but had to be stretched. Closer pattern.

Growth-watcher treats them differently:
- 2+ `logAdHoc` with same phrase → new skill draft (parent_anchor: none)
- 2+ `logGapMoment` against the same `near_skill` → sub-skill draft (parent_anchor: near_skill)

## Why this is high-leverage

Stretches reveal the SHAPE of the missing sub-skill. The agent's `stretch_description` becomes the new sub-skill's purpose. The `near_skill` becomes its parent.

This naturally produces compounding clusters — each parent skill grows its supporters from the stretches it triggers.

## The wrapper

Extend `skill-fire-wrapper` with a `was_stretched` flag:

```ts
const { result, fired, was_stretched } = await fireSkill(
  'approval-card-builder',
  `customer-${slug}`,
  () => buildApprovalCard(input),
  {
    customer_slug: slug,
    stretch_callback: async ({ what_didnt_fit, what_was_done }) => {
      await logGapMoment({
        near_skill: 'approval-card-builder',
        context: `customer-${slug}`,
        stretch_description: what_didnt_fit,
        what_was_done,
      });
    },
  }
);
```

The skill's handler returns a `was_stretched` flag when it adapted; the wrapper auto-logs.

## Hard rules

1. **Never log a stretch without a description.** "Stretched it" alone = noise. Must include WHAT didn't fit.
2. **Always reference the near_skill by exact name.** Not paraphrased — the linker uses this for parent_anchor.
3. **Never log more than 2 stretches per session for the same near_skill.** Pattern is established; logging more is redundant.
4. **Stretches that produce wrong outcomes** → also log as postmortem; the gap caused real harm.

## Growth-watcher's per-skill gap rollup

For each anchor skill, growth-watcher produces a "stretches" report:

```
# Stretches: approval-card-builder (last 30 days)

| Stretch type | Count | Contexts |
|---|---|---|
| conditional button rendering | 3 | acme, bonita, naples |
| dynamic urgency from per-customer overrides | 2 | acme, naples |
| inline link injection for SaaS-tier customers | 4 | various |

Proposed sub-skills:
- approval-card-conditional-buttons (auto-draft scheduled)
- approval-card-dynamic-urgency (1 more occurrence; pending)
- approval-card-inline-links (auto-draft scheduled)
```

This becomes the parent's "you have 3 child-skill candidates queued" view.

## Failure modes

- **Stretches all describe the same thing in different words**: dedup via 80%-similarity threshold
- **Stretches reveal the parent skill's spec is wrong** (not a gap, just a bug): surface as postmortem, not as growth
- **Stretches keep happening for a "promoted" sub-skill that already exists**: agent isn't using the sub-skill; surface as skill-coverage-auditor anomaly

## When invoked
- Inside `fireSkill` wrapper when handler signals stretched
- Manually by agents who notice "I should log this stretch"
- Inside `growth-watcher` aggregation pass

## Logging

`[YYYY-MM-DD HH:MM ET] gap-moment-logger → near_skill: {name}, context: {brief}, what_didnt_fit: {30char}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('gap-moment-logger', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'gap-moment-logger', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
