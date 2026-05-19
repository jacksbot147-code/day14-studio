---
name: watchdog-self-restarter
description: Detect when a poller is dead (no heartbeat for N min) + force-restart via launchctl. Closes the gap where macOS KeepAlive thinks the process is alive but it's actually wedged. Layer 7 infrastructure.
triggers:
  - "poller dead"
  - "restart daemon"
  - "watchdog"
  - "process wedged"
---

# watchdog-self-restarter

> KeepAlive only restarts crashed processes. A process can be alive
> but wedged (deadlock, infinite loop, network timeout cascade). This
> skill checks heartbeats; force-kills + restarts if stale.

## What gets watched

Every Day14 poller writes a heartbeat to:
`~/Documents/businesses/_shared/poller/{name}-heartbeat.log`

Watchdog scans these files every 5 min.

## The stale detection

For each heartbeat file:
- Read the last line's timestamp
- Compute age = now - timestamp
- If age > expected_cadence × 3: poller is wedged

| Poller | Expected cadence | Stale threshold |
|---|---|---|
| Telegram poller | 60s heartbeat | 180s |
| Events poller | 60s | 180s |
| Storm poller (active) | 60s | 180s |
| Storm poller (idle season) | 24h | 72h |

## The restart sequence

When a poller is detected wedged:

1. **Log the detection** to `~/Documents/businesses/_shared/poller/watchdog.log`
2. **Try graceful kill**: `launchctl unload ~/Library/LaunchAgents/com.day14.{name}.plist`
3. **Wait 5s**
4. **Force-kill if needed**: `pkill -9 -f "{name}.mjs"`
5. **Reload**: `launchctl load ~/Library/LaunchAgents/com.day14.{name}.plist`
6. **Wait 30s for heartbeat**
7. **If still no heartbeat**: surface as P0 — operator intervention needed
8. **If heartbeat returns**: log restart success + continue monitoring

## Where the watchdog runs

The watchdog is itself a scheduled task (cron-style) running every 5 min via Cowork OR a separate LaunchAgent. To avoid the "who watches the watchman" recursion, keep the watchdog lightweight (just timestamps + launchctl) so it's unlikely to wedge itself.

If we ever need to watch the watchdog: use macOS `cron` (very minimal, virtually unkillable) to ping `day14.us/api/internal/watchdog-heartbeat` every 10 min. If 30 min passes without a ping, send Jack an email via Resend.

## Hard rules

1. **Never auto-restart more than 3 times in 1 hour.** If a poller restarts >3x in 1h, surface as P0 — there's a deeper problem.
2. **Always log every restart** with the staleness duration + presumed cause.
3. **Never kill the watchdog itself.** Even if its heartbeat is stale.
4. **Always test the restart sequence quarterly** by deliberately wedging a poller (don't wait for production failure).

## Failure modes

- **Heartbeat file isn't being written but poller is fine**: heartbeat code itself broke; investigate that
- **Disk full**: poller can't write heartbeat; will look wedged; root cause is disk, not poller
- **launchctl fails to unload**: rare; surface as P0; manual intervention

## When invoked
- Scheduled task every 5 min
- Manually when Jack notices Telegram bot is unresponsive
- Inside `autonomous-health-check` as a sub-check

## Logging

`[YYYY-MM-DD HH:MM ET] watchdog-self-restarter → polled: N, stale: N, restarted: N, p0_escalated: N`

When P0:
`[YYYY-MM-DD HH:MM ET] 🚨 watchdog-self-restarter P0 — {poller}, restart_attempts: N/3, manual_required: yes`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('watchdog-self-restarter', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'watchdog-self-restarter', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
