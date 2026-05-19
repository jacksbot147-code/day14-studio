---
name: upgrade-nudge-detector
description: Detect customers who are signaling readiness to upgrade — usage at plan ceiling, feature requests for higher tier, growth in their own business. Surface them with the right pitch at the right moment.
triggers:
  - "upgrade"
  - "upsell"
  - "tier up"
  - "ready for more"
---

# upgrade-nudge-detector

> The right time to ask for the upgrade is when they're already feeling
> the ceiling. Not earlier (premature), not later (they'll churn-and-shop).

## Signals that say "ready to upgrade"

| Signal | What it means | Confidence |
|---|---|---|
| Hit storage/traffic limit on $497 plan | Hard ceiling | Very high |
| Asked about feature only on $997 plan | Self-identified | Very high |
| Their business added employees / locations | They grew | High |
| Visiting pricing page logged-in | Re-evaluating | High |
| Stripe payment success streak 6+ months | Stable, can afford more | Med |
| Positive reviews + 90+ day tenure | Happy + invested | Med |
| Engaged with last 3 monthly emails | Active relationship | Med |

Score 3+ signals → recommend upgrade conversation.

## What this skill does

1. Weekly: scan active customer base for signals
2. For each candidate: gather the upgrade pitch (what they're paying, what next tier costs, the specific value adds)
3. Route to Jack as a Telegram approval card — NOT auto-send
4. On Jack approval → send personalized upgrade email (not a generic blast)

## Pitch template (auto-filled per customer)

```
Subject: Quick thought on your {site} — {their_first_name}

Hey {first_name},

Saw your last few logins to {customer_url} — you've been hitting
{specific_metric} regularly. Just want to flag: the next tier up
(${next_tier_amount}/mo, additional ${diff}/mo) includes:

- {feature_1_that_solves_their_specific_need}
- {feature_2_that_aligns_with_their_signal}
- {feature_3_aspirational}

I noticed because {specific_observation_from_signals}.

Want to try it for a month at no extra cost to see if it fits? If yes,
I'll bump you up tonight, no commitment past June.

— Jack
```

## Hard rules

1. **Never auto-send an upgrade email.** Upgrade pitches must come from Jack.
2. **Always cite the specific signal** in the pitch. Generic upgrade emails read as spam.
3. **Always offer a no-commitment trial month.** Reduces ask-friction; tier-up should feel like adding features, not buying more.
4. **Never pitch upgrade during a problem.** Customer with open complaint = solve first, sell never.
5. **Maximum 1 upgrade pitch per customer per 90 days.** Repeated pitches = annoying.
6. **Never pitch upgrade to churn-risk-red customers.** They need a save, not a sell.

## Discount rules

- Free month trial = OK (no precedent set on lifetime price)
- "Lock in this price forever" = NEVER (artificial scarcity, breaks trust if discovered)
- "25% off if you upgrade today" = OK occasionally for established customers

## Inputs

- `customer_slug` (optional, single-customer mode)
- `signal_threshold` (default 3)

## When invoked

- Weekly via scheduled task (Wed 7 AM ET)
- Inside `customer-history-lookup` when reviewing a customer
- `/upsell {slug}` Telegram command — manual
- Real-time on hitting plan-limit threshold

## Output

```
✓ Upgrade candidates this week: 3

1. real-estate-co — score 5
   Currently: $497 ($497 plan)
   Pitch: $997 plan ($500/mo lift)
   Signals: hit storage cap 3×, asked about MLS integration, 6mo tenure
   Send pitch? [yes] [no] [defer]

2. casamore — score 4
   Currently: $997 ($997 plan)
   Pitch: $1997 plan (custom)
   ...
```

## Failure modes

- **No signals trigger for any customer**: surface as "stable — no upgrades needed this week"
- **Customer says no with annoyance**: log + 180-day cool-down, not 90
- **Customer says yes but doesn't pay**: route to `failed-payment-retry` if charge fails

## Logging

`[YYYY-MM-DD HH:MM ET] upgrade-nudge-detector → candidates: {N}, accepted: {N}, declined: {N}, mrr_gained: ${amount}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('upgrade-nudge-detector', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'upgrade-nudge-detector', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
