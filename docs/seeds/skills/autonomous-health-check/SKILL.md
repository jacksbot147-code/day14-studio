---
name: autonomous-health-check
description: Cross-pipeline status check — every 15 min, verify all the moving pieces are alive. Pollers running, Supabase reachable, Vercel up, Stripe API healthy, scheduled tasks firing. Single dashboard for system health. Layer 8 monitoring.
triggers:
  - "health check"
  - "system status"
  - "is everything running"
---

# autonomous-health-check

> The "is Day14 OS alive" check. Runs every 15 min. Reports anomaly
> to Jack only if something's red.

## The 9 checks (run all every 15 min)

| Check | What's verified | Healthy = |
|---|---|---|
| **1. Telegram poller heartbeat** | `~/Documents/businesses/_shared/poller/telegram-heartbeat.log` recent | last entry < 3 min ago |
| **2. Events poller heartbeat** | same pattern | last entry < 3 min ago |
| **3. Supabase API reachable** | `SELECT 1` via service_role | 200 OK in <2s |
| **4. Vercel API reachable** | GET `/v9/user` | 200 OK |
| **5. Stripe API reachable** | GET `/v1/balance` (test mode) | 200 OK |
| **6. Resend API reachable** | GET `/domains` | 200 OK |
| **7. Latest scheduled task ran** | check `mcp__scheduled-tasks__list_scheduled_tasks` for any task with `lastRunAt` more than 24h stale despite cron | none stale |
| **8. day14.us responds** | curl HEAD | 200 OK in <3s |
| **9. Customer-site polish all-green** | yesterday's `polish-{date}.md` shows no red items | confirmed |

## Output

Write to `~/Documents/businesses/_shared/health/check-{timestamp}.json`:

```json
{
  "timestamp": "ISO",
  "overall": "healthy | degraded | critical",
  "checks": [
    {"id": "telegram-poller", "status": "healthy", "latency_ms": 12},
    {"id": "supabase", "status": "healthy", "latency_ms": 230},
    {"id": "vercel", "status": "healthy", "latency_ms": 180},
    {"id": "stripe", "status": "degraded", "latency_ms": 4500, "note": "slow response"},
    {"id": "resend", "status": "healthy", "latency_ms": 320},
    ...
  ],
  "alerts_sent": []
}
```

## Notification rules

- **All 9 healthy**: no alert; just log
- **1-2 degraded but recovering**: log; warn in next morning digest
- **3+ degraded** OR **1 critical**: P1 Telegram alert
- **2+ critical** (e.g., Supabase + Vercel both down): P0 alert + email fallback
- **Same component degraded for >2h**: escalate one level (degraded → critical)

## State changes

Don't fire an alert on every check. Only on state transitions:

- healthy → degraded: log + watch
- degraded → critical: alert
- critical → degraded: log
- degraded → healthy: log "recovered"

This prevents alert fatigue.

## Hard rules

1. **Never alert on a single transient failure** — require 2 consecutive failures before declaring not-healthy.
2. **Always include the actual error or latency** in the alert. "Stripe down" is useless; "Stripe returned 503 in 5s" is actionable.
3. **Never crash if a downstream is down** — log the error, continue with the remaining checks.
4. **Always degrade gracefully** — if Supabase is down, can't write the health log; fall back to local file logging.

## Failure modes

- **Health-check itself fails to run** (e.g., laptop sleeping): the gap is the signal; next run will detect "last check was 4h ago" and surface
- **External APIs rate-limit the health check**: back off; use minimal-cost endpoints
- **Customer-site polish hasn't run today** (e.g., `nightly-polish` skipped): surface as "stale polish data" rather than red

## When invoked
- Every 15 min via scheduled task
- Manually via `/status` Telegram command
- Inside `daily-kickoff` for first-thing-in-the-morning health pulse

## Logging

`[YYYY-MM-DD HH:MM ET] autonomous-health-check → overall: {state}, healthy: N/9, alerts_fired: N`

State transition:
`[YYYY-MM-DD HH:MM ET] autonomous-health-check TRANSITION → {component}: {old} → {new}, duration: {N min}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('autonomous-health-check', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'autonomous-health-check', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
