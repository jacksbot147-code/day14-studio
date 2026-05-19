---
name: uptime-monitor
description: Poll every customer site every 5 min from 3 geo regions. Detect downtime within 15 min. Auto-escalate P0 when 2+ regions fail. Restores trust by catching outages before customers do.
triggers:
  - "uptime"
  - "site down"
  - "monitor sites"
  - "/uptime"
---

# uptime-monitor

> The first principle of customer trust: never be the second to know
> your site is down.

## What this skill does

1. Reads customer URL list from `~/Documents/businesses/_shared/customers/*/02-status.md`
2. Every 5 min, fires HTTP GET from 3 vantage points:
   - sandbox/Mac mini (local poller)
   - Vercel edge (cron via API)
   - 3rd region via a free uptime API
3. Logs result to `~/Documents/businesses/_shared/uptime/{slug}-{YYYY-MM-DD}.jsonl`
4. Failure logic:
   - 1 region fails: log only (likely transient)
   - 2 regions fail: P1 Telegram alert
   - 3 regions fail OR 5xx for 10+ min: P0
5. On recovery: log + Telegram "back up" follow-up

## Hard rules

1. **Never alert on a single-region 5xx.** Network blips ≠ outage.
2. **Always include the failing URL + status code + timing** in alerts.
3. **Always check DNS first.** If DNS resolution fails, it's not a site issue, it's a registrar issue (different skill: `dns-drift-watcher`).
4. **Never spam alerts.** Once a site is known-down, suppress until recovered.
5. **Always verify HTTPS cert** in addition to status — expired cert = effective downtime.
6. **Always alert customer (with permission)** when site has been down >30 min — they'd want to know.

## Output

```
✓ Uptime cycle complete: 4 customers checked

splash-jacks-pools.com   ✓ 200 OK   227ms (NA)  201ms (EU)  189ms (APAC)
buildbridge.com          ✓ 200 OK   178ms (NA)  192ms (EU)  221ms (APAC)
casamore.net             ⚠ 503      timeout    timeout    timeout (3 regions)
                         → P0 raised: site down 12 min
real-estate-co.io        ✓ 200 OK   154ms (NA)  178ms (EU)  201ms (APAC)

Cycle time: 4.2s
Next cycle: 2026-05-17T22:45:00Z
```

## Inputs

- `customer_slug` (optional, single-site mode for `/uptime {slug}`)
- `vantage_points` (default 3, max 5)

## When invoked

- Continuously every 5 min via LaunchAgent
- `/uptime` Telegram command (instant check)
- Inside `daily-kickoff` (yesterday's uptime %)
- Inside `weekly-council-review` (uptime trend)

## Failure modes

- **Local poller offline**: skip local check, alert via heartbeat-stale
- **All 3 regions report up but customer says down**: investigate from customer's IP (likely ISP)
- **Site loads but has crawler block**: detect 200 with body containing CAPTCHA/Cloudflare-challenge

## Logging

`[YYYY-MM-DD HH:MM ET] uptime-monitor → customer: {slug}, na: {ok|fail}, eu: {ok|fail}, apac: {ok|fail}, action: {ok|alert|recover}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('uptime-monitor', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'uptime-monitor', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
