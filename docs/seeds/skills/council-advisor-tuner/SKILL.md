---
name: council-advisor-tuner
description: Quarterly review of which advisor lens has aged best for Day14 decisions. Reads the council-log + outcome-reviews, scores each advisor's track record, recommends rebalancing. Supporting skill for council-decision + weekly-council-review.
triggers:
  - "advisor performance"
  - "which lens wins"
  - "tune council"
  - "advisor scoring"
---

# council-advisor-tuner

> Five advisors. Some lenses fit Jack's domain better than others.
> By Council run #20, the pattern is visible — this skill makes it
> explicit so future Councils weight the winning lens slightly higher.

## Trigger
- Quarterly (every 90 days)
- After every 10 Council runs (whichever first)
- Manually when `weekly-council-review` flags "Contrarian wins X-for-Y on acquisition" patterns

## Input
- All files in `~/Documents/businesses/_shared/council-log/*.md`
- Each file's "Outcome review" section (written by `weekly-council-review`)

## The scoring

For each Council entry where outcome is known (aged > 30 days):

1. Map back the advisor → response letter (was anonymized; the mapping is in the entry)
2. For each advisor's response, score:
   - **Did Jack take this advisor's recommendation?** (Y/N)
   - **If Y, did the outcome match?** (well-aged / OK / aged-poorly)
   - **If N, did the alternative work?** (validation if Jack ignored this advisor; data either way)

3. Per advisor, compute:
   - `taken_rate` = (N times Jack adopted) / (N entries)
   - `aging_score` when taken = average outcome quality
   - `would-have-been-right` when not taken = % of times the advisor's path would have produced a better outcome

## Output

Append to `~/Documents/businesses/_shared/council-log/_advisor-scorecard.md`:

```
# Advisor scorecard — last updated YYYY-MM-DD
> Calibrated from N Council runs (M with full outcome data)

| Advisor | Taken rate | Aging when taken | Would-have-been-right when not taken | Net signal |
|---|---|---|---|---|
| Contrarian | 30% | 0.85 | 60% | strong-when-trusted |
| Reframer | 40% | 0.78 | 40% | average |
| Expansionist | 20% | 0.6 | 30% | weak |
| Outsider | 15% | 0.9 | 80% | UNDER-WEIGHTED ← |
| Executor | 60% | 0.82 | 50% | default-strong |

## Patterns
- {1-3 observations, e.g. "Outsider's calls have aged well 4/5 times but Jack only adopts 15% of them — under-weighted"}

## Recommendation
- {1-3 actions, e.g. "Next 5 Councils, when Outsider's take disagrees with Executor's, explicitly note it in the Chairman section"}

## Domain breakdown
| Decision class | Best advisor | Worst |
|---|---|---|
| Acquisition | {advisor} | {advisor} |
| Pricing | ... | ... |
| Build | ... | ... |
| Customer | ... | ... |
```

## Hard rules

1. **Never re-score below 5 total Council runs** — sample too small; conclusions are noise.
2. **Never aggregate across decision classes for the Top-Line score.** Advisors who win on pricing may lose on acquisition. Breakdown matters.
3. **Never auto-rebalance the Council protocol.** Surface findings; the protocol's structure is sacred until Jack explicitly modifies it.
4. **Never publish the scorecard.** Internal-only — gives away Day14's decision-making model.

## Failure modes

- **Most entries are "too-soon-to-tell":** wait. Don't force-score early outcomes.
- **Outcome-review section missing:** flag the entries; the gap is `weekly-council-review` not running consistently.
- **All advisors score equally:** likely a sample-size issue. Wait for more data.

## Logging

`[YYYY-MM-DD HH:MM ET] council-advisor-tuner → entries_scored: N, top advisor: {name}, under-weighted: {name}`

## When invoked
- Quarterly (every 90 days from first Council run)
- After every 10 Council runs
- Manually via Jack's command
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('council-advisor-tuner', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'council-advisor-tuner', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
