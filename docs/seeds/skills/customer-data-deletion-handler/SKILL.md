---
name: customer-data-deletion-handler
description: Customer invokes their right-to-be-forgotten. Process the request fully — verify identity, schedule 30-day deletion window, execute, audit-log, confirm. The hardest GDPR action; this skill makes it reliable.
triggers:
  - "delete my data"
  - "right to be forgotten"
  - "erasure request"
  - "/delete-me"
---

# customer-data-deletion-handler

> Deletion is reversible-window then permanent. Get the window right or
> you destroy data we still legally need (or worse, can't restore).

## The 30-day window

```
Day 0:  Customer requests deletion
        → Verify identity (email match + PIN sent to phone or alt-email)
        → Schedule deletion for Day 30
        → Acknowledge customer

Day 0-30: COOLING-OFF PERIOD
        → Customer can cancel deletion
        → System still serves customer site (it's live)
        → No NEW marketing/analytics
        → Add do-not-contact flag
        → On Day 15: send "are you sure? deletion in 15 days" email

Day 30: EXECUTE DELETION
        → Cancel subscriptions (Stripe API)
        → Delete from internal DB (Supabase rows)
        → Delete dossier
        → Delete email history older than 90 days
        → Anonymize anything that's legally retained (e.g., GDPR-export log
          entries — keep the fact, anonymize who)
        → Audit-log every step
        → Final email: "your data has been deleted"

Day 30+: Cannot be undone.
```

## What's retained (legally required)

Even after deletion, keep:
- Stripe transaction records (7 yrs, IRS/tax law)
- GDPR request itself (the fact someone requested deletion — but anonymized after 7 yrs)
- Email logs older than 90 days that mention them in third-party threads (with their reference redacted)
- Anything in active legal dispute (until resolved)

The retained items get anonymized — `customer_0024` style, no PII.

## Hard rules

1. **Always verify identity** via PIN + email match. NEVER just email.
2. **Always give 30-day cooling-off.** Reduces accidental "I was angry, regret it now" deletions.
3. **Always Jack-tap before executing.** Deletions are unreversible.
4. **Always confirm in writing** to the customer at start, mid, and end of process.
5. **Always preserve legally-required records** (Stripe, tax, dispute) — anonymize, don't delete.
6. **Always audit-log every step.** Especially the irreversible Day-30 step.
7. **Never delete during active dispute** — pause until resolved.
8. **Always offer pause-or-export first.** "Want to pause for a year, or get a copy first?"

## What this skill does

1. Verify identity (2-factor)
2. Schedule Day-30 deletion (calendar + cron task)
3. Set do-not-contact flag
4. Send Day-0 acknowledgement
5. Send Day-15 reminder
6. Day-30: pre-flight check (no active dispute? Jack approved?), then execute
7. Post-execution: verify (no orphan references), confirm to customer

## Output (Day 0)

```
🔒 Deletion request received: splash-jacks-pools

  Identity verification: 
    Email match ✓
    PIN sent to: +1-239-***-3429
    Awaiting PIN confirmation...
  
  [Customer enters PIN]
  
  Identity verified ✓
  
  Scheduled deletion: 2026-06-16 at 03:00 ET (30 days)
  Cooling-off window opens: 2026-05-17 → 2026-06-16
  Cancellation: customer can cancel anytime via /cancel-deletion
  
  Confirmation email sent to splash@jackspools.com
```

## Output (Day 30)

```
🚨 DELETION EXECUTING: splash-jacks-pools

  Pre-flight check:
    ✓ Identity re-verified (single-use PIN)
    ✓ No active disputes
    ✓ Jack approved (2026-05-30)
    ✓ 30-day cooling-off complete
  
  Execution:
    Stripe subscription cancelled ✓
    Stripe customer flagged for deletion (Stripe handles per their policy) ✓
    Supabase rows deleted: 47 rows ✓
    Dossier deleted: ~/Documents/businesses/_shared/customers/splash-jacks-pools/ ✓
    Email history < 90 days deleted: 14 messages ✓
    Email history > 90 days anonymized: 7 messages ✓
    Legally retained: 4 invoices, anonymized to customer_0025 ✓
    Telegram outbox cleared ✓
  
  Audit chain: 12 audit entries logged.
  
  Final confirmation email sent.
  Status: COMPLETE.
```

## When invoked

- Customer email with "delete my data" / "right to be forgotten" → `inbound-classifier`
- `/delete-me {slug}` Telegram command (Jack-initiated on customer's behalf)
- Scheduled task on Day 30 → executes pre-flight + deletion
- Inside `customer-data-deletion-handler` (recursive: e.g., to delete the deletion request after 7 yr retention)

## Failure modes

- **Identity verification fails 3×**: lock further attempts for 24h
- **Customer cancels in cooling-off**: restore all flags, normal service resumes
- **Active dispute during Day-30**: pause deletion, notify customer, resume after resolution
- **Day-30 execution partial fail**: don't proceed further; roll back what's possible; P0 alert

## Logging

`[YYYY-MM-DD HH:MM ET] customer-data-deletion-handler → customer: {slug}, day: {0|15|30}, action: {requested|reminder|executed|cancelled|failed}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('customer-data-deletion-handler', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'customer-data-deletion-handler', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
