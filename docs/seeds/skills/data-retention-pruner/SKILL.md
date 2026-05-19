---
name: data-retention-pruner
description: Apply data-retention policies on a schedule — purge old logs, anonymize departed customers (after 2 years), purge non-essential PII. Stays GDPR/CCPA compliant without manual cleanup.
triggers:
  - "data retention"
  - "purge old data"
  - "anonymize"
  - "/prune"
---

# data-retention-pruner

> The data you keep "just in case" is a liability waiting for a breach
> to become a headline. This skill keeps the keep small.

## The retention policies

| Data type | Retain | After retention |
|---|---|---|
| Active customer records | Indefinite | (still active) |
| Departed customer records | 2 years | Anonymize PII, keep aggregates |
| Email logs (inbound/outbound) | 1 year | Purge full text, keep metadata |
| Webhook event logs | 90 days | Purge |
| Heartbeat logs | 30 days | Purge |
| Poller logs (full) | 30 days | Purge |
| Growth-watcher logs | 1 year | Purge full text, keep summary |
| Work-register entries | 1 year | Purge full text, keep aggregates |
| Backup files | 30 days | Purge oldest |
| Lighthouse reports | 90 days | Purge |
| Uptime monitor JSONL | 180 days | Purge |
| GDPR export logs | 7 years (legal requirement) | (keep, encrypted) |

## What "anonymize" means

For a departed customer record after 2 years:
- Replace name with `customer_NNNN` (sequential anon ID)
- Replace email with `deleted+NNNN@day14.us`
- Replace phone with `null`
- Replace domain with `(redacted)`
- Strip from intake form: address, personal context, anything PII
- Keep: tier, vertical, churn date, churn reason (anonymized), LTV bucket

So aggregate analytics still work (cohort retention, etc.) but you can't re-identify anyone.

## Hard rules

1. **Never purge active customer data.** Only departed customers' PII after 2 years.
2. **Never purge legally-required data** (GDPR exports log, payment records for 7 yrs).
3. **Always log every purge** to `~/Documents/businesses/_shared/compliance/purge-log.jsonl`.
4. **Always Jack-tap before bulk operations.** Single-record purges can auto-execute.
5. **Always run in dry-run mode first** for any new policy — show what WOULD be purged.
6. **Never auto-purge backups** — backups are insurance; manual approval required.
7. **Always notify customer 30 days before** scheduled anonymization. Give chance to come back.

## What this skill does

1. Daily 03:00 ET: scan data sources against retention policies
2. Identify records eligible for purge/anonymize
3. Dry-run: produce report of what WOULD happen
4. Weekly Sunday: Jack-tap to approve actual execution
5. Execute approved purges
6. Verify (post-execution, count + sample)
7. Log everything

## Output (weekly report)

```
🗑 Retention pruner: week of May 18 — dry-run report

Anonymize (2-year departed customers): 3 candidates
  - customer_old_co (churned 2024-05-15) → "customer_0023"
  - sample-pool-co (churned 2024-05-18) → "customer_0024"
  - test-real-estate (churned 2024-05-22) → "customer_0025"

Purge (90-day webhook logs): 14,231 events
  - Size: 47 MB
  - Last entry to be purged: 2026-02-17

Purge (30-day heartbeat logs): 8,640 entries
  - Size: 12 MB

Purge (30-day backup files): 2 files
  - splash-jacks-pools-2026-04-15.zip (124 MB)
  - buildbridge-2026-04-15.zip (89 MB)

Total reclaim: 272 MB
Records affected: 22,876

Approve [yes / yes-but-keep-backups / dry-run-only]
```

## When invoked

- Daily 03:00 ET scan (dry-run only, no execution)
- Sunday weekly approval card with summary
- `/prune {policy}` Telegram command (single-policy manual)
- After `gdpr-data-export` delivery (cleanup the export)

## Failure modes

- **Customer comes back during 30-day anonymization-warning window**: cancel anonymization, restore relationship
- **Purge fails midway**: log partial; resume safely; verify no orphan references
- **Disk freed less than expected**: check filesystem fragmentation; not a data integrity issue

## Logging

`[YYYY-MM-DD HH:MM ET] data-retention-pruner → policy: {name}, candidates: {N}, executed: {N}, bytes_freed: {N}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('data-retention-pruner', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'data-retention-pruner', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
