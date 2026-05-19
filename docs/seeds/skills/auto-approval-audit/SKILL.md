---
name: auto-approval-audit
description: Daily review of auto-approved cards. Catches false-positives before they compound. Surfaces Jack-disagreements for threshold tuning. Phase 5 supporting skill.
triggers:
  - "audit auto-approvals"
  - "review auto decisions"
  - "auto-approve health"
---

# auto-approval-audit

> Auto-approve without audit = blind delegation. Audit = trust loop.
> Daily review at minimum.

## What gets reviewed

Daily at 11 AM (after Jack's morning kickoff), this skill reads:
- `~/Documents/studio/docs/auto-approvals.md` — yesterday's auto-approved cards
- For each card: the action that fired + downstream events

For each card, score:

| Dimension | Method |
|---|---|
| **Action fired correctly** | events table shows expected downstream events |
| **No customer complaint downstream** | scan `complaint-detected` events for 24h after |
| **No reversal needed** | Jack didn't manually undo |
| **No bad surprise** | no postmortem references the card |

## Output

Append to `~/Documents/studio/docs/auto-approvals-audit.md` (weekly summary):

```
# Auto-approval audit — week of {date}

## Volume
- Auto-approved: N cards
- Manual-approved: M cards
- Ratio: N / (N+M) = X%

## Outcomes (cards from 7+ days ago)
- Aged well: N
- Wrong: M (list specifics)
- Too soon to tell: K

## Pattern detection
- Card type with highest auto-approve rate: {type}
- Card type with most reversals: {type} (consider raising threshold)
- New patterns Jack might want auto-approved: {list}

## Recommendations
- Tighten threshold for: {list}
- Loosen threshold for: {list}
- Add to never-auto-approve: {list}
```

## Threshold tuning

When the audit shows >5% reversal rate in any card category:
- Raise the risk threshold by 0.05
- Re-evaluate weekly until rate <2%

When a category has 90%+ auto-approve + 0 reversals over 30 days:
- Lower threshold by 0.05 to capture more volume

This is slow learning — over months, the system finds the right balance per category.

## Hard rules

1. **Never modify thresholds without an audit signal.** Gut tuning erodes the system.
2. **Always surface "wrong" auto-approvals to Jack** — even one bad one needs review.
3. **Always re-evaluate after a system change.** New skill, new vendor, new vertical → restart the calibration clock.
4. **Never auto-tune the never-auto-approve list.** Adding to it requires explicit Jack input.

## Failure modes

- **Audit catches no signal** because outcomes take longer than 7 days to manifest: extend window
- **Auto-approve volume too low** to be statistically meaningful: defer threshold decisions; just collect data
- **Jack manually reverses an auto-approval mid-action**: flag immediately; pause that card-type's auto-approve until reviewed

## When invoked
- Daily at 11 AM (after kickoff)
- Weekly aggregate on Sundays (with Council review)
- After any auto-approval that triggers a downstream complaint or postmortem

## Logging

`[YYYY-MM-DD HH:MM ET] auto-approval-audit → cards_reviewed: N, wrong_count: N, recommendations: {N}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('auto-approval-audit', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'auto-approval-audit', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
