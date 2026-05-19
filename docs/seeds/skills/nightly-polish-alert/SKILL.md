---
name: nightly-polish-alert
description: After nightly-polish runs at 11 PM, this skill decides whether Jack hears about it. Silent if everything's green (the normal case). Alerts only on real issues. Phase 3 supporting skill — keeps Jack's sleep undisturbed.
triggers:
  - "polish alert"
  - "nightly polish push"
  - "polish issues"
---

# nightly-polish-alert

> The nightly polish report is mostly boring — everything is fine.
> Pushing every "all clear" trains Jack to ignore the channel. This
> skill is the gatekeeper.

## Input
- Path to `polish-YYYY-MM-DD.md` (written by `nightly-polish`)

## The decision

Read the polish report. Look at the "Issues found" section:

| Issue count | Severity | Action |
|---|---|---|
| 0 | n/a | silent — log only |
| 1-2 | low | wait until morning digest (P3) |
| 1+ | medium | P2 in morning digest |
| 1+ | high | P1 — send now (still respects asleep hours; defers to 8 AM if late) |
| 1+ | critical (site down, cert expiring <3d, secret leak) | P0 — send NOW regardless |

## Output (when sending)

For P0 (critical, site-down):
```
🚨 *Polish: P0 issue*

{customer\_url} returning {status}\.

Site has been down for: {N min}
Last successful check: {timestamp}
Suggested first action: {one specific line}

Full report: {path}
```
Buttons:
- `[🔄 Try restart]` (if applicable)
- `[📞 Call provider]`
- `[📋 Full diagnostic]`

For P1 (high):
```
⚠️ *Polish: issue tonight*

{customer\_url}: {issue summary}

{N} more issues across other sites \(see full report\)\.

Full: {path}
```
Buttons:
- `[📋 Full report]` `[👍 Acknowledge]`

For P3 (low, all-clear):
- No push. Logged silently.

## Hard rules

1. **Never push "all clear" as a separate message.** Boring at the best of times; disruptive at midnight.
2. **Always include the file path** so Jack can read the full report when he wants.
3. **Never push P3 separately.** Wait for morning digest.
4. **Always escalate to P0 if a customer-facing site is down** for >5 min. Customer notices before Jack does = bad.
5. **Never auto-fix.** Even if `nightly-polish` finds and proposes a fix. Jack approves any prod change.

## Logging

`[YYYY-MM-DD HH:MM ET] nightly-polish-alert → issues: N, max_severity: {level}, push: {now|morning-digest|silent}`

When P0 fired:
`[YYYY-MM-DD HH:MM ET] 🚨 nightly-polish-alert P0 — site: {url}, issue: {one-line}, pushed_at: {timestamp}`

## When invoked
- Scheduled task right after `nightly-polish` completes (11:05 PM daily)
- Manually if Jack wants to verify a polish report after-the-fact
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('nightly-polish-alert', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'nightly-polish-alert', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
