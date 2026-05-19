---
name: weekly-council-review
description: The weekly cadence pass on the council-log. Re-read every Council decision logged so far, evaluate how each one aged, and surface patterns. Invoked Sunday 8 PM by the day14-os-weekly-council-review scheduled task. Builds the decision-quality history that compounds into operator taste.
triggers:
  - "council review"
  - "review decisions"
  - "how did the council calls age"
  - "decision retrospective"
---

# weekly-council-review

> Council runs are bets. Every Sunday we check how the bets aged.
> The compounding value of Day14 OS is not the skills or the agents —
> it's the decision history that proves which advisor's lens
> consistently wins for Jack.

## Inputs (read in this order)

1. Every file in `~/Documents/businesses/_shared/council-log/*.md` —
   in numerical order
2. `~/Documents/studio/docs/overnight/MASTER_LOG.md` — to detect
   whether the Chairman's recommended action was taken
3. `~/Documents/studio/docs/overnight/eod-*.md` from the past 7 days —
   for context on whether action was taken
4. The most recent `council-review-*.md` if one exists — to see what
   was reviewed last week and what carried over

## Per-entry evaluation

For each council-log entry, evaluate these in order:

### 1. Was the recommendation taken?
- **Yes:** find the evidence (commit, file modification, EOD entry,
  scheduled task that ran). Cite it.
- **No:** name what was done instead. Sometimes "nothing" is the
  answer — that's also data.
- **Partially:** common; describe which part.

### 2. What was the outcome?
- **Worked:** the predicted result materialized
- **Didn't work:** the predicted result didn't materialize
- **Unclear:** not enough time has passed to evaluate (note "too-soon-to-tell")
- **Surprised:** unexpected outcome (positive or negative)

### 3. Score the call: "aged-well" / "OK" / "aged-poorly" / "too-soon"

- **aged-well:** recommendation taken, outcome matched, and in
  retrospect this was clearly the right call
- **OK:** recommendation taken, outcome roughly matched, but a
  different option might have been comparably good
- **aged-poorly:** recommendation taken, outcome failed; OR
  recommendation NOT taken and the alternative worked
- **too-soon:** less than 14 days since the decision, no meaningful
  outcome data yet. Defer scoring.

## Output structure

Write to `~/Documents/studio/docs/overnight/council-review-YYYY-MM-DD.md`:

```
# Weekly council review — YYYY-MM-DD

## Entries reviewed: [N]
## Entries with new aging data this week: [N]

## Per-entry scoring
| # | Slug | Decision date | Recommendation | Status | Aged |
|---|------|---------------|----------------|--------|------|
| 0001 | first-customer-acquisition | 2026-05-15 | Splash Jacks video + 5 DMs | taken | aged-well |

## Patterns I notice
(max 3 — e.g., "Contrarian lens has won 3/3 calls when stakes were
acquisition-related. Worth weighting heavier in future Council runs
on acquisition decisions.")

## Open decisions that should get a Council run this week
(max 3 — specific upcoming forks that warrant the protocol)

## Updates to make to existing council-log entries
(list of council-log/{N}-*.md files that should get an "Outcome
review" section appended this week)
```

## Updating original council-log entries

After scoring, update each original `council-log/NNNN-*.md` file by
appending (NOT replacing) an "Outcome review" section at the bottom:

```
## Outcome review — YYYY-MM-DD (NN days after decision)

**Was the recommendation taken?** [yes/no/partially]
**What actually happened?** [one paragraph]
**Aged:** [aged-well / OK / aged-poorly / too-soon]
**Lesson for future Council runs:** [one sentence]
```

Add this section once per quarterly review. Don't overwrite prior
reviews — append a new one.

## Pattern detection

After 5+ entries, start looking for:

1. **Which advisor's recommendation gets adopted most often?** (Bias)
2. **Which advisor's lens has the best aging score?** (Truth)
3. **Mismatch between (1) and (2)?** That's actionable — Jack is
   over-weighting a lens that isn't actually winning.
4. **Decision categories where Council adds the most value** (pricing,
   acquisition, hiring, scope) vs. where it adds noise.

Surface these as "Patterns I notice."

## Voice

Use the **day14-voice** skill. Specifically:
- Score lookups are factual: "Recommendation taken, outcome matched"
  not "Recommendation was carefully considered and ultimately implemented"
- Pattern observations are direct: "Contrarian wins 3/3 on acquisition"
  not "There may be a trend suggesting the Contrarian's input is valuable"
- Don't editorialize Jack's decisions. The score is the score.

## Failure modes

- **No new evidence since last review:** that's fine. Output "No new
  aging data this week. Next review next Sunday." and exit.
- **Recommendation can't be evaluated:** if the action depends on
  external data (customer reply, deploy result, etc.) not yet available,
  score as "too-soon" and don't fabricate.
- **Multiple recommendations in one Council:** evaluate each
  separately. The Chairman often packages 3 actions; aging is per-action.

## Logging

After writing the review, append to MASTER_LOG:
`[YYYY-MM-DD 20:00 ET] weekly-council-review COMPLETE → council-review-YYYY-MM-DD.md, confidence: <0.0-1.0>`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('weekly-council-review', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'weekly-council-review', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
