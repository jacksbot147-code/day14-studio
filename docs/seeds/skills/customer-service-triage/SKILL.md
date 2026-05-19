---
name: customer-service-triage
description: End-to-end CS triage: inbound-classifier + customer-history-lookup + Gemini-drafted response + Jack-tap card. Drafts CS replies automatically.
triggers:
  - "customer-service-triage"
  - "customer service triage"
pack: automation
---

# customer-service-triage

End-to-end CS triage: inbound-classifier + customer-history-lookup + Gemini-drafted response + Jack-tap card. Drafts CS replies automatically.

See implementation: `src/lib/skills/customer-service-triage.ts` (or scripts/ for daemons).

## Growth hook (auto-attached)

- Fires: `logSkillInvocation('customer-service-triage', context, customer_slug)`.
- Almost-fires: `logAdHoc('describe what you did instead', context)`.
- Fails: `logAction({ action_phrase, context, invoked_skill: 'customer-service-triage', notes: 'failure_mode' })`.

Triggered by → `growth-always-on`.
