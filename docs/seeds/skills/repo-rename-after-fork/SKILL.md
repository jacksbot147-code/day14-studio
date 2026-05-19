---
name: repo-rename-after-fork
description: Run the mechanical rename pass across a freshly-forked customer repo — package.json name, README title, in-code identifiers (Pool → Item, brand-name strings, etc.). Supporting skill for template-forker. Wraps the existing scripts/brand-swap.mjs --rename flag with safety checks.
triggers:
  - "rename after fork"
  - "brand-swap rename"
  - "rename pass"
  - "customize template"
---

# repo-rename-after-fork

> The mechanical Pool→Item / studio-template-X → customer-X rename
> pass. Mistakes here = broken imports, missing references,
> embarrassing dead links.

## Inputs
- `repo_path` — local path to the forked repo
- `brand_json_path` — path to `01-brand.json` with verified fields
- `template_name` — the template being forked from (site/portal/platform)
- `dry_run` — boolean, default false; runs without writing

## What gets renamed

### File-system level
- `package.json` `name` field → `customer-{slug}`
- `README.md` title → `{Company Name} (Day14 build)`
- Replace any `studio-template-{site|portal|platform}` strings → `customer-{slug}`

### Code-level (Portal template specifically — `Pool` → `Item`)
The portal template has placeholder names from Splash Jacks. After fork:
- TypeScript types: `Pool` → `Item`, `Visit` stays
- Prisma model: `model Pool` → `model Item`
- Field names: `poolsOwned` → `itemsOwned`
- Client imports: `import { Pool } from "@/lib/pool"` → `import { Item } from "@/lib/item"`
- File paths: `src/lib/pool-math.ts` → `src/lib/item-math.ts` (if applicable)
- Enum names: per service_type from brand.json

If `service_type.singular` in brand.json is "service" (default), use that as the renamed entity. If it's "pool" / "lawn" / "membership" / etc., use that. Per-vertical mapping happens here.

### Copy-level (in src/lib/site.ts)
- Company name strings — `{{company_name}}` → actual name
- Phone numbers — `{{phone}}` → actual phone
- Addresses — `{{address}}` → actual address
- Hex colors — replace template colors with brand.json values
- All `{{*}}` placeholders → resolved

## The mechanics

```bash
# 1. Verify brand.json is complete (call customer-readiness-check first)
if ! customer-readiness-check "$brand_json_path"; then
  echo "Brand JSON incomplete; aborting rename"
  exit 1
fi

# 2. Run the brand-swap.mjs script in --rename mode
cd "$repo_path"
node scripts/brand-swap.mjs --rename --brand="$brand_json_path"

# 3. Run the test suite to catch broken imports
npm run typecheck 2>&1 | tee /tmp/rename-typecheck.log
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "Typecheck failed after rename — see log"
  # Surface to Jack; don't commit
  exit 1
fi

# 4. Commit the rename
git add -A
git commit -m "feat: brand-swap rename for {company_name}"
git push origin main
```

## Hard rules

1. **Never commit a rename pass that fails typecheck.** Broken types = broken build = no preview.
2. **Never run rename on a repo that's diverged from the template** (has unrelated commits). Only on fresh forks.
3. **Never overwrite brand.json during rename.** It's read-only input.
4. **Always run typecheck after.** The rename can break imports; we catch it now, not in Vercel logs.
5. **Always commit with a consistent message** so the build log parser finds it.

## Failure modes

- **brand-swap.mjs script errors**: usually a malformed brand.json. Re-run `customer-readiness-check`.
- **Typecheck fails**: surface the type errors as approval card. May need template-level fix.
- **Rename collisions** (e.g., `Item` already exists as an unrelated type): the brand-swap script should detect; if not, surface as P1.
- **Customer's service_type is unusual** (e.g., "boat detail" with two words): kebab-case it; surface for Jack to confirm before rename.

## Logging

`[YYYY-MM-DD HH:MM ET] repo-rename-after-fork → customer: {slug}, files_changed: N, typecheck: pass, commit: {sha}`

When dry_run:
`[YYYY-MM-DD HH:MM ET] repo-rename-after-fork DRY_RUN → would-rename: {N files, list}`

## When invoked
- Inside `template-forker` step 3
- Manually when a brand.json field changes mid-build and the rename needs re-running on specific scopes
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('repo-rename-after-fork', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'repo-rename-after-fork', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
