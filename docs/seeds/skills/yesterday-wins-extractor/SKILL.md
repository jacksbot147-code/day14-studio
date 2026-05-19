---
name: yesterday-wins-extractor
description: Read yesterday's MASTER_LOG, EOD report, and git commits to extract the 1-3 concrete wins for the morning kickoff's "Yesterday's wins" section. Supporting skill for daily-kickoff.
triggers:
  - "yesterday's wins"
  - "what shipped yesterday"
  - "recap"
---

# yesterday-wins-extractor

> Morning kickoff opens with proof of forward motion. "Yesterday's
> wins" is the first thing Jack reads. This skill writes it.

## Input
- `~/Documents/studio/docs/overnight/eod-{YYYY-MM-DD}.md` for yesterday
- `~/Documents/studio/docs/overnight/MASTER_LOG.md` entries from yesterday
- `git log --since="24h ago" --oneline` across studio + customer repos
- `events` table entries from yesterday

## Win extraction rules

### What counts as a win
- A commit pushed to main (template-level or customer-level)
- A skill file written + added to bootstrap
- A customer dossier event with kind != routine maintenance
- A scheduled-task `COMPLETE` line in MASTER_LOG
- A Council decision logged
- A customer reply sent (Jack-approved + sent)
- A meeting / call that closed a question

### What does NOT count
- A draft (only sends count)
- A planning doc (only execution counts)
- A renamed file (cosmetic)
- An empty re-run of bootstrap (no change)
- Reading something (no action)

## Filter algorithm

1. Pull all yesterday's signals (commits, log entries, events)
2. Dedupe (one event per artifact)
3. Cluster by area (acquisition, build, OS, content, ops)
4. Rank by visibility-to-customer (customer-facing wins > internal-only)
5. Trim to top 3

## Output format

For `daily-kickoff`:

```
## Yesterday's wins
- Shipped: {one specific thing with file/commit/customer reference}
- Shipped: {second}
- Shipped: {third}
```

If yesterday was a 0-win day:
```
## Yesterday's wins
- Nothing shipped yesterday. Focus today: {what to break the stall}.
```

Honest > flattering. Day14 voice = no inflation.

## Examples

Good output:
```
- Shipped: empire bootstrap on laptop with 26 skills (45 files added to _shared/)
- Shipped: Supabase day14-studio project + schema deployed (5 tables, 2 views, RLS enabled)
- Shipped: leaked Stripe key rotated (postmortem 2026-05-16-secret-key-leak.md)
```

Bad output (inflated):
```
- Made great progress on Day14 OS
- Spent significant time on configuration
- Worked through several decisions
```

## Hard rules

1. **Never claim a win that didn't happen.** If yesterday's EOD says "nothing shipped" — say that.
2. **Never list more than 3 wins** in the kickoff. More feels like padding.
3. **Always cite the artifact** (file path, commit SHA, dossier event) so Jack can verify.
4. **Never count "drafts produced" as wins.** Drafts are work-in-progress, not output.
5. **Never recycle wins across days.** If yesterday's kickoff already mentioned a win, don't re-mention it today.

## Failure modes

- **No MASTER_LOG entries yesterday + no git activity**: legitimate zero-win day; output that honestly
- **MASTER_LOG full of low-value "task completed" lines**: filter aggressively; surface only customer-visible or unblocker wins
- **Yesterday was Sunday or a planned off-day**: skip the wins section entirely; output "Off-day. Today: {what's planned}."

## When invoked
- Inside `daily-kickoff` every weekday morning
- Inside `weekly-council-review` to compile a week's worth of wins
- Manually for end-of-month / end-of-quarter recaps

## Logging

`[YYYY-MM-DD HH:MM ET] yesterday-wins-extractor → wins_found: N, surfaced: {1-3}, day_type: {productive|maintenance|zero}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('yesterday-wins-extractor', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'yesterday-wins-extractor', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
