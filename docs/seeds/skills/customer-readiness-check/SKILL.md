---
name: customer-readiness-check
description: Preflight check before invoking customer-build-day-1-bootstrap or any build-agent action. Verifies the customer's dossier has the minimum required fields. Refuses to start work if missing fields. Drafts "intake clarification needed" approval card when blocked.
triggers:
  - "ready to build"
  - "start customer build"
  - "customer ready"
  - "intake complete"
  - "preflight customer"
---

# customer-readiness-check

> The gatekeeper. Build Agent never starts work on a customer until
> this skill returns green. Saves the 14-day clock from starting on
> incomplete inputs.

## Required fields — all must be present

### customers table row
- `slug` — kebab-case, unique
- `company_name` — exact spelling as on the truck/sign
- `email` — verified (Stripe customer matches)
- `phone` — formatted with country code
- `sku` — one of: site, portal, platform
- `vertical` — one of: mobile-service, membership, food, custom
- `deposit_paid_at` — non-null (Stripe webhook fired)
- `intake_done_at` — non-null (customer submitted form)
- `intake_json` — non-null (all 27 questions answered or marked N/A)

### 01-brand.json file
- `company.name` — matches `customers.company_name`
- `company.slug` — matches `customers.slug`
- `contact.phone` — non-empty
- `contact.email` — non-empty
- `contact.hours.{mon..sun}` — at least 5 days populated (closed = "closed")
- `colors.primary` — hex code, valid
- `logo.svg_path` OR `logo.png_path` — file exists at the path
- `social.google_business` — URL (matters for SEO)
- `sku` — matches `customers.sku`
- `service_type.singular` + `service_type.plural` + `service_type.verb` — non-empty

### Kickoff call evidence (in 00-intake.md)
- "Jack's kickoff-call notes" section has at least these lines filled:
  - Owner's actual problem
  - Owner's actual ambition
  - Verbal commitments Jack made

## Output

Returns one of three states:

### `READY`
All required fields present. Build Agent proceeds with day-1-bootstrap.

### `MISSING-{N}-FIELDS`
Drafts an approval card titled "Intake clarification needed — {company_name}"
listing each missing field, its dossier location, and a one-line "ask"
for the customer or Jack. Pauses the 14-day clock per the SOW.

### `BLOCKED-BY-DEPENDENCY`
A field references a file that doesn't exist (e.g., logo.svg_path points
to a missing file). Surface this as a P1 — Jack needs to address before
build can start.

## Failure modes

- **Stripe webhook fired but intake form didn't:** customer hasn't done their part. Draft a friendly nudge email for Jack to send (use day14-voice + eod-update-writer).
- **Intake submitted but no logo uploaded:** common. Surface as approval card with options: a) use the customer's Google Business photo, b) generate a wordmark from company name, c) wait for upload.
- **Brand.json says vertical X, intake says vertical Y:** trust 01-brand.json (Jack signed off on it). Note the mismatch in 02-build-log.md.

## Logging

Append to MASTER_LOG:
`[YYYY-MM-DD HH:MM ET] customer-readiness-check {customer-slug} → {READY|MISSING-N|BLOCKED}, confidence: <0.0-1.0>`

If READY, append an event to Supabase: `kind=customer-ready, payload={check-passed-at: timestamp}`.

If not READY, append: `kind=customer-not-ready, payload={missing_fields: [...]}`.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('customer-readiness-check', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'customer-readiness-check', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
