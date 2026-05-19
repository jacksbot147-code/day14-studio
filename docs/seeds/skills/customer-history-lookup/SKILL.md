---
name: customer-history-lookup
description: Before drafting any inbound reply, look up the customer's full history — past messages, build status, approvals pending, money paid, complaint count. Drops a 5-line context block at the top of the draft so the reply doesn't sound like a fresh introduction. Supporting skill for inbound-classifier.
triggers:
  - "customer wrote in"
  - "lookup customer"
  - "context for reply"
  - "what's their history"
---

# customer-history-lookup

> Replies that ignore prior context kill trust. "Tell me again what
> you ordered" reads as "I don't care enough to check." This skill
> ensures every reply opens with context already in mind.

## Inputs

Customer identifier (email, slug, or customers.id).

## Outputs

A 5-line context block written to the top of the dossier entry where
the reply draft will land:

```
**Customer history (auto-generated, last refreshed: {timestamp})**

- Build: {sku} — status: {status} — day {N} of 14
- Total paid: ${amount} ({deposit / balance / monthly so far})
- Prior inbound: {N} messages — last tagged: {tag}, {N days} ago
- Open approvals: {count, list IDs}
- Open complaints: {count, status}
- Quirks: {1-line summary if any — e.g. "prefers SMS over email", "took 2 weeks to fill intake"}
```

This goes IN the dossier — not in the customer-facing reply. The
draft reply uses the context implicitly.

## Sources

Query in order, all from local files or Supabase:

1. **`customers` row** in Supabase → SKU, status, payment dates
2. **`events` table** filtered by `customer_id` → activity timeline
3. **04-feedback.md** in their dossier → past inbound messages
4. **02-build-log.md** in their dossier → ongoing build context
5. **03-approvals.md** in their dossier → pending approvals
6. **02-build-log.md "Quirks"** section if Jack maintains one

If any source isn't available (Supabase down, file missing), use what you have. Note the gap in the output:
"Note: Supabase unreachable; using local dossier only."

## The "quirks" section — high-leverage

A customer's quirks accumulate over time. Examples:

- "Prefers SMS over email"
- "Wife handles the website decisions, husband handles payments"
- "Slow to reply on weekends — give 48h not 24h"
- "Specific phrasing preference: 'site' not 'website'"
- "Don't mention competitors by name — they get triggered"

Maintain in `02-build-log.md` under a "Quirks" section at the bottom.
The Build Agent appends to this section as patterns emerge (with confidence < 0.7 → flag for Jack to confirm before saving).

## The 5-line cap

Context block is ALWAYS ≤ 5 lines. Reasons:
- Long context blocks distract from the draft
- The full history lives in the dossier files — context block is just enough to inform the reply
- The agent reading this needs orientation, not a complete dump

If history is rich, prioritize:
1. Most recent inbound (within last 14 days)
2. Open approvals (highest weight — agent must address)
3. Build status
4. Money state
5. One quirk if relevant to this reply

## Hard rules

1. **Never paste customer's personal info into chat** — only into the dossier file.
2. **Never include payment card details** even in the dossier.
3. **Never claim a quirk Jack hasn't observed.** Quirks come from evidence, not speculation.
4. **Never use the history block in the customer-facing email** — it's internal scaffolding.
5. **Never skip this skill** when drafting a reply to a customer who has had >1 prior interaction. Cold replies for cold customers; contextualized replies for warm ones.

## Failure modes

- **Customer has zero history** (new lead): output "No prior history. First-touch context: {what we know from the lead form, intake submission, or referrer}."
- **Customer has confusingly mixed history** (e.g., shares an email with their spouse, two intakes from same address): flag for Jack to disambiguate.
- **Supabase row exists but no dossier folder**: weird state — surface as P1, likely a Stripe webhook fired but build-agent never picked it up.

## Logging

`[YYYY-MM-DD HH:MM ET] customer-history-lookup → customer: {slug}, sources_queried: {N}, context_lines: 5, freshness: {seconds}`

## When invoked

- Automatically by `inbound-classifier` BEFORE drafting any reply
- By `lead-first-touch-personalizer` if the lead's email matches an existing customer
- By `complaint-escalation` to give Jack full context on the SMS
- Manually when Jack needs a quick refresh before a customer call
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('customer-history-lookup', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'customer-history-lookup', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
