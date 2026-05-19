---
name: eod-telegram-formatter
description: Format the daily-eod markdown into a Telegram message. Honest accounting + tomorrow's first action + confidence score. Phase 3 supporting skill.
triggers:
  - "EOD to telegram"
  - "end of day push"
  - "evening summary"
---

# eod-telegram-formatter

> The 5 PM "here's what shipped" message. Honest, brief, action-tailed.

## Input
- Path to today's `eod-YYYY-MM-DD.md` (written by `daily-eod`)

## Output template

```
🌅 *End\-of\-day* — {date}

*Shipped*
• {item 1}
• {item 2}
• {item 3}

*Didn't ship*
• {item}: {reason}

*Blockers for tomorrow*
• {blocker}: {proposed unblock}

*Tomorrow's first action*
{1 line — the one thing to do before everything else}

*Confidence in this week's plan*: {0\.0\-1\.0}
```

Buttons:
- `[📂 Full EOD]`
- `[🌅 See morning kickoff for tomorrow]` (preview, auto-generated)

## Compression rules

- "Shipped" — keep up to 5 items; if more, summarize: "5 things shipped + 3 more in build log"
- "Didn't ship" — keep up to 3 items
- "Blockers" — keep up to 3
- "Tomorrow's first action" — exactly 1 line
- "Confidence" — single number + colored emoji
  - 0.9-1.0: 🟢 confident
  - 0.75-0.89: 🟡 cautious
  - 0.5-0.74: 🟠 slipping
  - <0.5: 🔴 plan-needs-revisiting

## Hard rules

1. **Never inflate "shipped" items.** If today was a 0-ship day, the message reads "Shipped: nothing. {Reason}."
2. **Never repeat yesterday's items.** Today's are today's.
3. **Never auto-send if today wasn't a working day.** Skip weekends unless Jack opts in.
4. **Always include the confidence score.** Jack will glance at the emoji first; that's the dashboard.
5. **Always include "tomorrow's first action."** Empty → "Tomorrow: open kickoff at 9 AM."

## Failure modes

- **No EOD file written yet at 5 PM**: surface to operator; means `daily-eod` didn't run; manually trigger or wait
- **EOD shows everything failed**: don't sugarcoat. "Shipped: nothing today. Yesterday's blocker still present. Tomorrow: break it via {specific action}."
- **EOD claims wins but git log doesn't show commits**: cross-check; surface discrepancy

## When invoked
- Scheduled task right after `daily-eod` completes (5:05 PM Mon-Fri)
- Manually after a 0-ship day to send a brief honest message

## Logging

`[YYYY-MM-DD HH:MM ET] eod-telegram-formatter → date: {date}, confidence: {N}, queued: {file}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('eod-telegram-formatter', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'eod-telegram-formatter', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
