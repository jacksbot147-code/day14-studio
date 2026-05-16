# Portal template — Phase A skeleton + PLAN

**Task:** Day14 daytime task #1 of 5, Friday 2026-05-15.
**Scope:** Phase A of the Portal template fork. Audit + skeleton + planning
only. No refactor. Phase B (the actual strip/rename pass) fires at 12:30 ET
as a separate scheduled task.

## Headline

`~/Documents/studio-templates/studio-template-portal/` now contains a
complete copy of the splash-jacks-pools tree (240 files, ~100 directories)
plus a 595-line `PLAN.md` that fully specs what Phase B has to do. No
splash-jacks-pools file was modified — read-only contract held.

## What landed

- **Copy:** rsync ran cleanly. 240 files copied, 0 errors, 0 surprises.
  The original `README.md` was preserved (backed up to `/tmp` before
  rsync and restored after).
- **`PLAN.md`:** 595 lines, seven sections (pre-flight, delete, rename,
  keep, new abstractions, risks, success criteria). Calls out 45 files
  to delete, ~120 files to rename, ~75 files to keep verbatim, and 3
  new abstractions to introduce (`src/lib/service-type.ts`,
  `src/lib/brand.ts`, `scripts/brand-swap.mjs`).

## File count vs source

- Source `~/Documents/splash-jacks-pools/`: 257 files (with working docs)
- Template `~/Documents/studio-templates/studio-template-portal/`: 240 files
- Delta: 17 files dropped at copy time (the six Jack working docs +
  rsync's standard excludes: `node_modules`, `.next`, `.git`, `.vercel`,
  `*.tsbuildinfo`, `.DS_Store`, `.fuse_hidden*`).

## Pool-specific paths flagged for Phase B delete

These are the files/directories Phase B should `rm -rf` outright (full
detail in PLAN.md §1). Listing them here for skim-read:

- `src/app/(marketing)/tools/` — all 10 pool-chemistry calculator pages
  (algae, chemistry, chlorine, cost, equipment, gallons, inspection,
  maintenance, salt-cell, storm) plus the index
- `src/app/(marketing)/pool-service/` — pool-service overview + `[city]`
  SEO LP template
- `src/app/h/chemistry/` — customer-facing chemistry trend charts
- `src/app/h/home/pool-details-*` — pool-specifics editor
- `src/components/admin/chemicals-input.tsx` — visit chemicals picker
- `src/lib/pool-chemicals.ts`, `pool-data.ts`, `pool-math.ts`,
  `tools-catalog.ts`, `service-cities.ts` (~1,750 LOC together)
- `prisma/sql/2026-05-13-gallery-photo.sql`,
  `prisma/sql/2026-05-14-pool-admin-notes.sql`,
  `prisma/sql/2026-05-14-pool-route-day-of-week.sql` (mid-build patches)
- `docs/BUILD_PLAN.md`, `docs/SKIMMER_SPEC.md`
- `skills/` — entire Splash Jacks Claude skill set (8 SKILL.md files)
- `src/components/ui/mascot.tsx`, `splashes.tsx` (recommend; brand-asset)

## Critical pre-flight item Phase B has to handle FIRST

rsync inherited Splash Jacks' real environment files. **These are not
template content and must be removed before any commit.**

- `.env`
- `.env.local`
- `.env.production.local`

`.env.example` is the documented template and stays. `.gitignore` already
covers `.env*` — but the files only landed because rsync ignores
`.gitignore`. PLAN.md §0 flags this as the very first Phase B action.

## Surprises in the audit

1. **Light admin app belongs in the Portal template, not just Platform.**
   The original SKU spec says admin is Platform-only (Portal = Site +
   customer login + billing). But there are admin routes here that
   really should ship with Portal: `/admin/customers/`, `/admin/visits/`,
   `/admin/leads/`. The Platform-only pieces are the scheduler
   (`/admin/routes/` + Mapbox route-map card), broadcast SMS, and the
   daily admin digest cron. PLAN.md §3 recommends keeping light admin in
   Portal; Phase B can confirm or override.

2. **The chatbot system prompt is a deeper rewrite than expected.**
   `src/lib/chatbot-context.ts` imports `READINGS` from `pool-math.ts`
   so the chatbot literally has chemistry target ranges baked in.
   Phase B has to rewrite it to read from `BRAND.faq` +
   `BRAND.chatbotSystemPromptExtras` instead. The route + widget are
   generic, but this single 112-line lib file is a non-trivial rewrite.

3. **`tailwind.config.ts` palette tokens are pool-themed.** Names like
   `water-500`, `deep-700`, `foam`, `chlorine-500` need renaming to
   brand-agnostic tokens (`primary-500`, `accent-500`, `bg`, `bg-soft`)
   so the brand-swap script can drive them. ~30 files reference those
   tokens — all in `src/components/marketing/` and `src/app/(marketing)/`.

4. **The County enum is SWFL-only** (`LEE / COLLIER / CHARLOTTE / OTHER`).
   PLAN.md recommends widening to `String?` for the template; per-build
   customers can re-enum if they want.

5. **23 files contain "Splash Jacks" / "Naples" / "Bonita Springs" /
   "SWFL" / "Florida" literals.** Brand-swap script will handle these
   mechanically, but every one needs a `{{brand.xxx}}` token first.

## rsync issues

None. Single `rsync -av` with the documented excludes ran clean. Total
data: ~1.4 MB / 240 files / 2.7 MB/s.

## Verification

```
ls -la ~/Documents/studio-templates/studio-template-portal/ | wc -l       # 24+
find ~/Documents/studio-templates/studio-template-portal -type f \
   | grep -v '/.git/' | wc -l                                             # 240
wc -l ~/Documents/studio-templates/studio-template-portal/PLAN.md         # 595
```

Splash-Jacks-Pools source confirmed untouched (no writes, only `find` +
`grep` + `head` + `cat`).

## Handoff to Phase B (12:30 ET)

Phase B reads PLAN.md and executes it section-by-section. Phase B's
suggested order:

1. **§0 pre-flight:** delete the three `.env*` secrets files.
2. **§1 delete pass:** `rm -rf` everything listed.
3. **§2 schema rename:** edit `prisma/schema.prisma` (Pool → Item,
   chemistry columns → `metadata Json`).
4. **§4 new abstractions:** write `src/lib/service-type.ts`,
   `src/lib/brand.ts`, `brand.json`, `scripts/brand-swap.mjs`.
5. **§2 code rename pass:** `prisma.pool` → `prisma.item`, etc.
   (~150 files).
6. **§2 copy reskin:** every "your pool" → `SERVICE_TYPE`-driven token.
7. **§3 verify:** `tsc --noEmit` clean (Jack runs locally — sandbox
   blocks `prisma generate`).
8. **README + done:** update the README.md to reflect the new fork
   flow, push, tag v0.1.0.

PLAN.md §7 lists the success criteria. Budget for Phase B should be
~90 minutes of focused work.
