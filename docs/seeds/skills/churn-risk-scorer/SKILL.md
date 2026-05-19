---
name: churn-risk-scorer
description: Score every active customer 0-100 on churn risk using behavioral signals. Surfaces the 5-10 customers most likely to leave so Jack can intervene before they do.
triggers:
  - "churn risk"
  - "who is going to leave"
  - "at-risk customers"
  - "churn score"
---

# churn-risk-scorer

> The week before a customer cancels, they go quiet, stop logging in,
> and stop responding. By then it's usually too late. This skill catches
> them at the "quiet" stage.

## Signals (weighted)

| Signal | Weight | Risk add |
|---|---|---|
| No login in 30+ days | 25 | High |
| Last email response > 14 days | 15 | Med |
| Asked about cancellation/refund | 30 | Critical — auto-flag |
| Payment failed in last 30 days | 20 | High |
| Site error rate > baseline | 10 | Med |
| Negative feedback in last review | 15 | High |
| Decreasing usage trend (3wk decline) | 15 | Med |
| Hasn't replied to "everything OK?" check-in | 10 | Med |
| Posted complaint on social/Google | 25 | Critical |
| Paused subscription in last 90 days | 15 | Med |

Sum (max ~100). Bucket:
- 0-30: green (healthy)
- 31-60: yellow (monitor)
- 61-80: orange (intervene)
- 81-100: red (act now)

## Output schema

`~/Documents/businesses/_shared/metrics/churn-risk-{YYYY-MM-DD}.md`:

```
# Churn risk — 2026-05-17

## 🔴 Red (3) — act this week
1. buildbridge          score: 87
   Signals: no login 45d, email unanswered 21d, payment failed once
   LTV at risk: $11,964
   Suggested: Jack call, not email. Open with "noticed you've been quiet."

2. casamore             score: 81
   Signals: cancellation question 8 days ago, no response since
   LTV at risk: $17,895
   Suggested: discount-floor-enforcer applies. Offer pause not cancel.

## 🟠 Orange (5) — intervene this week
[5 customers with score 61-80]

## 🟡 Yellow (12) — monitor
[summary; deep-link to dossiers]

## Aggregate
- 3 red customers = $36k LTV at risk
- 5 orange = $42k LTV at risk
- Total at-risk book: $78k (out of $312k total)
```

## Hard rules

1. **Always rank by LTV-at-risk, not just score.** Saving a $20k customer with score 75 > a $500 customer with score 95.
2. **Never auto-discount red customers.** Discount floor enforcer applies. Talk first, discount only if necessary.
3. **Always show signals** — score alone is uninspectable. Signals are what Jack acts on.
4. **Never email all red customers en masse.** Mass "save" emails feel desperate. One-by-one.
5. **Update weekly, not daily.** Daily creates panic from noise. Weekly captures real shifts.

## Inputs

- `customer_slug` (optional — single-customer mode for `/score {slug}`)
- `min_score` (default 30, hide green)

## When invoked

- Weekly via scheduled task (Monday 6 AM ET)
- Inside `daily-kickoff` if any red customers appear
- `/risk` Telegram command
- Auto-trigger on payment failure, refund question, negative feedback

## Failure modes

- **New customer (<7d)**: insufficient data → assign baseline 20
- **Bot/scraper traffic confuses login signal**: filter known bot IPs
- **Score 100 from single signal**: cap at 80 unless 3+ signals present

## Logging

`[YYYY-MM-DD HH:MM ET] churn-risk-scorer → customers: {N}, red: {N}, orange: {N}, ltv_at_risk: ${amount}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('churn-risk-scorer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'churn-risk-scorer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
