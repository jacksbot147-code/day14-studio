---
name: calendar-context-pull
description: Pull today's calendar events from Cal.com (Jack's discovery calls), Apple Calendar (Jack's personal), and any customer-specific calendars. Feeds the "Calendar awareness" section of daily-kickoff. Supporting skill for daily-kickoff.
triggers:
  - "today's calendar"
  - "what's scheduled"
  - "meetings today"
  - "calendar context"
---

# calendar-context-pull

> daily-kickoff needs to know what's scheduled before it lists priorities.
> A 2-hour discovery call at 1pm changes "today's plan" dramatically.

## Sources

### Cal.com (Day14 discovery calls)
- API: https://api.cal.com/v1/bookings
- Auth: CAL_API_KEY in env
- Filter to today's bookings on the operator's calendar

### Apple Calendar (Jack's personal)
- Read from macOS Calendar app via `osascript`:
  ```bash
  osascript -e 'tell application "Calendar" to get summary of (every event of every calendar whose start date ≥ (current date) and start date < (current date) + 1 * days)'
  ```
- Returns: array of {title, start, end, calendar_name}

### Google Calendar (if Jack uses it)
- Defer to Phase 2; rare for solo SWFL operator

### Customer dossier calendars
- If any customer dossier has a `05-launch.md` with "Launch day: today's date" → that's a scheduled launch
- Surface from `customers` table: `WHERE status='iterating' AND day14_launch_date = CURRENT_DATE`

## Output

Compact summary for `daily-kickoff`:

```
Today's calendar:
- 09:00-09:30 — discovery call: {company_name} (Cal.com booking)
- 11:30-12:30 — personal (lunch)
- 14:00-14:30 — discovery call: {another company}
- 17:00 — Launch day for {customer_slug} per 05-launch.md
- Otherwise: open
```

If calendar is empty:
```
Today's calendar: nothing scheduled.
```

## Heuristics

### Work-day shape
- Discovery calls before 10am or after 4pm: high-energy work between them
- 3+ calls in a day: surface as "high-context-switching day; defer deep work to tomorrow"
- Empty calendar: surface as "deep work window; tackle top priority that needs 90+ min"

### Calendar conflicts with priorities
If `priority-ranker`'s top item requires 2+ hours of focused work AND today has 4+ short interruptions:
- Surface to Jack: "Top priority needs deep work; today's fragmented. Move it to {next open day} or break it into chunks?"

## Hard rules

1. **Never modify the calendar.** Read-only access. If a customer asks for a reschedule, surface to Jack to do manually.
2. **Never expose customer names** in calendar output if it's a private discovery call. Use "discovery call" + customer slug from the kickoff dossier; not their email.
3. **Never poll the calendar more than once per kickoff.** Cache for the day.
4. **Always include time zones** (ET for Jack). If a customer's call is in a different TZ, convert + note.

## Failure modes

- **Cal.com API down**: skip Cal.com source; use what other sources give
- **macOS Calendar permission denied**: surface to Jack — needs to grant access in System Settings → Privacy
- **Calendar events without start times** (all-day events): surface as "all day: {title}"

## When invoked
- Inside `daily-kickoff` every weekday morning (and Sat/Sun if Jack has commitments)
- Inside `priority-ranker` to factor calendar density into rankings
- Manually when Jack asks "what does my day look like?"

## Logging

`[YYYY-MM-DD HH:MM ET] calendar-context-pull → sources_queried: {list}, events_today: N, density: {empty|light|moderate|heavy}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('calendar-context-pull', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'calendar-context-pull', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
