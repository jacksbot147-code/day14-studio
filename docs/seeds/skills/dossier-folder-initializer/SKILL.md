---
name: dossier-folder-initializer
description: Create the customer dossier folder on deposit. Copies the template from _shared/templates/customer-dossier/, replaces placeholders, sets initial state. The first concrete artifact of a new customer relationship. Supporting skill for customer-readiness-check.
triggers:
  - "new dossier"
  - "create customer folder"
  - "initialize dossier"
  - "customer folder"
---

# dossier-folder-initializer

> The first artifact of a new customer relationship. Built the
> moment Stripe webhook fires. The dossier exists before the
> kickoff call ends.

## Trigger
Stripe webhook `payment_intent.succeeded` for a Day14 SKU → this skill fires.

## What gets created

`~/Documents/businesses/day14/customers/{slug}/` containing:

```
00-intake.md         ← template, placeholders empty
01-brand.json        ← template, only company.name + sku filled
02-build-log.md      ← header only, today's date, "Awaiting intake" status
03-approvals.md      ← header + empty table
04-feedback.md       ← header only
05-launch.md         ← empty checklist
```

Source: `~/Documents/businesses/_shared/templates/customer-dossier/`

## The mechanics

```bash
# 1. Compute slug from company name
slug=$(echo "{company_name}" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-\|-$//g')

# 2. Verify slug is unique
if [ -d "$HOME/Documents/businesses/day14/customers/$slug" ]; then
  # Slug collision — append -2, -3 etc.
  slug="${slug}-2"
fi

# 3. Copy template
mkdir -p "$HOME/Documents/businesses/day14/customers/$slug"
cp -r "$HOME/Documents/businesses/_shared/templates/customer-dossier/." \
      "$HOME/Documents/businesses/day14/customers/$slug/"

# 4. Replace placeholders in each file
for f in 00-intake.md 02-build-log.md 03-approvals.md 04-feedback.md 05-launch.md; do
  sed -i '' "s|{{company_name}}|$company_name|g" \
            "$HOME/Documents/businesses/day14/customers/$slug/$f"
done

# 5. Fill 01-brand.json with the known fields
# (Use jq for clean JSON manipulation — sed is fragile on JSON)
jq --arg name "$company_name" \
   --arg slug "$slug" \
   --arg sku "$sku" \
   '.company.name = $name | .company.slug = $slug | .sku = $sku' \
   "$HOME/Documents/businesses/day14/customers/$slug/01-brand.json" \
   > "$HOME/Documents/businesses/day14/customers/$slug/01-brand.json.tmp"
mv "$HOME/Documents/businesses/day14/customers/$slug/01-brand.json.tmp" \
   "$HOME/Documents/businesses/day14/customers/$slug/01-brand.json"
```

## After folder creation

1. Insert row into Supabase `customers` table:
   ```sql
   INSERT INTO customers (slug, company_name, email, sku, status, deposit_paid_at)
   VALUES ({slug}, {name}, {email}, {sku}, 'awaiting-intake', NOW());
   ```

2. Append event: `kind=dossier-created, payload={slug, sku, deposit_amount}`.

3. Append to `02-build-log.md`:
   ```
   ## Day 0 — {date}
   
   - Deposit cleared (${amount})
   - Dossier created at $(pwd)
   - Status: awaiting-intake
   - Next: customer fills intake form → kickoff call scheduled
   ```

4. Hand off to `intake-parser` (when intake form lands) and `kickoff-call-scheduler` (immediate, in parallel).

## Hard rules

1. **Never overwrite an existing dossier folder.** Always use a unique slug (append -2, -3 if collision).
2. **Never create a dossier without a verified Stripe payment.** Deposits must be `payment_intent.succeeded`, not `pending`.
3. **Never skip the Supabase row insert.** The folder is the working notebook; Supabase is the system of record.
4. **Never delete a dossier folder.** Even refunded customers keep their dossier (in `customers/archived/`).
5. **Idempotent: re-running on the same payment** should detect the existing dossier and exit gracefully, not duplicate.

## Failure modes

- **Slug collision**: append numeric suffix. Log it.
- **Supabase down at webhook time**: write the folder + queue the row-insert for retry; folder is fine without row temporarily
- **Template files missing from `_shared/`**: bootstrap script wasn't run on this machine; surface as P0 — can't onboard customers without templates
- **Stripe webhook fires for a `customers.email` we already have**: existing customer ordered a new SKU; create a NEW dossier with a slug suffix; don't update the old one

## Logging

`[YYYY-MM-DD HH:MM ET] dossier-folder-initializer → customer: {slug}, sku: {sku}, deposit: ${amount}, supabase_row: {inserted|queued}`

When idempotent re-run detects existing dossier:
`[YYYY-MM-DD HH:MM ET] dossier-folder-initializer → customer: {slug}, action: skipped (already exists)`

## When invoked
- Stripe webhook handler at `day14.us/api/webhooks/stripe`
- Manually when Jack onboards an off-Stripe customer (rare)
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('dossier-folder-initializer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'dossier-folder-initializer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
