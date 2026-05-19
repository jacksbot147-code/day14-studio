---
name: council-decision-followup-tracker
description: For each Council decision logged, watch for the Chairman's "concrete next step" to happen — and surface if it doesn't within the named horizon. Closes the loop between deliberation and action. Supporting skill for council-decision.
triggers:
  - "follow up council"
  - "did we do council"
  - "track decision"
  - "council aging"
---

# council-decision-followup-tracker

> A great Council recommendation Jack didn't act on is wasted
> deliberation. This skill prevents that.

## Trigger
- Every Council entry has a "concrete next step today" line in the Chairman section
- 24-48h after the Council was logged, this skill checks: did the next step happen?

## Input
- The Council entry file path
- The Chairman's concrete next step (extracted from the entry)
- The expected timing ("today" / "this week" / "by Friday")

## The check

Map the next-step to a verifiable signal:

| Step type | How to verify |
|---|---|
| "Record a video" | File exists at expected path with recent mtime |
| "Send N DMs" | Outreach log shows N entries |
| "Deploy / push code" | git log shows commit since Council date |
| "Cold call X" | Calendar event or call log |
| "Update docs" | File mtime shows edit since Council date |
| "Pay / charge" | Stripe/bank shows transaction |
| "Schedule" | scheduled-task list shows new task created |

If verifiable, check the signal. If not verifiable from files alone (e.g., "have a conversation with X"), surface to Jack: "did this happen?"

## States

- **DONE** — signal confirmed
- **PARTIAL** — some signal but incomplete (e.g., 2/5 DMs sent)
- **NOT-YET** — within the time horizon; no signal yet; reminder only
- **MISSED** — past horizon; no signal; surface as approval card

## Output

Append a status block at the bottom of the original council-log entry:

```
## Follow-up tracker (auto-generated)

- {YYYY-MM-DD HH:MM ET} status: DONE — signal: {what we found}
- {YYYY-MM-DD HH:MM ET} status: NOT-YET — checked at {time}, within horizon, no action expected yet
```

When state is MISSED, file an approval card via `approval-card-builder`:

> "Council decision 0001 next-step missed: recommendation was {what}. {N days} past horizon, no signal found. Should we (a) execute the original recommendation, (b) revisit the question via new Council, or (c) drop the path?"

## Schedule

- 24h after Council logged: first check
- 7 days: second check (in case "today" was loose)
- 30 days: outcome review (handed off to `weekly-council-review`)

Implement as 3 scheduled tasks per Council entry, OR roll into the weekly council-review (cheaper).

## Hard rules

1. **Never re-execute the Council's recommendation autonomously.** Surface to Jack; he picks what to do about a missed action.
2. **Never close out a follow-up as DONE without a concrete signal.** Self-reports don't count — file/commit/log/etc.
3. **Never re-spam Jack with reminders.** One reminder per check window. If 3 checks show MISSED, escalate to "this is now a different decision."
4. **Never delete the original council entry** based on outcome. History is preserved.

## Failure modes

- **Recommendation was vague ("consider doing X"):** can't track. Flag for `council-question-quality-check` to add a "concrete action" gate before allowing future vague conclusions.
- **Jack did the thing but didn't log it:** the signal exists in the world (a DM was sent) but not in Day14 OS. Add the signal capture proactively.
- **Recommendation was conditional ("if X, then Y"):** track whether X happened first, then Y.

## Logging

`[YYYY-MM-DD HH:MM ET] council-decision-followup-tracker → entry: {NNNN}, state: {DONE|PARTIAL|NOT-YET|MISSED}, signal: {what}`

## When invoked
- 24h, 7d, 30d after each Council entry
- Manually via "did council X happen?"
- Inside `weekly-council-review` weekly pass
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('council-decision-followup-tracker', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'council-decision-followup-tracker', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
