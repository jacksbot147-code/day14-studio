---
name: backup-verifier
description: Daily verification that all critical data is backed up — Supabase DB, customer dossiers, Vercel deploys, _shared/skills. Restore-test sample restore weekly. Without this, backups silently rot.
triggers:
  - "backup"
  - "verify backup"
  - "restore test"
  - "/backup"
---

# backup-verifier

> Most "backed up" data isn't actually restorable until you try.

## What's backed up + verified

| Source | Where it lives | Backup frequency | Verify cadence |
|---|---|---|---|
| Supabase DB | Supabase auto + pg_dump nightly | Daily | Weekly restore test |
| Customer dossiers (markdown) | ~/Documents + iCloud sync | Continuous | Daily file-count check |
| `_shared/skills/` git history | Git push to private repo | Per-commit | Daily git fetch |
| Vercel deploys | Vercel rollback history (30 days) | Continuous | Weekly rollback-test |
| `_shared/customers/{slug}/` | Per-tenant zip nightly | Daily | Weekly extract-test |
| Stripe customer state | API as source of truth | N/A (Stripe is durable) | Weekly read-test |

## Hard rules

1. **Never trust "exists" as "valid".** Check file size, signature, or readable contents.
2. **Always restore-test weekly.** Untested backups = no backups.
3. **Always log restore-test results** with timing — slow restore = degraded backup.
4. **Always alert on backup miss** within 24h. 48h silent = bad.
5. **Never rely on cloud-provider-only backup** for legal-relevance data (intake forms, contracts).
6. **Always test cross-region** for critical data — primary + secondary, in different geos.

## Daily verification cycle

```
✓ Supabase nightly dump: 247 MB (vs 245 MB yesterday — normal growth)
✓ Customer dossiers: 23 files in 4 tenants (counts match)
✓ _shared/skills git push: last commit 2h ago, push successful
⚠ Vercel deploy history: 28 deploys (rolling window healthy)
✓ Tenant zips: 4 zips generated, all open + integrity-checked
✓ Stripe API read-test: returned 4 customers (matches dossier count)

State: all backups present + valid.
Next restore test: Sunday 03:00 ET (auto-scheduled).
```

## Weekly restore test

Picks ONE random source and restores to a temp env:
- Supabase: spin up empty Postgres, restore dump, assert row counts
- Vercel: rollback most recent deploy, check site loads
- Dossier: extract tenant zip to /tmp, diff against live

Logs result. If restore fails → P0 immediately.

## When invoked

- Daily 04:00 ET via scheduled task
- Weekly Sunday 03:00 ET for restore-test
- `/backup` Telegram command (instant verify)
- Inside `weekly-council-review`
- Immediately before any major migration

## Failure modes

- **Backup exists but won't restore**: P0 — backup is dead
- **Backup hasn't run in 24h**: P1 — process broken
- **Backup size shrinks unexpectedly** (>10%): P1 — possible data loss upstream

## Logging

`[YYYY-MM-DD HH:MM ET] backup-verifier → sources_checked: {N}, all_valid: {bool}, restore_test: {pass|fail|skipped}, alerts: {N}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('backup-verifier', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'backup-verifier', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
