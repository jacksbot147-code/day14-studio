---
name: audit-log-generator
description: Append-only audit log of every consequential action — customer data access, refunds issued, DNS changes, deletions, exports. Compliance baseline + future-self diagnostic tool.
triggers:
  - "audit log"
  - "audit trail"
  - "who did what"
  - "/audit"
---

# audit-log-generator

> When something goes sideways, the audit log is the difference between
> "we know what happened" and "we have no idea."

## What's logged (append-only)

Every one of these creates an audit entry:

| Action | Logged fields |
|---|---|
| Customer data access | who, when, customer_slug, fields_read |
| Customer data export | who, when, customer_slug, export_id |
| Refund issued | who, when, customer_slug, amount, reason |
| Subscription cancel/pause | who, when, customer_slug, action, reason |
| Deletion (purge/anonymize) | who, when, target, what_purged |
| DNS change | who, when, domain, record_type, before, after |
| Deploy to production | who, when, customer_slug, deploy_id |
| Secret rotation | who, when, secret_name (not value), source |
| Skill promoted to _shared/ | who, when, skill_name, from_draft_id |
| Council decision | who, when, decision_id, outcome |
| Email sent to customer (manual) | who, when, customer_slug, subject |
| Permission change (file/folder) | who, when, target, change |
| Customer-facing site rollback | who, when, customer_slug, deploy_from→to |

NOT logged (out of scope):
- Routine reads (Cowork chat, agent operations)
- Auto-triggered automations (those have their own logs)
- Skill firings (work-register has those)

## Schema

`~/Documents/businesses/_shared/audit/audit-{YYYY-MM}.jsonl`:

```jsonl
{"timestamp":"2026-05-17T22:14:00Z","action":"refund_issued","actor":"jack@day14","customer_slug":"splash-jacks-pools","amount":497,"reason":"found a cheaper option","skill_invoked":"refund-handler","actor_source":"telegram"}
{"timestamp":"2026-05-17T22:18:00Z","action":"dns_change","actor":"jack@day14","domain":"buildbridge.com","record_type":"A","before":"45.32.121.18","after":"76.76.21.21","skill_invoked":"dns-drift-watcher"}
```

## Hard rules

1. **Append-only.** Never edit, never delete. Even if a log entry is wrong, append a correction.
2. **Always include actor.** Even if it's "automated:{skill_name}" — never "system" alone.
3. **Always include skill_invoked** when applicable — for tracing.
4. **Always log secret-rotation** but NEVER the secret value (only the name + source).
5. **Never log customer-facing-data verbatim** in audit logs. Log references (slug + record ID), not contents.
6. **Cryptographically tie days** — each day's log includes a hash of the previous day's log. Tampering becomes detectable.
7. **Always rotate monthly** but keep all months (7-year retention by `data-retention-pruner` policy).

## What this skill does

1. Provides a single API: `auditLog({action, actor, ...details})`
2. Called from every skill that performs a consequential action
3. Computes daily hash for chain integrity
4. Verifies chain integrity nightly (no tampering)

## Output (integrity check)

```
🔒 Audit log integrity: 2026-05-17

Files: 5 monthly logs (Jan-May 2026)
Entries: 18,234 total

Chain verification:
  Jan: ✓ hash chain intact
  Feb: ✓ hash chain intact
  Mar: ✓ hash chain intact
  Apr: ✓ hash chain intact
  May: ✓ hash chain intact (current)

Last entry: 2026-05-17 22:18:00 ET (dns_change, buildbridge.com)
```

## When invoked

- Continuously, called from other skills
- Nightly chain-integrity check (03:00 ET)
- On Jack's `/audit` command (search the log)
- During any incident investigation

## Failure modes

- **Audit log file locked/unwritable**: P0 — system has integrity gap; pause consequential actions
- **Chain integrity fails** (tamper detected): P0 — investigate immediately
- **Audit log gets too large for one file** (>100MB): rotate weekly instead of monthly

## Logging

`[YYYY-MM-DD HH:MM ET] audit-log-generator → action: {name}, actor: {name}, entries_today: {N}, chain_status: {ok|broken}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('audit-log-generator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'audit-log-generator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
