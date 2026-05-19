---
name: intake-parser
description: Parse a submitted intake form into structured data the Build Agent can act on. Reads raw form responses (Typeform / Notion / custom HTML form) → outputs validated 00-intake.md + initial 01-brand.json fields. Supporting skill for customer-build-day-1-bootstrap.
triggers:
  - "intake form submitted"
  - "parse intake"
  - "new intake"
  - "Typeform webhook"
---

# intake-parser

> Raw form data is messy. This skill turns it into the structured
> dossier files the Build Agent expects. Front-loads validation so
> the build pipeline doesn't error on field-mismatches later.

## Input

Webhook payload from intake source (Typeform / Notion / custom form):

```json
{
  "form_id": "...",
  "submitted_at": "ISO timestamp",
  "respondent_email": "...",
  "answers": [
    {"field_id": "company_name", "value": "Acme Pool Co"},
    {"field_id": "owner_name", "value": "..."},
    ... 27 entries total
  ]
}
```

## Outputs (2 files written)

### `00-intake.md`
Fill the template at `~/Documents/businesses/_shared/templates/customer-dossier/00-intake.md`
with the form responses. Each answer maps to the matching question number.

Leave Jack's kickoff-call notes section empty — that's filled after the call.

### `01-brand.json` (partial — what can be derived from intake)
- `company.name` ← from "Company name" answer
- `company.slug` ← kebab-case of company name
- `contact.phone`, `contact.email`, `contact.address` ← from intake
- `contact.hours.*` ← parsed from intake's hours-of-operation answer
- `sku`, `vertical` ← from intake
- `service_type.*` ← inferred from vertical (with vertical-aware defaults)

Fields NOT auto-filled (require Jack's kickoff call):
- `colors.primary` — needs hex value Jack confirms with customer
- `logo.svg_path` / `logo.png_path` — needs Jack to download uploaded files
- `social.*` — needs URL verification
- `_meta.kickoff_call_at`

## Validation rules

Before writing the files, run these checks:

1. **Email format** — must be valid `local@domain.tld`
2. **Phone format** — strip formatting, store as `+1AAANXXXXXX` E.164
3. **Address completeness** — street + city + state + zip; if any missing, flag
4. **Company name** — not empty, not "test", not all-caps spam
5. **SKU** — must be one of `site|portal|platform`
6. **Vertical** — must match an allowed value (`mobile-service|membership|food|custom`)

If any validation fails, write what you can and append a "Validation issues" section at the bottom of `00-intake.md`. Surface to Jack via `approval-card-builder` titled "Intake validation needed — {company}".

## Service type inference

Based on `vertical`, default the service_type strings. Customer can override on kickoff call.

| Vertical | singular | plural | verb | verb_past |
|---|---|---|---|---|
| mobile-service | "service" | "services" | "service" | "serviced" |
| membership | "membership" | "memberships" | "register" | "registered" |
| food | "order" | "orders" | "order" | "ordered" |
| custom | (empty — Jack fills) | (empty) | (empty) | (empty) |

For mobile-service, if intake includes a specific sub-vertical (pool, lawn, AC, etc.), refine:
- pool: "pool" / "pools" / "service" / "serviced"
- lawn: "lawn" / "lawns" / "mow" / "mowed"
- pest: "treatment" / "treatments" / "treat" / "treated"
- HVAC: "system" / "systems" / "service" / "serviced"

## Hard rules

1. **Never overwrite an existing 00-intake.md** — append "Resubmission" section instead. Customer may resubmit; preserve history.
2. **Never pre-fill colors/logo** — these need verification.
3. **Never auto-classify "test" submissions as real.** Spam-detect on company name = "test", "asdf", etc.
4. **Never start the build clock** until validation passes. The clock starts at `customers.intake_done_at`.

## Logging

`[YYYY-MM-DD HH:MM ET] intake-parser → customer: {slug}, validation: {pass|N issues}, files: 00-intake.md, 01-brand.json (partial)`

## When invoked

- Intake webhook fires at `day14.us/api/webhooks/intake`
- Manual paste of form responses into Cowork (e.g., from email submission)
- Re-runs welcomed (idempotent — overwrite-with-resubmission semantic)
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('intake-parser', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'intake-parser', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
