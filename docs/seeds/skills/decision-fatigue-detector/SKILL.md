---
name: decision-fatigue-detector
description: Track how many decisions Jack made today (approvals, choices, asks). After ~25 decisions, surface a "park new decisions until tomorrow" gate. Protects late-day judgment from collapse.
triggers:
  - "decision fatigue"
  - "too many decisions"
  - "am I tired"
  - "/decisions"
---

# decision-fatigue-detector

> By decision 30, the brain picks the easiest option, not the best. This
> skill knows when to stop asking and start parking.

## Counted as a decision

- Approving a Telegram card (yes/no/edit) = 1
- Choosing between options in `AskUserQuestion` = 1
- Ad-hoc choice ("which font?", "what price?") = 1
- Tapping `/done` or `/skip` on a workflow = 1
- Council vote tap = 1 (heavy — counts as 2)

NOT counted as decisions:
- Reading information (no choice required)
- Conversation
- Reactive responses (auto-acks)

## The fatigue curve

```
Decisions today  | State        | Action
----------------|--------------|------------------
0-15            | Sharp        | Normal flow
16-22           | Warmed up    | Normal flow
23-28           | Edge of fade | Telegram banner: "23/25 — finishing strong?"
29-35           | Fatigued     | Defer all non-urgent. P2 → P3.
36+             | Compromised  | Hard stop on new asks. Only P0.
```

## Hard rules

1. **Never override the gate for "just one more".** That's how it always starts.
2. **Always show the count** when it's ≥ 23. Awareness is half the solution.
3. **P0 events bypass.** Real emergencies don't wait. But cap P0 at 3/day or escalate to Council.
4. **Reset at midnight ET.** Sleep is the actual reset; the counter just enforces it.
5. **Never let `growth-watcher` queue meta-drafts past 25.** Meta-decisions are heaviest.
6. **Telegram-bridge respects the gate.** New approval cards queue silently above 28.

## State

`~/Documents/businesses/_shared/founder-ops/decisions-{YYYY-MM-DD}.jsonl`:

```jsonl
{"timestamp":"2026-05-17T08:30:00Z","decision_type":"approval","source":"refund-handler","weight":1}
{"timestamp":"2026-05-17T08:45:00Z","decision_type":"council_vote","source":"council-decision","weight":2}
...
```

Aggregated:
```
~/Documents/businesses/_shared/founder-ops/decisions-counter.json
{ "date": "2026-05-17", "count": 17, "weighted": 19, "last_reset_at": "..." }
```

## When invoked

- Continuously (counter increments on every decision-typed event)
- `/decisions` Telegram command → returns counter
- Inside `telegram-bridge` before queueing P2/P3 cards
- Inside `daily-kickoff` (shows yesterday's total)
- Inside `daily-eod` (logs today's pattern)

## Output

```
📊 Decisions today: 23 / 25
   Approvals: 12 (refund x2, upgrade pitch x3, draft promotion x7)
   Council votes: 2 (weighted +4)
   Ad-hoc: 5

State: edge of fade — finishing strong?
Tomorrow's reset: 00:00 ET
```

## Failure modes

- **Counter doesn't increment** (skill wasn't called): manual `/decisions add 5`
- **Counter ratchets too fast** (false positives): tune weights down
- **Jack genuinely needs to push past 35**: log the override; review during weekly council

## Logging

`[YYYY-MM-DD HH:MM ET] decision-fatigue-detector → count: {N}, state: {sharp|warmed|fade|fatigued|compromised}, gate_action: {none|warn|defer|block}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('decision-fatigue-detector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'decision-fatigue-detector', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
