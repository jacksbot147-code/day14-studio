---
name: confidence-and-gate-statement
description: Every recommendation Jack receives must include a confidence score AND what gates it — "ready to ship; no credentials needed" or "gates on Stripe webhook secret being added to Vercel." Codifies a pattern observed across morning briefings.
triggers:
  - "what's gating this"
  - "confidence on this"
  - "ready to ship"
  - "blocked by"
---

# confidence-and-gate-statement

> "Recommended: deploy" without context = trust gamble. "Recommended:
> deploy. Confidence 0.9. Gates: STRIPE_WEBHOOK_SECRET in Vercel."
> = decision Jack can make in 5 seconds.

## The required two-line footer

Every recommendation an agent surfaces to Jack ends with:

```
Confidence: 0.0-1.0 (one-sentence reason)
Gates: {comma-separated list of pre-conditions, or "none"}
```

## Confidence scoring (calibrated)

| Score | Meaning |
|---|---|
| 0.95-1.0 | Verified end-to-end with a test (e.g., schema deployed + queried back) |
| 0.85-0.94 | Best-effort verified; no test run but logically sound |
| 0.70-0.84 | Recommended but with caveats; documented in the body |
| 0.50-0.69 | Coin-flip; surface alternatives |
| <0.50 | Don't recommend; ask clarifying question instead |

## Gates examples

| Gate | What it means |
|---|---|
| `none` | Ready to ship as-is |
| `STRIPE_WEBHOOK_SECRET in Vercel` | Add the env var, then proceed |
| `customer's intake form submitted` | Wait for customer action |
| `Jack's approval on card #42` | Wait for tap |
| `Cal.com bot account verified` | Operator-side setup |
| `domain DNS propagated (5-60 min)` | Time-based wait |

Gates are checkboxes Jack can scan. If gates are empty, action can fire today.

## Why this matters

Reading transcripts from past sessions, the gap pattern is:
- Agent: "I recommend X."
- Jack: "ok"
- Jack tries to execute X.
- X fails because gate Y wasn't met.
- Wasted round-trip.

With this skill: Jack sees gate Y before trying. Either he satisfies it or he picks a different path. No wasted execution.

## Hard rules

1. **Every recommendation has both lines.** No exceptions.
2. **Never claim 0.95+ without an actual verification step.** Calibration drift erodes trust.
3. **Gates list real blockers** — not "should be fine" hedging. If you'd be surprised by failure, list the surprise as a gate.
4. **Never list more than 5 gates.** If there are >5, scope is too big; break into smaller recommendations.

## Examples

### Good
```
Recommendation: Run bootstrap to seed the 4 new Telegram skills.

Confidence: 0.92 — skills written + bootstrap loop updated; idempotency verified locally.
Gates: none.
```

### Good (gated)
```
Recommendation: Flip Stripe to live mode for the Site SKU.

Confidence: 0.85 — test mode validated end-to-end yesterday.
Gates: STRIPE_WEBHOOK_SECRET live-mode value in Vercel; live Stripe Payment Link created (replaces test URL).
```

### Bad (no footer)
```
Recommendation: deploy the customer site to production.
```

### Bad (vague confidence)
```
Confidence: high — everything should work.
Gates: probably fine.
```

## When invoked
- Before EVERY recommendation surfaced to Jack
- Inside `daily-kickoff` for each priority
- Inside `weekly-council-review` for each open question
- Inside any "ready to ship" claim from any agent

## Logging
`[YYYY-MM-DD HH:MM ET] confidence-and-gate-statement → recommendation: {topic}, confidence: {N}, gates: {N}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('confidence-and-gate-statement', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'confidence-and-gate-statement', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
