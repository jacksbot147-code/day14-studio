---
name: pipeline-end-to-end-test
description: A scripted simulation of a fake customer going through the full Day14 pipeline — Stripe deposit → intake → kickoff → build → preview → launch. Validates every webhook + downstream skill works together. Phase 4 webhook layer.
triggers:
  - "end to end test"
  - "simulate customer"
  - "pipeline test"
  - "fake customer run"
---

# pipeline-end-to-end-test

> Before customer #1 pays a real deposit, we need to know the full
> pipeline works. This skill is the simulation.

## The simulation script

Located at `~/Documents/studio/scripts/pipeline-e2e-test.mjs`.

Runs through these 9 phases in order:

### Phase 0 — Setup
- Create a fake customer in Supabase (test mode):
  - `slug: e2e-test-pool-{timestamp}`
  - `company_name: E2E Test Pool Co`
  - `email: e2e-test+{timestamp}@day14.us` (Day14-owned alias)
  - `sku: portal` (covers most surface area)
- Note: all Stripe operations use test mode + test cards

### Phase 1 — Stripe deposit
- Create a test Payment Link via Stripe API
- Programmatically complete the checkout (Stripe test API supports this)
- Wait for `checkout.session.completed` webhook → assert it fires
- Verify: `customers.deposit_paid_at` is set; dossier folder created

### Phase 2 — Intake submission
- POST a synthetic intake JSON to `day14.us/api/webhooks/intake`
- Wait for `intake-received` event → assert `intake_parser` runs
- Verify: `00-intake.md` + `01-brand.json` exist + populated

### Phase 3 — Kickoff booking
- POST a synthetic Cal.com webhook (BOOKING_CREATED) to `day14.us/api/webhooks/cal`
- Verify: `customers.kickoff_call_at` set; intake-nudge cancelled

### Phase 4 — Kickoff completion
- POST a synthetic Cal.com webhook (MEETING_ENDED)
- Verify: `customer-readiness-check` passes; `customer-build-day-1-bootstrap` starts

### Phase 5 — Build preview
- Wait up to 5 min for `preview-ready` event
- Verify: GitHub repo created (`customer-e2e-test-pool-*`); Vercel project created; preview URL responds 200

### Phase 6 — Customer feedback simulation
- POST a synthetic Resend inbound event with body "Can you make the hero bigger?"
- Verify: tagged as `change-request`; approval card drafted; Telegram push queued (in outbox)

### Phase 7 — Approval flow
- Simulate Jack tapping "Approve" on the approval card via internal API
- Verify: change applied; new preview deploy fires

### Phase 8 — Launch
- POST a synthetic Cal.com event with `MEETING_ENDED` and metadata "launch-approved"
- Trigger `launch-day-cutover`
- Verify: `customers.status = launched`; `launch-day-customer-email` drafted

### Phase 9 — Cleanup
- Mark customer as test (`status: archived`, `notes: 'e2e-test'`)
- Move dossier to `customers/archived/e2e-test-*/`
- Delete Stripe test customer
- Delete Vercel project + GitHub repo (test environments only)
- Report summary

## Output

A test report saved to `~/Documents/studio/docs/overnight/e2e-{YYYY-MM-DD-HHMM}.md`:

```
# Pipeline E2E test — {date}

## Run ID: e2e-test-pool-{timestamp}

## Results
| Phase | Step | Status | Latency | Issue |
|---|---|---|---|---|
| 1 | Stripe deposit webhook | ✓ | 230ms | - |
| 1 | Dossier created | ✓ | - | - |
| 2 | Intake parser | ✓ | - | - |
| ... |

Overall: PASS | FAIL ({N failures})

## Failures
{for each failed step: what went wrong + recommended fix}

## Cleanup
{N test resources cleaned up}
```

## Hard rules

1. **Test mode ONLY.** Never run against live Stripe/Resend/etc.
2. **Always clean up.** Test customers must be archived; test repos deleted.
3. **Run AT LEAST weekly** during active development; daily before customer #1.
4. **Failures block live deployment** of any pipeline component until resolved.
5. **Never test in parallel** — different test runs would interfere via Supabase state.

## When invoked
- Manually before flipping any pipeline component to live
- Weekly scheduled task (Sunday afternoon)
- After any significant change to webhook handlers
- After any Stripe / Resend / Cal.com API version change

## Logging

`[YYYY-MM-DD HH:MM ET] pipeline-end-to-end-test → status: {pass|fail}, phases_passed: N/9, duration_min: {N}, cleanup: {success|partial}`

When failed:
`[YYYY-MM-DD HH:MM ET] pipeline-end-to-end-test FAIL → failing_phase: {N}, blocker: {brief}, see: {report path}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('pipeline-end-to-end-test', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'pipeline-end-to-end-test', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
