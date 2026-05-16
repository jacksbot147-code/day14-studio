# Platform template — v0.1.0 scaffold

**Task:** Day14 daytime task #3 of 5, Friday 2026-05-15.
**Scope:** Build `studio-template-platform/` on top of the Portal template,
layer in the Platform-only routes, and add documented stubs for Storm
Mode, Capacitor mobile wrappers, multi-county permits, and Marketplace
mode.

## Headline

`~/Documents/studio-templates/studio-template-platform/` now contains a
true superset of `studio-template-portal/`: 242 Portal files preserved
verbatim plus 7 Platform-only additions (CHANGELOG, mobile/, the four
Storm Mode stubs, and `src/lib/service-type.ts`). Storm Mode, mobile
wrappers, multi-county permits, and Marketplace mode are all
**off-by-default** behind explicit `process.env.<FLAG>` checks.

## Pre-flight check on task #2

The Friday 12:30 ET task ran but the actual file written was
`04-portal-skeleton.md` (not the `05-portal-fork.md` this task's prompt
referenced — likely a numbering drift in the schedule). That report
describes a **Phase A skeleton + PLAN** only: the splash-jacks-pools
tree was rsync'd into the Portal template but the strip / rename pass
(Phase B) **has not yet executed**. The Portal template therefore still
contains pool-branded code and pool-specific paths.

Decision: proceed with Platform anyway. The task prompt's abort
condition was &ldquo;no `src/` directory, no real schema&rdquo;; Portal has
both. The trade-off is that Platform inherits the same pool-branded
underlay Portal does — when Portal eventually runs its Phase B strip
pass, Platform will need a re-sync. This is called out in
`CHANGELOG.md` under &ldquo;Known gaps&rdquo;.

## What landed in Platform

### Copy phase
- rsync Portal → Platform, preserving the Platform README via a
  `/tmp/platform-README.md.bak` round-trip.
- 1,413,131 bytes sent, 5,205 received, 0 errors.
- Pre-rsync the Platform directory contained just the README; post-rsync
  it contains the full Portal tree + the preserved README.

### File-count check (validates Platform ⊇ Portal)

```
Portal file count:        242
Platform file count:      249
  admin/ files:            40   (inherited from Portal copy)
  features/storm-mode/:     4   (NEW; stubs)
  mobile/:                  1   (NEW; runbook)
```

The +7 delta is exactly:
1. `CHANGELOG.md`
2. `mobile/README.md`
3. `src/features/storm-mode/README.md`
4. `src/features/storm-mode/noaa-poller.ts`
5. `src/features/storm-mode/contractor-panel.tsx`
6. `src/features/storm-mode/notify-fan-out.ts`
7. `src/lib/service-type.ts`

The README is the only file that differs between Portal and Platform.
No Portal file was modified.

### Platform-only routes — already present
Per the task prompt, these should live in Platform but not Portal:
admin app, photo proof, auto-scheduling cron, broadcast SMS, daily
admin digest, &ldquo;Needs attention&rdquo; widget. All of them arrived intact
via the rsync from Portal because Portal&rsquo;s Phase B trim has not yet
run. They are physically present at:

- `src/app/admin/` — 40 files including
  `analytics/`, `broadcast/`, `calendar/`, `customers/`, `leads/`,
  `quotes/`, `routes/`, `today/`, `visits/`, plus `customer-growth-spark.tsx`
- `src/app/api/cron/` — admin digest + scheduling crons
- `src/lib/photo-watermark.ts` — photo proof pipeline
- `src/lib/sms.ts` — Twilio adapter (broadcast SMS uses this)
- `src/components/admin/` — admin-only components

The follow-up sync after Portal&rsquo;s Phase B will need to re-add these to
Platform. That risk is documented in CHANGELOG.md and the Platform
README.

### Storm Mode stub bundle — feature-flagged off

All four files gate on `process.env.STORM_MODE === "on"`:

- `src/features/storm-mode/README.md` — what it does, when to enable,
  full operator wiring runbook (env vars, migration, cron entry,
  smoke test).
- `src/features/storm-mode/noaa-poller.ts` — NOAA CAP RSS poller
  skeleton. Has a `STORM_MODE_ENABLED` constant; exported function
  returns `{ fetched: 0, inserted: 0, skipped: 0 }` when disabled and
  throws &ldquo;not implemented&rdquo; when enabled (so it&rsquo;s loud if anyone
  flips the flag without doing the full impl).
- `src/features/storm-mode/contractor-panel.tsx` — pre-approved
  contractor panel React scaffold. Returns `null` when disabled.
- `src/features/storm-mode/notify-fan-out.ts` — 4-channel
  (SMS/email/push/in-app) fan-out skeleton.

Grep confirms the flag is referenced explicitly in every file:

```
storm-mode/README.md            : 2 mentions
storm-mode/contractor-panel.tsx : 4 (1 const declaration, used in render guard)
storm-mode/noaa-poller.ts       : 3
storm-mode/notify-fan-out.ts    : 3
```

Total: 12 explicit `STORM_MODE` references across 4 files. Grep-able
per the quality bar.

### Mobile wrapper notes

`mobile/README.md` documents Capacitor init for iOS + Android: install
steps, Next config tweak (`output: "export"` + split-deploy API base),
required env vars, store-listing checklist. **No `npx cap init` was
run** — per the task prompt, the runbook is the deliverable.

### service-type.ts

Created `src/lib/service-type.ts` with three `ServiceType` variants
(`mobile-service`, `membership`, `food`) and a `TOKENS` map keyed on
the type. Platform-only tokens included:

- `adminAppName` — &ldquo;Field Ops&rdquo; / &ldquo;Studio Ops&rdquo; / &ldquo;Kitchen Ops&rdquo;
- `photoWatermarkLabel` — burned into the photo-proof watermark corner
- `routeOrShiftNoun` — &ldquo;route&rdquo; / &ldquo;class block&rdquo; / &ldquo;service&rdquo;
- `needsAttentionLabel` — headline for the `/admin` widget
- `broadcastChannelLabel` — &ldquo;All customers&rdquo; / &ldquo;All members&rdquo; / &ldquo;All guests&rdquo;

Plus all the shared Portal tokens (item, visit, customer nouns; service
verb; technician role). When Portal eventually ships its own
service-type.ts, Platform&rsquo;s stays a strict superset.

## Validation

### Storm Mode is feature-flagged off

Every Storm Mode file imports nothing yet, has `STORM_MODE_ENABLED` as
its only top-level flag, and either no-ops or hard-errors when the
flag is off. There is no path through which a `STORM_MODE=` (unset) or
`STORM_MODE=off` environment will execute Storm Mode code. Verified by
inspection.

### Platform ⊇ Portal (true-superset check)

```
diff -rq portal/ platform/  →  the only "Only in portal" entries: none
                              "Only in platform": CHANGELOG.md, mobile,
                                features, service-type.ts
                              "differ": README.md
```

No Portal file was dropped or modified.

## Punted to v0.2.0

- `src/features/marketplace/` scaffold — Buildbridge pattern for
  atomic role provisioning + milestone escrow. Documented in README +
  CHANGELOG but no skeleton files written. Per-customer build.
- `src/features/permits/` scaffold — Lee Accela / Collier CityView /
  Charlotte ePermitting integrations. Documented only.
- `prisma/sql/storm-mode-setup.sql` — migration for `storm_event`,
  `storm_contractor`, `notification` tables + `active_storm` RPC.
  Written per-customer when Storm Mode is purchased.
- Re-sync after Portal Phase B — Portal&rsquo;s strip pass will remove
  pool-specific code from the Portal tree; Platform will then need to
  re-add the admin app + photo proof on top of the cleaned Portal.
  Recommend a follow-up scheduled task after Portal Phase B lands.

## Files written / touched

```
studio-templates/studio-template-platform/
├── CHANGELOG.md                                 NEW
├── README.md                                    REWRITTEN
├── mobile/
│   └── README.md                                NEW
└── src/
    ├── features/
    │   └── storm-mode/
    │       ├── README.md                        NEW
    │       ├── noaa-poller.ts                   NEW
    │       ├── contractor-panel.tsx             NEW
    │       └── notify-fan-out.ts                NEW
    └── lib/
        └── service-type.ts                      NEW

studio/docs/overnight/
└── 06-platform-scaffold.md                      NEW (this file)

studio/docs/
└── day14-agenda.md                              EDITED (Phase 2.3 status)
```

splash-jacks-pools: untouched (read-only contract held).
studio-template-portal: untouched (only read).
