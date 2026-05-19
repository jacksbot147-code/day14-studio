---
name: pipeline-stuckness-detector
description: Find customer dossiers that haven't progressed in 48+ hours. Surface to Jack so he can unblock the customer (or write off if abandoned). Prevents customer-pipeline silent deaths. Layer 8 monitoring.
triggers:
  - "stuck customer"
  - "abandoned dossier"
  - "pipeline not moving"
  - "customer silent"
---

# pipeline-stuckness-detector

> Customer #4 paid a deposit 5 days ago. Hasn't replied to intake.
> Build hasn't started. Without this skill, that customer slowly
> disappears from Jack's attention. With it, surfaced daily until
> resolved.

## What counts as "stuck"

A customer is stuck if ANY:

| Stage | Stuck threshold |
|---|---|
| `awaiting-intake` | deposit paid >48h ago AND no intake_done_at |
| `building` | last commit/event >24h ago |
| `preview-sent` | preview sent >72h ago AND no customer reply |
| `iterating` | last customer interaction >48h ago |
| `launched` but customer unresponsive >7 days post-launch | surface as relationship-health-check |

## The daily sweep

Every morning at 9 AM (before daily-kickoff), check every active customer:

```sql
SELECT id, slug, status, deposit_paid_at, intake_done_at, updated_at, notes
FROM customers
WHERE status IN ('awaiting-intake', 'building', 'preview-sent', 'iterating')
ORDER BY updated_at ASC;
```

For each row, compute stuckness; report.

## Output

Append to today's `daily-kickoff` output OR file as standalone "Decisions waiting" if Jack already read kickoff:

```
## Pipeline stuckness — {date}

Stuck customers ({N}):
1. {slug} — {stage} — stuck {N hours/days}. Action: {recommended unblock}
2. {slug} — ...

Healthy customers ({N}): {brief list}
```

## Recommended unblocks per stage

| Stuck at | Recommended action |
|---|---|
| `awaiting-intake` 48-96h | Trigger `intake-nudge-writer` (already scheduled if config'd) |
| `awaiting-intake` 96h-7d | Surface for Jack's manual call |
| `awaiting-intake` >7d | Surface for refund or proceed-anyway decision (Council) |
| `building` >24h | Verify build agent didn't error; check pipeline event log |
| `preview-sent` >72h | Send the 5-day nudge per `intake-nudge-writer` pattern |
| `iterating` >48h | Surface as "is customer still engaged?" |
| `launched` + silent >7d | Relationship-health-check (warm follow-up via `warm-dm-personalizer`) |

## Hard rules

1. **Never auto-take destructive action on a stuck customer.** Refund / cancel / archive = always Jack's decision.
2. **Always surface stuck customers EVEN IF Jack saw them yesterday.** Repeat exposure = decision pressure.
3. **Never count weekends/holidays in the stuckness clock for non-active stages.** A customer hasn't replied over a weekend is normal; over a weekday is not.
4. **Always include a recommended unblock action.** Surfacing the problem without a path = noise.

## Failure modes

- **Customer's status enum is wrong** (e.g., still "building" but really launched): pipeline auditing surfaces; usually a manual cleanup
- **Customer dossier exists but no customers row**: orphan dossier; surface as anomaly
- **Stuck > 30 days**: auto-archive prompt; don't keep surfacing forever

## When invoked
- Daily at 9 AM scheduled task
- Inside `daily-kickoff` for inline surfacing
- Inside `weekly-council-review` for aggregate trends

## Logging

`[YYYY-MM-DD HH:MM ET] pipeline-stuckness-detector → active_customers: N, stuck: N, breakdown: {awaiting-intake: N, building: N, preview-sent: N, iterating: N}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('pipeline-stuckness-detector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'pipeline-stuckness-detector', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
