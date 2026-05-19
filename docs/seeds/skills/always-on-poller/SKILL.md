---
name: always-on-poller
description: Spec for the long-running Node poller that bridges Cowork to external services. Documents the polling cadences, error handling, queue patterns. The infrastructure skill that wraps the actual scripts (telegram-poller.mjs and others). Layer 7 infrastructure.
triggers:
  - "always on poller"
  - "background daemon"
  - "long-running script"
---

# always-on-poller

> Cowork sessions are ephemeral. Some work needs continuous polling
> regardless of whether Cowork is open. The poller is that continuous
> layer.

## What the poller does

Currently one poller (telegram-poller.mjs). Eventually several pollers, all sharing the same patterns:

1. **Telegram poller** (Phase 1) — Telegram bot inbox/outbox bridge
2. **Events poller** (Phase 4) — Supabase events table → downstream agents
3. **Health poller** (cross-phase) — `autonomous-health-check` heartbeat
4. **Outage poller** (post-Phase 6) — FPL/LCEC for `power-outage-detector`

## Standard contract for any poller

Every Day14 poller follows this shape:

```typescript
// pseudocode
class Poller {
  start() {
    this.loadEnv();           // from .env.local
    this.ensureQueueDirs();   // make sure inbox/outbox folders exist
    this.attachShutdownHook(); // graceful exit
    this.heartbeat();         // periodic "I'm alive" log
    this.scheduleMainLoop();  // setInterval(handler, pollInterval)
  }

  async handler() {
    try {
      await this.pollUpstream();
      await this.drainOutbox();
    } catch (err) {
      await this.logError(err);
      // do NOT exit — keep going
    }
  }
}
```

## Required behaviors

- **Heartbeat**: every 60s, append a one-line health entry to `~/Documents/businesses/_shared/poller/heartbeat-{name}.log`
- **Crash recovery**: catch all uncaughtException + unhandledRejection; log + continue (don't exit)
- **Graceful shutdown**: SIGTERM / SIGINT triggers flushOutbox then exit
- **State persistence**: any state needed across restarts (e.g., last-seen update_id) goes in a file, not memory

## Polling cadences

| Poller | Default cadence | When can it drop? |
|---|---|---|
| Telegram inbox | 5s | Never |
| Telegram outbox | 2s | Never |
| Events table | 10s | Can drop to 60s in quiet hours |
| Health | 60s | Never |
| FPL/LCEC outage | 30min (active storm), 12h (idle season) | Hurricane season inactive |
| Vercel deploy status | 30s (during build), idle otherwise | Off when no builds in flight |

## Hard rules

1. **Never crash without restart.** macOS launchd / pm2 should restart immediately.
2. **Never lose queued outbox messages.** Even on crash, messages on disk survive.
3. **Never poll faster than upstream rate limits.** Respect Telegram's 30/min, Resend's etc.
4. **Always log to a file** — stdout/stderr is fine for live, file is for audit.
5. **Never embed credentials in the script.** Always load from .env.local.

## Failure modes

- **Network is down**: poll fails; log; retry; don't crash
- **API key rotated**: 401 responses; surface to operator; pause polling for that endpoint
- **Disk full**: poller can't write outbox; surface IMMEDIATELY via stderr; macOS LaunchAgent restart loop will spam without resolution

## When invoked
- Pattern reference for any poller skill (the actual scripts are at `~/Documents/studio/scripts/*-poller.mjs`)
- Manually for code review

## Logging

Per-poller heartbeat to `~/Documents/businesses/_shared/poller/{name}-heartbeat.log`
Errors to `~/Documents/businesses/_shared/poller/{name}-error.log`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('always-on-poller', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'always-on-poller', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
