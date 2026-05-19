---
name: template-forker
description: The mechanical fork-and-brand-swap step. Given a customer's SKU and brand.json, fork the right template repo, run brand-swap.mjs, push initial commit. Invoked by customer-build-day-1-bootstrap. Does NOT make creative decisions — pure mechanics.
triggers:
  - "fork the template"
  - "brand swap"
  - "create customer repo"
  - "scaffold new customer build"
---

# template-forker

> The robotic part of a customer build. No creativity, no judgment.
> Given inputs, produces a forked repo with the brand applied.

## Inputs (required)

1. `customers.sku` — site / portal / platform
2. `customers.slug` — kebab-case (used in repo name)
3. `01-brand.json` — fully populated (run customer-readiness-check first)

## The mechanics (~15 min total)

### Step 1 — pick the template
| SKU | Template repo |
|---|---|
| site | `jacksbot147-code/studio-template-site` |
| portal | `jacksbot147-code/studio-template-portal` |
| platform | `jacksbot147-code/studio-template-platform` |

### Step 2 — fork
```bash
gh repo fork jacksbot147-code/studio-template-{sku} \
  --clone=true --remote=true \
  --fork-name=customer-{slug}
```

Repo settings to apply after fork:
- Private: true
- Description: "Day14 build for {company_name} — SKU: {sku}, started {date}"
- Topics: ["day14-customer-build", "{vertical}", "{sku}"]

### Step 3 — copy brand.json into place
```bash
cd customer-{slug}
cp ~/Documents/businesses/day14/customers/{slug}/01-brand.json ./brand.json
```

### Step 4 — run brand-swap
```bash
node scripts/brand-swap.mjs --rename
```

What `--rename` does:
- Replaces template-specific identifiers (e.g., "Pool" → singular service noun from brand.json)
- Updates package.json `name` field to `customer-{slug}`
- Updates README title
- Replaces hex colors in tailwind config with brand.json values
- Replaces logo paths
- Updates `src/lib/site.ts` (or equivalent) constants

If brand-swap.mjs errors:
- Re-run customer-readiness-check (likely brand.json field is malformed)
- DO NOT manually edit — the script is the source of truth

### Step 5 — initial commit + push
```bash
git add -A
git commit -m "feat: brand-swap for {company_name}"
git push origin main
```

Commit message format is consistent — never deviate; the build-log
parser looks for this exact prefix.

### Step 6 — write GitHub URL to dossier
Update `customers.github_repo` in Supabase to the new fork's URL.
Append event: `kind=template-forked, payload={template, fork_url}`.

## Outputs

- `customer-{slug}` GitHub repo exists (private), with brand applied
- First commit pushed, triggers Vercel preview build
- `customers.github_repo` populated

## Hard rules

1. **One repo per customer.** Never reuse a previous customer's fork.
2. **Never push to a template repo.** `studio-template-*` is read-only for this skill.
3. **Never edit `brand-swap.mjs` for a single customer.** If the script doesn't handle a case, that's a template-level fix, not a customer hack.
4. **Never commit without --rename.** Half-swapped repos confuse future agents.
5. **Verify the push succeeded before claiming done.** `gh repo view customer-{slug}` should show the latest commit.

## Failure modes

- **gh CLI not authenticated:** stop, surface as blocker. Jack runs `gh auth login`.
- **Template repo has no main branch:** rare; check repo settings, fall back to default branch name.
- **Vercel auto-deploy fails:** that's a downstream issue, not template-forker's fault. Push succeeded; let nightly-polish surface it.

## Logging

Append to MASTER_LOG:
`[YYYY-MM-DD HH:MM ET] template-forker {customer-slug} → fork:{url}, commit:{sha}, confidence: <0.0-1.0>`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('template-forker', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'template-forker', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
