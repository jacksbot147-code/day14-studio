---
name: followup-action-creator
description: When a visit note flags a future action ("equipment failing — needs replacement in 2 weeks"), this skill auto-creates the follow-up task. Pulls from issues_found in visit logs and queues them in the customer's pipeline. Supporting skill for customer-visit-note-writer.
triggers:
  - "follow up needed"
  - "future action"
  - "next visit"
  - "needs repair"
---

# followup-action-creator

> A tech notices "the pump is making a noise" — files it in the
> visit note. 2 weeks later, the pump fails. The customer is upset.
> The follow-up wasn't tracked. This skill prevents that.

## Input
- Visit note (just-completed visit)
- The `issues_found` field (free text from tech)

## The classification

Parse `issues_found` for action-bearing phrases:

| Pattern | Action type | Default timeline |
|---|---|---|
| "needs to be replaced" / "failing" | replacement | 30 days |
| "watch for" / "monitor" | recheck | next visit |
| "schedule" / "book" / "set up" | scheduling | 7 days |
| "low / out of {something}" | resupply | next visit |
| "leaking" / "broken" | repair | 7 days (or sooner) |
| "may need" / "consider" | recommendation | 90 days |

For each detected action:

1. Extract the WHAT (component / part / service)
2. Extract the WHEN (use defaults if not specified by tech)
3. Extract the URGENCY (any "urgent", "ASAP", "soon" modifiers)
4. Create an entry in customer's followup queue

## Storage

A dedicated section in the customer's dossier: `02-build-log.md` → "Open follow-ups":

```
## Open follow-ups

| Created | Due by | What | Status |
|---|---|---|---|
| 2026-05-16 | 2026-06-15 | Pump replacement quote (Pentair MaxFlow making noise) | open |
| 2026-05-16 | 2026-05-23 | Schedule pH adjustment shipment | open |
```

When status changes to "scheduled" or "complete," the row is moved to a "Closed follow-ups" section (audit trail) but not deleted.

## Surface to operator

For non-routine actions, surface to the operator via:

- **Within 7 days**: file an approval card "{Customer} action due: {action}"
- **Within 30 days**: list in `daily-kickoff`'s "decisions waiting" section
- **>30 days out**: just log; surface 30 days before due date

## Auto-trigger of next-visit suggestions

If an action's timeline aligns with the customer's regular service cadence (e.g., pool service is weekly), append to the NEXT visit's "tech briefing":

```
Tech briefing for {next visit date}:
- Last visit found: {issue}
- This visit: {recheck or recommended action}
```

The tech sees this on their phone when they pull up the visit form.

## Hard rules

1. **Never auto-bill** for follow-up work. The follow-up creates a CONVERSATION; pricing decisions are explicit.
2. **Never close a follow-up** based on time passing alone. Closure requires action evidence.
3. **Never duplicate follow-ups.** If a tech notices the same issue 2 visits in a row, escalate the existing item rather than creating a new one.
4. **Never override the tech's stated urgency.** If they wrote "ASAP," timeline is 7 days regardless of patterns.

## Failure modes

- **Tech wrote prose without clear actions**: parse with low confidence; surface to Jack for manual triage
- **Action timeline is vague** ("eventually"): default to 60 days; surface for owner clarification
- **Customer's contract doesn't cover the action** (e.g., out-of-scope repair): flag as "out of scope; need explicit quote"
- **Action involves third party** (e.g., "call electrician"): mark as "external dependency"; track but don't manage

## When invoked
- Inside `customer-visit-note-writer` automatically after a visit note is logged
- Manually when Jack reviews a visit and adds an action
- Inside `daily-kickoff` to surface this week's due actions

## Logging

`[YYYY-MM-DD HH:MM ET] followup-action-creator → customer: {slug}, visit: {date}, actions_created: N, surfaced_to_kickoff: N`

When an action is overdue without resolution:
`[YYYY-MM-DD HH:MM ET] ⚠️ followup-action-creator OVERDUE → customer: {slug}, action: {what}, age: {N days}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('followup-action-creator', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'followup-action-creator', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
