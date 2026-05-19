---
name: privacy-policy-keeper
description: Maintain a current, accurate privacy policy for day14.us and each customer site. Auto-update on actual practice changes (new sub-processor, new data source). Notify users 30 days before changes take effect.
triggers:
  - "privacy policy"
  - "data practices"
  - "sub-processor"
  - "/privacy"
---

# privacy-policy-keeper

> Most companies' privacy policies say what their lawyers want them to say.
> This skill keeps Day14's policy aligned with what we actually do.

## The truth-table approach

Day14 maintains a "data-practice ledger":

```jsonl
{"date":"2026-01-15","practice":"collect","data":"name+email","source":"intake form","reason":"customer onboarding","sub-processor":"none"}
{"date":"2026-01-15","practice":"collect","data":"payment_card_metadata","source":"Stripe Checkout","reason":"billing","sub-processor":"Stripe"}
{"date":"2026-02-01","practice":"collect","data":"email_open_rates","source":"MailerLite","reason":"email engagement metrics","sub-processor":"MailerLite"}
{"date":"2026-04-15","practice":"share","data":"contact email","sub-processor":"Resend","reason":"transactional email delivery"}
{"date":"2026-05-17","practice":"collect","data":"site analytics","source":"Vercel Analytics","reason":"performance monitoring","sub-processor":"Vercel"}
```

The privacy policy is GENERATED from this ledger, not hand-written.

## What this skill does

1. Reads the ledger
2. Generates the current privacy policy
3. Diffs against the published policy (day14.us/privacy)
4. If different: triggers 30-day notice period
5. Auto-updates the policy at the end of 30 days (with Jack approval)

## Privacy policy structure (auto-generated)

```
# Privacy Policy — day14.us
> Last updated: {YYYY-MM-DD}
> Effective: {YYYY-MM-DD}

## What we collect
(generated from ledger entries with practice=collect)

| Data | Source | Reason |
|---|---|---|
| Name + email | Intake form | Customer onboarding |
| Payment metadata | Stripe Checkout | Billing |
| Email engagement | MailerLite | Email metrics |
| Site analytics | Vercel Analytics | Performance |

## Who we share with (sub-processors)
(generated from ledger entries with practice=share)

| Sub-processor | What's shared | Why |
|---|---|---|
| Stripe | Card metadata | Payment processing |
| Resend | Email + name | Email delivery |
| MailerLite | Email + engagement events | Newsletter |
| Vercel | Visitor analytics | Performance |
| Supabase | Customer records | Database hosting |

## Your rights
- Access (Article 15 / CCPA): see all data we have — see /export
- Portability (Article 20): get a machine-readable copy — see /export
- Rectification (Article 16): correct inaccurate data — email us
- Erasure (Article 17 / right to be forgotten): delete your data — see /delete-me
- Object: opt out of processing — email us
- Lodge complaint: contact your local DPA

## Retention
(generated from data-retention-pruner policies)
[table]

## How to contact us
hello@day14.us | Jack Boppington | SW Florida, USA
```

## Hard rules

1. **Never change the policy without 30-day notice** to existing customers.
2. **Always update the ledger BEFORE making the practice change.** Policy follows reality, not vice versa.
3. **Always Jack-tap before publishing policy changes.**
4. **Always preserve old policy versions** — `day14.us/privacy/v3` etc.
5. **Never use vague language** ("we may collect"). Be specific.
6. **Always link from every customer-facing page footer.**
7. **Always notify by email** for material changes (new sub-processor, broader data use). Not just on-site banner.

## What this skill does (cycle)

1. Daily: check if ledger has changed since last policy publish
2. If changed: generate new draft + diff
3. If meaningful diff: queue 30-day notice approval
4. Send notice to all current customers
5. 30 days later: auto-publish new version (with Jack final tap)

## Output

```
📜 Privacy policy review: 2026-05-17

Ledger changes since last publish (2026-04-15):
  + 2026-05-17: new sub-processor (Vercel Analytics)
    Impact: low — analytics-only, no PII
    Notice required: yes (sub-processor)
  
Diff vs published v3:
  + Added "Vercel Analytics" to sub-processor list
  + Added "site analytics" to data-collected list
  
Action: queue 30-day notice
Send-date: 2026-05-17 (today)
Publish-date: 2026-06-17 (30 days)

Tap to approve notice send.
```

## When invoked

- Daily 04:30 ET via scheduled task
- After any ledger update
- `/privacy review` Telegram command
- Inside `weekly-council-review`

## Failure modes

- **Customer email bounces** (notice undelivered): retry; on second fail, post on-site only
- **Material change but no 30-day window available** (e.g., legal requirement): emergency notice + Jack reviews legal exposure
- **Policy versioning conflict**: keep old + new for transition

## Logging

`[YYYY-MM-DD HH:MM ET] privacy-policy-keeper → ledger_changes: {N}, policy_diff: {bool}, notice_required: {bool}, customers_notified: {N}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('privacy-policy-keeper', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'privacy-policy-keeper', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
