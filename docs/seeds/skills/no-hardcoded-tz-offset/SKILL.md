---
name: no-hardcoded-tz-offset
description: Anti-pattern guardrail. NEVER hardcode timezone offsets like `-4` or `-5`. Florida is EDT (UTC-4) March-November and EST (UTC-5) November-March. Code that hardcodes `-4` silently breaks for ~5 months/year. Found in Splash Jacks production.
triggers:
  - "timezone offset"
  - "-4 hardcoded"
  - "Florida time"
  - "America/New_York"
---

# no-hardcoded-tz-offset

> Splash Jacks code hardcodes `-4` for Florida timezone. Works from
> mid-March through early November (EDT). Silently misfires by 1 hour
> November-March (EST). This skill prevents the bug class.

## The anti-pattern

```ts
// ❌ Anti-pattern (found in production)
const floridaNow = new Date(Date.now() - 4 * 60 * 60 * 1000);  // -4 hours
const visitHour = new Date(date.getTime() - 4 * 60 * 60 * 1000).getHours();
```

Why this fails:
- EDT (March-November): UTC-4 ✓ correct
- EST (November-March): UTC-5 — actual offset is -5, not -4
- The 1-hour drift means visits, reminders, business hours, etc. all show wrong times for ~5 months
- Bonus: the DST transition itself (specific Sunday in March + November) breaks for a few hours

## The right way

Always use named timezones via Intl.DateTimeFormat or a TZ library:

```ts
// ✓ Use Intl (zero dependencies, handles DST automatically)
const floridaTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric',
  hour12: false,
}).format(new Date());

// Or use date-fns-tz for arithmetic
import { utcToZonedTime, format } from 'date-fns-tz';
const floridaNow = utcToZonedTime(new Date(), 'America/New_York');
```

`America/New_York` is the IANA timezone name — handles DST + historical offsets.

## Hard rule

**Never hardcode `-4`, `-5`, or any specific offset for Florida.** Use `America/New_York`.

For other regions: use the IANA name (e.g., `America/Los_Angeles` for Pacific).

## Detection patterns

Flag in code review:

```regex
- 4 \* 60 \* 60 \* 1000
\* 60 \* 60 \* 1000  // any hardcoded hour math
new Date\(.* - \d+ \* 3600
\.getTimezoneOffset\(\) === [-]?\d+
'\+|\-\d{2}:\d{2}'  // ISO offset strings
```

## Fix recipe

When you find hardcoded TZ in production:

1. Add IANA timezone constant: `const FLORIDA_TZ = 'America/New_York';`
2. Replace the `-4 * 60 * 60 * 1000` arithmetic with `utcToZonedTime` or `Intl.DateTimeFormat`
3. Test in BOTH EDT and EST windows (or use jest mocks)
4. Audit for downstream displays — UI showing wrong time has a ripple effect

## Edge cases to test

- **DST transition** (second Sunday of March; first Sunday of November): an hour is added/skipped
- **Customer in a different timezone** (Day14 may someday onboard non-FL customers): per-customer timezone in brand.json
- **Server in UTC** (Vercel default): assume UTC; convert for display only
- **Database timestamps**: always store UTC in Supabase; format for display in user's TZ

## When invoked
- Code review of any file doing time math
- Daily check on any cron / scheduled task setup
- Quarterly Day14 OS audit

## Logging

`[YYYY-MM-DD HH:MM ET] no-hardcoded-tz-offset → file: {path}, finding: {brief}, severity: {high during DST transition window, medium otherwise}`

## The existing Splash Jacks bug

Open postmortem candidate: surface to Jack as P1 with this skill's recommendation. Estimated fix: 30 min + a deploy.

File to fix: TBD — Round 3 harvest found the pattern but didn't pinpoint a single file. Likely candidates:
- `~/Documents/splash-jacks-pools/src/lib/time/florida-now.ts` (if exists)
- Any cron job route that schedules visit reminders
- `src/components/business-hours.tsx`

Audit + fix BEFORE next EST transition (early November 2026). Otherwise: visit reminders 1h off for 5 months.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('no-hardcoded-tz-offset', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'no-hardcoded-tz-offset', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
