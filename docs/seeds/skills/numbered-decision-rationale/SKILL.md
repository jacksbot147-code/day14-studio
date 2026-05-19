---
name: numbered-decision-rationale
description: When surfacing options to Jack, use a numbered 1-2-3 list with ≤3 items. Lets Jack reply "1" for tap-fast decisions. Codifies the close-out shape observed across sessions where Jack consistently picked numbered options fastest.
triggers:
  - "what should I do"
  - "options"
  - "give me choices"
  - "decide for me"
---

# numbered-decision-rationale

> Jack picks fastest from numbered lists. 3 items max. Each item is a
> concrete commitment with a stake, not a "maybe."

## The required shape

When an agent needs Jack to pick:

```
Three options:

1. {Option A — verb-led, 1 line}
   Stake: {what happens if picked, 1 line}

2. {Option B}
   Stake: ...

3. {Option C}
   Stake: ...

Recommendation: {option N} ({1-sentence reason})
```

## Rules for the list

1. **2-3 items.** Never 4+. If you have 4+, the question isn't framed right; collapse two together.
2. **Each item is a verb-led command** ("Ship X" not "Consider whether to ship X").
3. **Each item has a stake** — what tradeoff Jack is making.
4. **Recommendation is explicit** — one of the items must be tagged "recommendation."
5. **Replies "1" / "2" / "3" / "go with N"** auto-route to that option.

## Examples

### Good
```
Three options for the Stripe live-mode flip:

1. Flip now, run a $1 self-test, immediately refund.
   Stake: ~10 min; verifies live flow; ~$0 real cost.

2. Flip after Cal.com booking is also wired.
   Stake: ~2 days delay; lower risk of partial-state issues.

3. Stay in test mode until customer #1 deposit ready.
   Stake: blocks any live deposits; safest for now.

Recommendation: 1 — we want to know live works before a real customer is in flight.
```

Jack can reply: "1" → done.

### Bad
```
Should we flip Stripe to live mode now or wait?

Options to consider:
- We could flip now, but there are tradeoffs.
- We could wait until Cal.com is wired.
- We could wait until customer #1.
- We could do it in stages.
- We could rethink the approach.

Let me know what you think.
```

5 items, no stakes, no recommendation, ambiguous reply path.

## When NOT to use this pattern

- Yes/no questions → ask directly, don't force 3 options
- Pure information requests → answer the question
- Decisions inside the council-decision threshold → run Council, not this skill
- Trivial decisions (action-bias-coach territory) → ship rough; don't list options

## Hard rules

1. **Never list more than 3 options.** Pick the top 3.
2. **Always include a recommendation.** If you don't have one, you haven't done the work yet.
3. **Always show stakes inline.** Jack tap-fast decisions require the cost visible.
4. **Never structure as "we could X" — use imperative "Ship X".** Decisive language.

## When invoked
- Whenever asking Jack to pick between paths
- Inside `action-bias-coach` when stalling is detected
- Inside `daily-kickoff` "decisions waiting" section

## Logging
Not separately logged — visible in the chat. Quarterly review of replies: % that were "1/2/3" vs free-form. Higher % = better-framed options.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('numbered-decision-rationale', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'numbered-decision-rationale', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
