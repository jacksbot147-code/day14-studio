---
name: cross-business-prioritizer
description: Across N tenants, identify the SINGLE highest-leverage action for Jack today. Combines churn LTV-at-risk + revenue opportunities + critical issues. Cuts decision fatigue.
triggers:
  - "what should i do"
  - "highest priority"
  - "prioritize today"
  - "cross business"
pack: multi-business-operator
---

# cross-business-prioritizer

> Running 5 businesses, Jack has 50 things he could do.
> This skill picks the 1 he should do first.

## Scoring

Each candidate action gets a score:

```
score = ltv_at_risk × urgency_multiplier × reversibility_factor
```

Where:
- `ltv_at_risk`: dollars at stake (churn, refund, lost deal)
- `urgency_multiplier`:
  - P0 today = 3.0
  - This week = 2.0
  - This month = 1.0
- `reversibility_factor`:
  - One-way door = 1.5 (do this BEFORE reversible items)
  - Two-way door = 1.0

Top score wins.

## Output

```
🎯 Today's one thing
buildbridge — call before 10 AM
  Score: 87 ($11,964 LTV at risk, P0 today, one-way door)
  Why: Cancellation question 8 days ago, no response since
  Action: Personal phone call, no email

Second priority (after the first):
  splash-jacks-pools — follow up on intake form
  Score: 32 (intake stuck 4 days)
```

## Hard rules

1. **One thing only**, ranked secondary visible but de-emphasized.
2. **Always tie score to dollars** — qualitative ranking is too vague.
3. **Always cross-business** — don't optimize within one tenant.
4. **Always run after per-tenant-daily-rollup** so data is fresh.
5. **Always Jack-tap if top action requires customer comm**.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('cross-business-prioritizer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'cross-business-prioritizer', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
