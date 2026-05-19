---
name: customer-build-day-1-bootstrap
description: Orchestrates Day 1 of a customer build end-to-end — from the Stripe deposit webhook firing through preview URL ready for Jack's send-approval. Invoke when a new customer's deposit clears AND intake form is submitted. Composes sub-skills (template-forker, brand-swap, vercel-deployer, eod-update-writer); does not duplicate their logic. Returns a draft "preview ready" email for Jack to send manually.
triggers:
  - "new customer"
  - "deposit cleared"
  - "deposit paid"
  - "intake submitted"
  - "day 1 build"
  - "kickoff build"
  - "customer #"
  - "fork template"
  - "brand swap"
---

# customer-build-day-1-bootstrap

> The Build Agent's Day 1 playbook. Six substeps, ~2.5 hours of agent
> work, ends with a draft email in `02-build-log.md` waiting for Jack's
> approval to send. Boundary respected: no auto-send, no production
> deploy, no money moved.

## Trigger conditions (all must be true)

1. Stripe webhook fired `payment_intent.succeeded` for a Day14 SKU
2. `customers.deposit_paid_at` is now non-null
3. Intake form has been submitted (`customers.intake_done_at` non-null)
4. `01-brand.json` has minimum-viable fields (company name, primary
   color, logo path, contact email/phone) — invoke
   `customer-readiness-check` first; if fail, draft an "intake
   clarification needed" approval card and abort

If trigger conditions are not met, do NOT proceed. Wait for the
missing piece. The 14-day SLA clock pauses per the SOW.

## The six substeps (target: 2.5 hrs total)

### 1.1 — Dossier folder + Cowork session prep (15 min)
- Copy `~/Documents/businesses/_shared/templates/customer-dossier/`
  to `~/Documents/businesses/day14/customers/{slug}/`
- Replace `{{company_name}}` placeholders with actual company name
  via sed (idempotent — invoke `idempotent-bash-script` patterns)
- Create the Cowork session name: `day14-{slug}-build`
- Append first events: `dossier-created`, `build-started` to Supabase
  `events` table

### 1.2 — Template fork (15 min)
- Invoke `template-forker` skill with inputs: `{sku, slug, brand.json}`
- Repo named `jacksbot147-code/customer-{slug}` (private)
- Returns: github_repo URL, written to `customers.github_repo`

### 1.3 — Brand swap (45 min, parallel with 1.4 + 1.5)
- Run `scripts/brand-swap.mjs --rename` against the fork
- Inputs from `01-brand.json`: colors, fonts, logo, contact, hours
- Commit message: `feat: brand-swap for {company_name}`
- Push to the fork

### 1.4 — Infra provisioning (parallel with 1.3, ~60 min wall-clock)
Run these in parallel — none blocks the other:
- **Vercel project:** create with the GitHub repo as source; set env
  vars from `01-brand.json` and `~/Documents/businesses/_shared/sql/`
- **Supabase project:** new project for the customer; paste the schema
- **Resend domain:** add domain stub, queue DNS records as approval
- **Cal.com event type:** create matching the customer's vertical default

Write each provisioned resource to the `customers` row as it lands.

### 1.5 — First deploy (15 min)
- Vercel auto-builds on the brand-swap push
- Wait for green deploy (poll the Vercel API every 30s; max 10 min)
- Run Lighthouse against the preview URL; require score ≥85 mobile
- Write `customers.preview_url`
- Append event: `preview-ready`

### 1.6 — Draft the "preview ready" email (5 min)
Use `eod-update-writer` skill in "preview-ready" mode. Email goes
into `02-build-log.md` under a "Drafts for Jack to review" section.
Subject: *"Preview is up — take a look"*

Body template (day14-voice):

> Got your deposit. First preview is up:
>
> {{preview_url}}
>
> It's the brand-swap pass — colors, logo, your contact info, copy
> pulled from your intake answers. Nothing's wired to real bookings
> or payments yet; that's tomorrow.
>
> Anything that looks off, tell me. I'll work through it tomorrow.
>
> — Jack
> Day14

The Build Agent does NOT send this. Jack reviews + sends from his
own inbox.

## Exit criteria

You completed Day 1 if and only if all of:

- [ ] Dossier folder exists at the right path
- [ ] `customers.github_repo` non-null
- [ ] `customers.preview_url` non-null and returns 200
- [ ] Lighthouse mobile score ≥ 85 on preview
- [ ] `02-build-log.md` has the first entry with the email draft
- [ ] `approvals` table has a pending row: "Preview ready — OK to send?"
- [ ] `events` table has at minimum: dossier-created, build-started,
      preview-ready

If any are false, log what's missing and surface as a blocker.
Don't claim done.

## Failure modes

- **Vercel deploy fails** → try 3 retries with exponential backoff,
  then surface as approval card "Vercel build failing — see logs."
- **Brand-swap script errors** → likely brand.json field is malformed.
  Invoke `customer-readiness-check` again to identify the bad field.
- **Lighthouse score < 85** → ship anyway and append a TODO to the
  build log; image optimization is a Day 3 task, not blocking.
- **Resend DNS not yet propagated** → expected; no action needed.
  Mark "Resend DNS pending" in build log.

## Skills this orchestrates (the dependency graph)

This skill is the conductor. It calls — but does not reimplement —
these skills:

- `customer-readiness-check` (precondition)
- `template-forker` (1.2)
- `idempotent-bash-script` (used throughout)
- `eod-update-writer` (1.6 in "preview-ready" mode)
- `day14-voice` (for the email draft)
- `approval-card-builder` (the final approval card)

If any sub-skill doesn't exist yet, log it as a missing dependency
in `MASTER_LOG.md`. Don't fake the substep.

## When NOT to invoke

- Customer is iterating mid-build (Day 2–13) — invoke per-change
  skills instead
- Customer's deposit hasn't cleared — wait for the webhook
- This is customer #1 ever — Jack should run substep 1.1 manually
  first, you ride shotgun. Build Agent doesn't get to drive
  customer #1; only #2 onward.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('customer-build-day-1-bootstrap', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'customer-build-day-1-bootstrap', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
