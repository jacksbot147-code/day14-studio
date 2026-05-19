---
name: jack-asleep-detector
description: Best-effort detection of whether Jack is currently sleeping, in a meeting, or off-hours. Used to decide whether to push a non-P0 notification or batch it. Phase 2 supporting skill.
triggers:
  - "is Jack awake"
  - "quiet hours"
  - "do not disturb"
  - "active hours"
---

# jack-asleep-detector

> A 3 AM ping for a P2 issue is the kind of mistake that makes
> operators turn off Telegram notifications. This skill prevents
> that mistake.

## Signal sources

### Time of day (always available)
Default active window: **8 AM - 10 PM ET** (Jack's local time).

Outside that window → assume asleep / off → batch.

### Calendar context (via `calendar-context-pull`)
If a known meeting is on Jack's calendar within next 30 min → tag as "in meeting / about to be" → reduce notification priority unless P0.

### Recent activity (Telegram side)
If Jack messaged the bot in the last 5 minutes → he's clearly awake.
Override the default time-window assumption.

### macOS user-state (laptop-interim only)
Use `pmset -g` or check `idletime` to see if laptop has been active recently.

After Mac mini setup: Jack's laptop's user-state is independent of the runtime, so this signal becomes weaker. Phase 6+ would add iCloud Find-My-Mac or screen-time API for a stronger signal.

### Manual override (`/snooze` command)
If Jack sent `/snooze 4h`, treat as asleep / off until snooze expires regardless of other signals.

## Output

```json
{
  "state": "active | likely-asleep | snoozed | in-meeting",
  "confidence": 0.85,
  "active_window": "08:00-22:00 ET",
  "next_likely_active": "08:00 ET tomorrow",
  "snoozed_until": null,
  "reason": "Outside default window; no recent Telegram activity"
}
```

## How other skills use this

- `telegram-outbound-formatter` checks state before sending P1/P2/P3
  - state=active → send normally
  - state=likely-asleep + P2/P3 → batch to digest
  - state=likely-asleep + P1 → batch unless aging-critical
  - state=likely-asleep + P0 → SEND ANYWAY
  - state=in-meeting → batch all non-P0; deliver after meeting
  - state=snoozed → batch all non-P0; deliver when snooze expires

- `batching-quiet-hours` uses this as primary signal for digest assembly

## Hard rules

1. **Never push P0 based on asleep detection.** P0 always sends. Detection only suppresses P1-P3.
2. **Never use Telegram activity as proof Jack is "free."** He might be glancing at his phone in a meeting.
3. **Never override Jack's manual snooze.** Even if signals suggest he's active, snooze wins.
4. **Always log the decision** so we can audit false-deferrals.

## Calibration over time

- Track: how often did Jack reply to a notification within 5 minutes? (engagement rate by state)
- If engagement during "likely-asleep" is high → window is wrong; adjust
- If engagement during "active" is low → he's actually busier than the signals suggest; widen quiet hours

## Failure modes

- **All signals say asleep, but Jack is actually away on vacation and wants peace**: surface a "Going-off-grid" prompt at end of week; Jack can set extended snooze
- **Jack changes time zones**: detect via location signal (Phase 6); meanwhile default to ET
- **Multiple devices conflicting** (laptop says asleep, phone says active): trust the more-recent signal

## When invoked
- Before every non-P0 Telegram outbound
- Inside `batching-quiet-hours` to decide digest delivery time
- Manually when Jack asks "am I currently in 'do not disturb'?"

## Logging

`[YYYY-MM-DD HH:MM ET] jack-asleep-detector → state: {state}, confidence: <0.0-1.0>, reason: {one-line}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('jack-asleep-detector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'jack-asleep-detector', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
