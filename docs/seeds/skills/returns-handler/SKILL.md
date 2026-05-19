---
name: returns-handler
description: Customer requests return. Generate prepaid return label, schedule inventory restock on receipt, refund via Stripe per policy. End-to-end pipeline.
triggers:
  - "return"
  - "return label"
  - "send it back"
  - "defective"
pack: ecom-ops
---

# returns-handler

> Returns done well = repeat customer. Returns done badly = chargeback.

## The decision tree

```
Customer requests return within 30d, item unused:
  → AUTO-APPROVE prepaid label, full refund on receipt

Customer requests return within 30d, item used/opened:
  → JACK-TAP: refund-decision (restocking fee yes/no, accept yes/no)

Customer requests return after 30d:
  → JACK-TAP: decline + offer store credit OR special-case approval

Defective item:
  → AUTO-APPROVE label + full refund + 10% credit toward next order
```

## What this skill does

1. Receive return request (email/form)
2. Look up original order in Stripe
3. Classify per decision tree
4. Generate prepaid return label via shipping-label-generator
5. Email customer with label + instructions
6. On receipt at warehouse: trigger inventory restock + refund

## Hard rules

1. **Never charge restocking fee >15%** without Jack-tap.
2. **Always process refunds within 3 business days of receipt**.
3. **Always document reason for return** (feeds product quality metrics).
4. **Never refuse a defective return** even outside 30 days.
5. **Always send tracking on the return label** so customer feels heard.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('returns-handler', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'returns-handler', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
