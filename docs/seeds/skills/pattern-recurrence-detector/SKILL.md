---
name: pattern-recurrence-detector
description: Read the postmortem log and detect when the same root cause appears in 3+ postmortems. Surfaces a "this isn't a one-off, this is a class" alert. Supporting skill for postmortem-writer.
triggers:
  - "recurring failure"
  - "we've seen this before"
  - "pattern detected"
  - "third time"
---

# pattern-recurrence-detector

> Three of the same kind of postmortem isn't bad luck. It's a
> process gap. This skill catches the gap.

## Input
- `~/Documents/studio/docs/postmortems/*.md` — all postmortems

## The matching

For each postmortem, extract:
- **Root cause category** (from the "Root cause" section)
- **Failing component** (which skill, agent, or vendor)
- **Severity** (low/medium/high)
- **Skill to update / add** (from the postmortem's last section)

Cluster postmortems by:
1. Same root cause category (e.g., "rsync ignored .gitignore", "Stripe webhook signature mismatch", "session path hardcoded")
2. Same failing component (e.g., "bootstrap-day14-os.sh", "browser-driven-vendor-setup")
3. Same prescribed fix that didn't fully fix

## Threshold for "pattern detected"

A pattern is real when:
- 3+ postmortems share a root cause category, OR
- 2+ postmortems share AND the second one was within 30 days of the first

If only 1 postmortem exists for a category → not yet a pattern. Note it but don't escalate.

## Output

Update `~/Documents/studio/docs/postmortems/_patterns.md` (overwrite weekly):

```
# Postmortem patterns — {date}

## Patterns detected (3+ recurrences)

### Pattern A: {root cause category}
- Postmortems: {list of file paths}
- Count: 3
- Time span: {first date} → {latest date}
- Affected component: {what}
- Past fixes attempted: {what was tried}
- Why fixes didn't work: {analysis}

**Recommended next-level fix:** {what to do — typically a new skill or a constraint added to existing skill}

## Near-pattern (2 recurrences, watch list)

### Pattern X: {category}
- Count: 2
- Watching for third occurrence

## Resolved patterns

### Pattern B (previously): {category}
- Resolved by: {what fixed it}
- Last occurrence: {date}; nothing similar since {N days}
```

## What "recommended next-level fix" looks like

When a fix at the postmortem level hasn't worked 3 times, the fix is at the SKILL level. Recommendations are concrete:

- "Add a check in {skill} that catches {pattern} before it propagates"
- "Create a new skill: {name} that handles {scenario}"
- "Restructure {process} to make {failure mode} architecturally impossible"

Surface these as council-decision candidates if they require significant change.

## Hard rules

1. **Never claim a pattern from a single occurrence.** Even high-severity. One data point is anecdote.
2. **Never auto-create a new skill.** Surface the recommendation; Jack approves; agent then drafts the SKILL.md.
3. **Never close a pattern as "resolved" without 90 days of no recurrence.** Patterns are sticky.
4. **Always cite specific postmortem files.** Patterns are claims; claims need evidence.

## When invoked
- Weekly via scheduled task (after `weekly-council-review`)
- Manually when Jack feels "this keeps happening"
- After every new postmortem is filed (real-time detection of "this is #3")

## Logging

`[YYYY-MM-DD HH:MM ET] pattern-recurrence-detector → postmortems_scanned: N, patterns_detected: N, near-patterns: N`

When a new pattern is detected:
`[YYYY-MM-DD HH:MM ET] ⚠️ pattern-recurrence-detector NEW → category: {name}, count: 3, recommended skill change: {what}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('pattern-recurrence-detector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'pattern-recurrence-detector', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
