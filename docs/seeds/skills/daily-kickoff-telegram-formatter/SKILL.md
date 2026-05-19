---
name: daily-kickoff-telegram-formatter
description: Turn the daily-kickoff markdown file into a Telegram-friendly message. Compact, scannable, button-driven. Phase 3 supporting skill that bridges daily-kickoff (skill) to Telegram delivery.
triggers:
  - "kickoff to telegram"
  - "morning push"
  - "daily digest formatted"
---

# daily-kickoff-telegram-formatter

> daily-kickoff writes a one-screen markdown file. Telegram needs an
> even tighter format. This skill compresses without losing signal.

## Input
- Path to today's `kickoff-YYYY-MM-DD.md` (written by `daily-kickoff`)

## The compression

A full kickoff markdown is ~40 lines. Telegram version is ~15 lines.

Strategy:
1. Yesterday's wins → keep all 3 (already compact)
2. Today's 3 priorities → keep all 3 but truncate to 1 line each
3. Decisions waiting → keep ALL (if any) — they need decisions
4. Calendar awareness → 1 line if any
5. Coffee-and-go → 1 line, the single first action

## Output template (MarkdownV2)

```
☀️ *Daily kickoff* — {date} \({dow}\)

*Yesterday's wins*
• {win 1}
• {win 2}
• {win 3}

*Today's priorities*
1\. {priority 1 — 1 line}
2\. {priority 2 — 1 line}
3\. {priority 3 — 1 line}

*Decisions waiting*
{list if any; "None\." if empty}

*Calendar*
{1 line if any; "Clear\." if empty}

*Coffee\-and\-go*
{the single first action — 1 line}
```

Then inline buttons at the bottom:
- `[📂 Full briefing]` — link to the full markdown file path
- `[✅ Mark priorities done at EOD]` — placeholder for end-of-day check
- `[🔇 Skip tomorrow]` — only show if Jack has been receiving these consistently for 14+ days

## Hard rules

1. **Never exceed 1024 chars total** (Telegram readability limit for digest-style).
2. **Never include the FULL priorities** — only 1-line each. Full version stays in the file.
3. **Never auto-send during snoozed hours.** Wait for wake.
4. **Always escape MarkdownV2 special chars** in every field.
5. **Never re-send the same day's kickoff** if Jack already received one (dedup by date).

## Failure modes

- **daily-kickoff hasn't run yet at 9 AM**: surface to operator; fallback to manual "good morning, what's on your plate today?"
- **Kickoff file format unexpected**: parse what's possible; warn if structure changed
- **Empty priorities (all blocked)**: surface as "Day is blocked. Top blocker: {what}"

## When invoked
- Scheduled task right after `daily-kickoff` completes (e.g., 9:05 AM Mon-Fri)
- Manually when Jack wants to re-receive today's kickoff

## Logging

`[YYYY-MM-DD HH:MM ET] daily-kickoff-telegram-formatter → date: {date}, chars: {N}, queued: {file}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('daily-kickoff-telegram-formatter', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'daily-kickoff-telegram-formatter', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
