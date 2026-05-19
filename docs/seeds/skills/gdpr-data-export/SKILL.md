---
name: gdpr-data-export
description: Customer requests their data — produces a complete, machine-readable export (JSON + accompanying README) within 30 days. GDPR Article 20, CCPA equivalent. Required, but only ~12% of companies do it well.
triggers:
  - "data export"
  - "gdpr request"
  - "ccpa request"
  - "my data"
  - "/export"
---

# gdpr-data-export

> Article 20 says: portable, machine-readable, complete, free. This
> skill produces all four in 24 hours, not 29.

## What's included in the export

For a given customer, gather + package:

1. **Account data**
   - Intake form (original submission + any updates)
   - Email + name + phone (everything they gave us)
   - Account creation date
   - Tier/plan history

2. **Communications**
   - Every email exchange (inbound + outbound) — pulled from Resend + Gmail
   - Any Telegram messages (if customer-facing)
   - Any call transcripts (if recorded)
   - Support tickets

3. **Service data**
   - Domain + DNS configuration
   - Site URL + deployment history
   - Build log (what was made for them)
   - Approvals + feedback history

4. **Payment data** (metadata, not card numbers)
   - All Stripe invoices (amount, date, status)
   - Subscription history
   - Refunds, disputes

5. **Activity logs**
   - Logins (if applicable)
   - Page views (if analytics shared)
   - Feature usage

6. **Derived data**
   - Their LTV computation (transparency)
   - Their churn-risk score (transparency)
   - Any pattern/segment we put them in

## Output format

A zip file with:

```
{customer_slug}-data-export-{YYYY-MM-DD}/
├── README.md           ← plain-language explanation of what's in here
├── account.json
├── communications/
│   ├── emails.json
│   ├── telegram.json
│   └── transcripts.json
├── service/
│   ├── domain.json
│   ├── deployments.json
│   ├── build-log.md
│   └── approvals.json
├── payments/
│   ├── invoices.json
│   ├── subscriptions.json
│   └── refunds.json
├── activity.json
└── derived.json        ← with explanations of how each metric is computed
```

## Hard rules

1. **Never include another customer's data.** Email threads might reference others — redact those references.
2. **Never include API keys or secrets** even ours — strip them.
3. **Never include payment card numbers** — only metadata.
4. **Always include README explaining each file.** Machine-readable + human-understandable.
5. **Always deliver within 30 days max.** Target: 24 hours.
6. **Always confirm receipt** with the customer once delivered.
7. **Always log every export request** to `~/Documents/businesses/_shared/compliance/gdpr-log.jsonl`.
8. **Always Jack-tap before sending.** Compliance correspondence is high-stakes.

## What this skill does

1. Receives request (email, form, /export command)
2. Verifies identity (email match to customer record)
3. Pulls data from each source (Stripe API, dossier, Resend, etc.)
4. Builds zip
5. Generates README
6. Queues Jack approval card
7. On Jack tap → sends via secure download link (expiring in 7 days)
8. Logs to compliance log

## When invoked

- Customer email with "GDPR" / "data" / "my information" / "export" → `inbound-classifier` routes here
- `/export {customer_slug}` Telegram command
- 1× per year proactive offer (best-practice) — disabled by default

## Failure modes

- **Customer record not found**: ask for verification (last invoice date, etc.)
- **Data scattered across sources we can't pull from**: include what we have + note gaps
- **Export > 100 MB**: split into multi-part download

## Logging

`[YYYY-MM-DD HH:MM ET] gdpr-data-export → customer: {slug}, source: {email|form|telegram}, status: {requested|delivered|expired}, days_to_deliver: {N}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('gdpr-data-export', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'gdpr-data-export', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
