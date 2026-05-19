---
name: log-anomaly-detector
description: Scan all poller + webhook + watcher logs hourly for anomalies (5xx spikes, error-rate increases, missing heartbeats, unusual patterns). Surface real signal, suppress noise.
triggers:
  - "log anomaly"
  - "error spike"
  - "logs weird"
  - "/logs"
---

# log-anomaly-detector

> 200 skills firing produces a lot of log volume. Without anomaly
> detection, real signal drowns. This skill is the filter.

## What's monitored

- `~/Documents/businesses/_shared/poller/*.log` (all poller logs)
- `~/Documents/businesses/_shared/poller/*-heartbeat.log` (all heartbeats)
- `~/Documents/businesses/_shared/growth/growth-watcher.log`
- Vercel deploy logs (via API)
- Supabase function logs (via API)
- Stripe webhook event logs

## Anomaly classes

| Class | Definition | Action |
|---|---|---|
| Heartbeat stale | No heartbeat in > 10 min for any poller | P0 |
| 5xx spike | > 5 5xx responses in 1 hour | P1 |
| Error-rate jump | Error % > 3× baseline for hour | P1 |
| New error string | Error string never seen before | Log + flag for review |
| Webhook drop | Stripe events received < 50% expected for hour | P1 |
| Disk-space drift | _shared dir growing > 100MB/hour | P2 |
| Unusual quiet | Action volume < 10% of typical for hour | P2 (could be a Jack-rest, or could be a break) |

## What this skill does

1. Hourly: scan last 60 min of logs across all sources
2. Compute baselines from last 7d same-hour window
3. Identify outliers
4. Cluster related errors (don't alert 50 times for same root cause)
5. Surface top 3 anomalies as Telegram (P-level matched to class)

## Hard rules

1. **Never alert on a single-occurrence anomaly** unless P0-class.
2. **Always cluster errors** by stack trace / signature — one underlying bug ≠ N alerts.
3. **Always show context** — the error line + 3 surrounding lines + frequency.
4. **Always suppress known errors** via `~/Documents/businesses/_shared/ops/known-errors.json` allowlist.
5. **Always include a "since when?" timestamp** so Jack can locate the change that introduced it.
6. **Never include log lines verbatim that contain secrets** — strip `sb_secret_*`, `sk_*`, etc.

## Output

```
🔍 Hourly log scan: 2026-05-17 22:00 ET

3 anomalies detected:

1. P1: Stripe webhook 5xx spike
   - 8 5xx responses in last hour (baseline: 0.4)
   - First occurrence: 21:14 ET
   - Pattern: POST /api/webhooks/stripe — 502 Bad Gateway
   - Likely: Vercel function cold-start failures
   - Recommendation: check Vercel function logs

2. P2: growth-watcher quiet
   - 0 work-register additions in last hour (baseline: 4-6)
   - Last action: 20:47 ET
   - Likely: scheduled-task system idle (expected at 22:00)

3. Log: new error string in events-poller
   - Line: "TypeError: Cannot read property 'id' of undefined at line 47"
   - First seen: 21:50 ET
   - Frequency: 3× in 10 min
   - Action: queued for `agent-self-debug`

Suppressed (known): 14 errors matched allowlist (Stripe rate-limit retries).
```

## Inputs

- `since_minutes` (default 60)
- `severity_floor` (default P2)

## When invoked

- Hourly via scheduled task
- `/logs` Telegram command (manual scan)
- After any poller-stale heartbeat alert
- Inside `daily-kickoff` (yesterday's anomalies summary)

## Failure modes

- **Log files locked/unreadable**: skip, report to next cycle
- **Baseline data corrupted**: rebuild from last 7d
- **Anomaly storm (50+ at once)**: cluster aggressively, surface top 3 only, log rest

## Logging

`[YYYY-MM-DD HH:MM ET] log-anomaly-detector → window: {N}min, anomalies: {N}, p0: {N}, p1: {N}, suppressed: {N}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('log-anomaly-detector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'log-anomaly-detector', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
