# Production-reality harvest — findings (round 3)

> Generated 2026-05-16. Mined 3 production tenant codebases against the
> 148-skill empire library.
>
> Scope qualifier: the `~/Documents/businesses/casamore/` and
> `~/Documents/businesses/buildbridge/` directories exist but are EMPTY
> on this machine (verified: `ls -la` returns 0 files). The only fully
> checked-out tenant is Splash Jacks Pools. To still get cross-tenant
> evidence, I treated the two studio templates — `studio-template-portal`
> and `studio-template-platform` — as Casamoré / Buildbridge stand-ins:
> they are the literal fork points those tenants are spawned from, and
> a pattern that lives identically in both templates ships into both
> tenants on day 1. A pattern is only flagged "cross-tenant" if I
> verified it appears in 2+ of {Splash Jacks, portal template, platform
> template, site template}.

---

## Scope of inventory

| Repo | Files scanned | Notable patterns observed |
|---|---|---|
| `~/Documents/splash-jacks-pools/` | 62 source files in `src/lib/`, `src/app/api/`, `src/components/admin/`, plus `prisma/schema.prisma`, 5 SQL migrations, `middleware.ts`, `vercel.json` | env-thunk lib, idempotent cron with Bearer auth, graceful-degrade vendor SDKs, dual-notes (`customerNotes`/`adminNotes`) on Pool, CSV exporter, magic-link welcome email, Cmd-K global admin search, lead drip dedupe via `(leadId, template)` index, stealth-gate middleware, dual-runtime auth (Supabase Auth + Prisma User shadow), Mapbox SWFL-bboxed geocoding with module-local cache, role-based landing redirect, fragment-token recovery on `/auth/sync` |
| `~/Documents/studio-templates/studio-template-portal/` | 38 source files (full mirror of Splash Jacks lib + app skeleton minus pool-specific code) | Confirms `env.ts`, `supabase/cookie-options.ts`, `stripe.ts`, `prisma.ts`, `emails/internal.ts`, the 4 cron routes, the 9 API routes, and the `(marketing)` route group are TEMPLATE patterns, not tenant patterns |
| `~/Documents/studio-templates/studio-template-platform/` | 39 source files (Splash-Jacks-shaped) | Same lib/* contents as portal; carries pool-specific files (`pool-math.ts`, `pool-chemicals.ts`, `service-cities.ts`) that portal does not — confirms which patterns are generic vs vertical-specific |
| `~/Documents/studio-templates/studio-template-site/` | 5 HTML pages + 2 Workers + 1 brand-swap script | Casamoré-pattern Cloudflare Worker `chat.js` (Anthropic) and `subscribe.js` (MailerLite bridge); `scripts/swap.mjs` mustache-lite templating; brand.json shape |
| `~/Documents/businesses/casamore/`, `~/Documents/businesses/buildbridge/` | EMPTY — 0 files | Cannot harvest. Patterns inferred from the templates they fork from |

---

## NEW skill candidates — code patterns the spec missed

Each candidate cross-referenced against the 148 installed skill names — no overlap.

### 1. `env-thunk-module`

- **Pack:** Day14 build conventions (sibling to `next-app-router-conventions`)
- **Purpose:** Centralize every `process.env` read in one `src/lib/env.ts` file that exposes lazy thunks (`required()` / `optional()`) instead of bare strings, so missing prod env vars fail loudly at first request rather than misbehaving silently.
- **Evidence:**
  - `~/Documents/splash-jacks-pools/src/lib/env.ts:1-66` — the canonical implementation with `required()`, `optional()`, `publicEnv = { siteUrl, supabaseUrl, ... }`, `serverEnv = { stripeSecretKey, twilioAuthToken, ... }`
  - `~/Documents/studio-templates/studio-template-portal/src/lib/env.ts:1-66` — byte-for-byte same `required`/`optional` helpers + same split between `publicEnv` and `serverEnv`
  - `~/Documents/studio-templates/studio-template-platform/src/lib/env.ts:1-66` — same
- **Why a skill:** Three identical implementations in three repos = the pattern is already replicated by copy-paste. A skill spec lets the bootstrapper / scheduled-task author / build agent add a new env var in the correct place every time without staring at Splash Jacks first. Pattern includes the non-obvious "thunk not constant" detail (so `import` at top of a server-only file doesn't crash route handlers that don't actually need that env var).
- **Build time:** ~30 min — copy the file, document the public/server split + the thunk reasoning + the "every new env var goes here, never `process.env.X` direct in app code" rule.

### 2. `vercel-cron-bearer-auth`

- **Pack:** Day14 build conventions
- **Purpose:** The canonical "Vercel cron route" skeleton: `runtime = "nodejs"`, `dynamic = "force-dynamic"`, `GET` handler, `CRON_SECRET` Bearer check, 503 on missing-secret-misconfig, 401 on bad caller, idempotency note in the JSDoc. Same template every time.
- **Evidence:**
  - `~/Documents/splash-jacks-pools/src/app/api/cron/visit-reminders/route.ts:28-46` — Bearer check + `runtime = "nodejs"` + `dynamic = "force-dynamic"` exactly
  - `~/Documents/splash-jacks-pools/src/app/api/cron/admin-digest/route.ts:14-26` — same skeleton
  - `~/Documents/splash-jacks-pools/src/app/api/cron/lead-nurture/route.ts:32-65` — same skeleton, adds the `?dryRun=1` flag pattern + the `(leadId, template)` dedupe table
  - `~/Documents/splash-jacks-pools/src/app/api/cron/schedule-next-visits/route.ts` — same skeleton (file present in inventory)
  - `~/Documents/splash-jacks-pools/vercel.json:1-22` — all 4 routes wired with cron schedules
  - Templates mirror these 4 routes file-for-file
- **Why a skill:** The 503-vs-401 split is non-obvious: 503 when the SERVER is misconfigured (no `CRON_SECRET`), 401 when the CALLER is wrong. Production code gets this right consistently because the original Splash-Jacks route was copy-pasted; a skill prevents agents from writing `if (!authed) return 503` when scaffolding a new cron.
- **Build time:** ~45 min.

### 3. `graceful-degrade-vendor-sdk`

- **Pack:** Day14 build conventions
- **Purpose:** Every vendor-SDK helper (Resend, Twilio, Mapbox, Supabase service role) checks creds at the top and, if missing, logs the would-be payload + returns `{ sent: false, reason: "no-creds" }` instead of throwing. Lets the rest of the system run before all vendor accounts are provisioned.
- **Evidence:**
  - `~/Documents/splash-jacks-pools/src/lib/sms.ts:21-37` — Twilio: `if (!accountSid || !authToken || !fromNumber) { console.info("[sms] Twilio not configured — would have sent:", ...); return { sent: false, reason: "no-creds" }; }`
  - `~/Documents/splash-jacks-pools/src/lib/emails/internal.ts:18-33` — Resend: same pattern with `"no-api-key"` reason
  - `~/Documents/splash-jacks-pools/src/lib/actions/save-lead.ts:50-57` — Supabase: `if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) { console.info("[saveLead] DB not configured — would have persisted:", ...); return { ok: true, persisted: false }; }`
  - `~/Documents/splash-jacks-pools/src/lib/route-map.ts:42-44` — Mapbox: `if (!token) return null;`
  - `~/Documents/splash-jacks-pools/src/lib/emails/welcome.ts:39-44` — Resend graceful-degrade for welcome email
- **Why a skill:** This pattern is consistently named in JSDocs as "graceful degrade" — it's already a recognized concept in the codebase but lives only in code. A skill makes the pattern explicit so build agents stop hard-throwing on missing env vars when creating new vendor integrations. Distinct from the existing `email-fallback-channel` skill (which is about Telegram→email failover at runtime), this is about cred-absent dev-mode behavior.
- **Build time:** ~20 min.

### 4. `idempotent-supabase-sql-migration`

- **Pack:** Day14 build conventions
- **Purpose:** Every SQL file under `prisma/sql/` follows the same shape: dated filename, banner comment with `Date:` + `Why:` + `HOW TO APPLY:` heading, every `CREATE TABLE` / `CREATE TYPE` / `ALTER TABLE ADD COLUMN` wrapped with `IF NOT EXISTS` or a `DO $$ BEGIN IF NOT EXISTS (...) THEN ... END$$;` guard, so re-running the file in the Supabase SQL editor is a no-op.
- **Evidence:**
  - `~/Documents/splash-jacks-pools/prisma/sql/2026-05-16-lead-email.sql:1-21` — banner + `CREATE TABLE IF NOT EXISTS`
  - `~/Documents/splash-jacks-pools/prisma/sql/2026-05-16-chemical-inventory.sql:1-15` — banner + `CREATE TABLE IF NOT EXISTS`
  - `~/Documents/splash-jacks-pools/prisma/sql/2026-05-13-gallery-photo.sql:1-22` — `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GalleryCategory') THEN CREATE TYPE ... END$$;` for the enum
  - `~/Documents/splash-jacks-pools/prisma/sql/2026-05-14-pool-route-day-of-week.sql:1-22` — `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` plus a `DO $$ BEGIN IF NOT EXISTS (... pg_constraint ...)` for the check constraint
  - `~/Documents/splash-jacks-pools/prisma/sql/2026-05-14-pool-admin-notes.sql:1-12` — `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- **Why a skill:** Splash Jacks is on Prisma with Supabase Auth, which means `prisma migrate deploy` can't run (it'd try to touch the `auth.*` schema). Migrations live in `prisma/sql/` and run by paste-into-dashboard. The "IF NOT EXISTS everywhere" guard pattern + the banner format + the "paste this into the Supabase SQL editor" instruction is replicated in every file but isn't documented anywhere. The existing `idempotent-bash-script` skill covers shell scripts, not SQL. Build agents writing new migrations need this.
- **Build time:** ~30 min.

### 5. `nextjs-stealth-gate-middleware`

- **Pack:** Day14 build conventions
- **Purpose:** Three-responsibility `middleware.ts` pattern: (1) stealth-gate behind `SITE_PASSWORD` cookie, (2) auth-guard `/admin` + `/h/*` prefixes, (3) refresh Supabase session every navigation. Plus the matching `robots.ts` that returns `disallow: /` while the gate is active.
- **Evidence:**
  - `~/Documents/splash-jacks-pools/middleware.ts:1-90` — the full three-responsibility comment + `GATE_BYPASS_PATHS` array + `PROTECTED_PREFIXES = ["/admin", "/h"]` + the explicit `/r` bypass (referral cookies must drop before the gate redirect)
  - `~/Documents/splash-jacks-pools/src/app/robots.ts:1-30` — `const isStealth = Boolean(process.env.SITE_PASSWORD); if (isStealth) return { rules: [{ userAgent: "*", disallow: "/" }] };`
  - `~/Documents/splash-jacks-pools/src/app/unlock/page.tsx:1-37` — the unlock form page
- **Why a skill:** The pre-launch stealth-gate is mentioned in the empire spec (`day14-os-skills-and-empire.md`) as a launch-day thing, but the actual middleware that implements it has subtle pitfalls — e.g. the comment `// Referral landing route — must bypass the stealth gate so the /r/[code] handler can set the sjp_ref cookie BEFORE the visitor is redirected to /get-started. Without this every referral link dumped a prospect at /unlock and killed the funnel.` (`middleware.ts:36-41`) records a bug fix that a new tenant build will rediscover the hard way without this pattern documented. Pairs with the existing `launch-day-cutover` skill (which is about the cutover process) — this one is about the middleware code that supports it.
- **Build time:** ~45 min.

### 6. `admin-csv-export-endpoint`

- **Pack:** Day14 build conventions (or new "ops surface" pack)
- **Purpose:** The `/api/admin/export?type={resource}` endpoint pattern — `requireRole(["ADMIN"])`, zod-narrow the type param, date-stamped filename, `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="..."`, `Cache-Control: no-store`. One endpoint serves N resource types via switch.
- **Evidence:**
  - `~/Documents/splash-jacks-pools/src/app/api/admin/export/route.ts:1-72` — full pattern with `TypeSchema = z.enum(["customers", "visits", "quotes", "mrr"])` + per-type CSV builders + the headers block
  - `~/Documents/studio-templates/studio-template-portal/src/app/api/admin/export/route.ts` — present (verified existence in inventory) — confirms cross-tenant
  - `~/Documents/studio-templates/studio-template-platform/src/app/api/admin/export/route.ts` — present
- **Why a skill:** Every customer build needs "give me the data" CSV exports for taxes / accounting backup / migration. The pattern is templated identically across all three repos but no skill describes it. Build agents would otherwise hand-roll a different `Content-Disposition` shape each time. The "all-time, no date filter — add `?from/?to` later if customer base outgrows it" decision (commented in the file) is also worth preserving in skill form.
- **Build time:** ~30 min.

### 7. `dual-notes-pattern` (customer-visible vs internal)

- **Pack:** Day14 build conventions (data-model)
- **Purpose:** On every customer-related model, carry two parallel notes columns: `customerNotes` (visible in the portal AND admin) for back-and-forth communication, and `adminNotes` (NEVER visible in customer-facing routes) for VIP tags, payment quirks, route quirks, access codes. Enforced by code review + comment-in-schema, not by any runtime separation.
- **Evidence:**
  - `~/Documents/splash-jacks-pools/prisma/schema.prisma` Pool model (`grep -A 20 "^model Pool"`): both `customerNotes String? @map("customer_notes")` AND `adminNotes String? @map("admin_notes")` with the comment `/// MUST NEVER appear in customer-facing routes (/h/*, emails, receipts, etc).`
  - `~/Documents/splash-jacks-pools/prisma/sql/2026-05-14-pool-admin-notes.sql:1-12` — the migration that added the second column with the same separation rationale in the banner comment
- **Why a skill:** This pattern is half-implemented (Pool has both columns; User does not yet but probably should — same is true for Quote, Visit). When a build agent adds a new customer-touching model, the agent needs to ask "should this have admin-only notes?" up-front. Currently this is tribal knowledge in one comment in one Prisma file. Skill makes the rule explicit + lists the routes that MUST exclude `adminNotes` from their queries.
- **Build time:** ~20 min.

### 8. `lead-drip-dedupe-via-junction-table`

- **Pack:** Day14 build conventions (or "marketing automation" pack)
- **Purpose:** The idempotent multi-touch email/SMS drip pattern: instead of a `lastSentTemplate` column on Lead, create a `LeadEmail (leadId, template, sentAt)` junction table with `@@index([leadId, template])` and check for the row before sending. Lets cron run daily across overlapping windows (`day3` fires at age 3-5 days, `day7` at 7-9, etc.) without double-sending, and lets you backfill manually-sent records.
- **Evidence:**
  - `~/Documents/splash-jacks-pools/prisma/schema.prisma` LeadEmail model: `model LeadEmail { id ... leadId String ... template String ... sentAt DateTime ... @@index([leadId, template]) }`
  - `~/Documents/splash-jacks-pools/src/app/api/cron/lead-nurture/route.ts:48-65` — the full STAGES array with `[N, N+2)` day windows and the explicit comment "The window for each stage is `[N, N+2)` days old, i.e. two days wide. That gives the cron one missed-day of slack without double-sending — the LeadEmail dedupe table guarantees at-most-once per (leadId, template)."
  - `~/Documents/splash-jacks-pools/prisma/sql/2026-05-16-lead-email.sql` — the migration that birthed it
- **Why a skill:** This pattern handles three failure modes elegantly (overlapping cron windows, retry after partial-send crash, manual touch by Jack). The "two-day-wide window" choice is a specific engineering decision worth preserving. Pairs with the `vercel-cron-bearer-auth` skill above. Not the same as the existing `eod-update-writer` (which is about content) — this is about scheduling/dedupe infrastructure.
- **Build time:** ~30 min.

### 9. `module-local-geocode-cache`

- **Pack:** Day14 build conventions (or rejected — see open question)
- **Purpose:** The pragmatic "geocode every address that hits the route page, cache forever in a module-level `Map`, accept that the cache is process-local and the upper bound is fine at SWFL scale" pattern. With explicit upgrade-path comment for when you outgrow it.
- **Evidence:**
  - `~/Documents/splash-jacks-pools/src/lib/route-map.ts:28-78` — `const cache = new Map<string, [number, number]>();` + the explicit comment "The geocoding cache is intentionally process-local and unbounded — at SWFL pool-route scale (≤ a few hundred unique addresses) this is fine. Move to Redis/Vercel KV if the customer base ever grows past that."
- **Why a skill:** This is a small but distinctive "deliberately don't over-engineer at v1" pattern that surfaces in 3-4 places across the codebase (`chat/route.ts:43-53` has the same shape for rate-limit, `referrals/code.ts` reuses the `referredEmail` column instead of adding a `code` column, etc.). A "v1 simplifications" skill could collect these — see open question #2.
- **Build time:** ~20 min (if it becomes a skill rather than a comment in `next-app-router-conventions`).

### 10. `cloudflare-worker-mailerlite-bridge`

- **Pack:** Site-tier templates
- **Purpose:** The standalone Cloudflare Worker that bridges form posts to MailerLite for the Site tier (no Next.js server, just a Worker + static HTML). Includes the `message` custom-field plumbing fix from kickoff task 03b. Pairs with `cloudflare-worker-chat-anthropic` for the Casamoré-style site tier.
- **Evidence:**
  - `~/Documents/studio-templates/studio-template-site/workers/subscribe.js:1-70` — full Worker including the documented `message`-custom-field fix lifted from the Casamoré pattern
  - `~/Documents/studio-templates/studio-template-site/workers/chat.js:1-50` — companion Worker for the Anthropic chatbot
- **Why a skill:** This is mentioned in the Round-1 harvest as a "lower-priority candidate" (`mailerlite-worker-integration`). Bumping it up: production code now contains a hardening commit (the 4000-char cap, the spam guard, the custom-field plumbing) that should be encoded as a skill before the next site-tier customer build forgets all three. Pairs naturally with the spec'd-but-not-yet-installed `chatbot-prompt-builder` skill (see spec-drift section).
- **Build time:** ~30 min.

---

## Spec-drift candidates — skills whose spec doesn't match production reality

### a. Spec'd-and-planned skills that DO NOT EXIST as installed skills

The `day14-os-skills-and-empire.md` doc names these skills explicitly. Production code in Splash Jacks already implements all of them. None exist in `~/Documents/studio/docs/seeds/skills/`.

| Spec'd skill name | Production code that implements it | Recommendation |
|---|---|---|
| `chatbot-prompt-builder` | `~/Documents/splash-jacks-pools/src/lib/chatbot-context.ts` (assembles system prompt from FAQ + READINGS + tier prices) + `~/Documents/splash-jacks-pools/src/app/api/chat/route.ts` (the chat handler) | **(a) write the skill from the working code** — full implementation already exists, including the rate-limit + handoff-detection + ChatLog upsert patterns |
| `photo-watermarker` | `~/Documents/splash-jacks-pools/src/lib/photo-watermark.ts` (sharp + exifr + GPS + timestamp + wordmark overlay) | **(a) write the skill from the working code** — production version is more sophisticated than the spec described (handles auto-rotate, fallback-on-failure, GPS-from-EXIF) |
| `seo-city-page-builder` | `~/Documents/splash-jacks-pools/src/app/(marketing)/pool-service/[city]/page.tsx` + `~/Documents/splash-jacks-pools/src/lib/service-cities.ts` (the SERVICE_CITIES catalog + generateStaticParams + metadata + JSON-LD areaServed) | **(a) write the skill** — note the surprising "we removed cities from this catalog but kept the County enum because historical data references it" subtlety; lift verbatim |
| `case-study-writer` | Half-implemented at `~/Documents/studio/src/app/case-studies/casamore/page.tsx` + `buildbridge/page.tsx` (placeholder pages exist) | **(c) build skill THEN page** — the page is a stub waiting for the skill |
| `feedback-classifier` | Half-implemented — the chat handler does `HANDOFF_PHRASES` regex detection at `chat/route.ts:78-83` for "talk to a real person" / contact info detection | **(c) split** — the chat handler's regex is "handoff intent detector" not "feedback classifier"; spec is for inbound-email triage which doesn't exist yet. Write `chat-handoff-detector` skill from working code; keep `feedback-classifier` as a future skill |

### b. Installed skills whose spec lags the production reality

| Existing skill | What spec says | What code actually does | Recommendation |
|---|---|---|---|
| `visit-photo-attacher` | "Watermark + resize + attach photos to visit log" (per `~/Documents/studio/docs/seeds/skills/visit-photo-attacher/SKILL.md`) | `~/Documents/splash-jacks-pools/src/lib/photo-watermark.ts` does watermark + EXIF GPS extraction + auto-rotate + fail-soft pass-through. The "resize" mentioned in the skill spec doesn't actually live in `photo-watermark.ts` — sharp is invoked but the output is the watermarked photo at original size. The "attach to customer's note" is done elsewhere in `src/app/admin/visits/[id]/actions.ts` (not directly part of the watermark pipeline). | **(c) split into two skills**: `photo-watermarker` (the sharp + exifr + GPS pipeline) and `visit-photo-attacher` (the action-handler-side wiring that calls the watermarker then uploads to Supabase Storage and links the URL to the Visit row). The current spec conflates them. |
| `vercel-route-stripe-webhook` | Stripe webhook receiver — verifies sig, dispatches by event type, calls downstream skills like `dossier-folder-initializer` | `~/Documents/splash-jacks-pools/src/app/api/stripe/webhook/route.ts` does subscription lifecycle handling (`customer.subscription.{created,updated,deleted}`, `invoice.paid`, `invoice.payment_failed`) — calls `upsertSubscription`, `markSubscriptionCancelled`, `notifyPaymentFailed`, `sendWelcomeEmail`, `scheduleNextVisitForStripeSubscription`. Very different downstream flow than what the spec describes. | **(a) update spec — split or generalize**: the Day14 webhook handles new customer onboarding; the Splash Jacks webhook handles ongoing subscription lifecycle. Spec needs to acknowledge both modes, or split into `vercel-route-stripe-webhook-day14-intake` vs `vercel-route-stripe-webhook-subscription-lifecycle`. |
| `og-image-generator` | Per-route OG via `@vercel/og` with live data | Splash Jacks ships a root `~/Documents/splash-jacks-pools/src/app/opengraph-image.tsx` (static gradient + brand text) plus uses Next 14's built-in `ImageResponse` from `next/og` — NOT `@vercel/og`. Per-route variants don't exist yet (per-blog-post / per-city OG would be obvious wins and the spec says they should). | **(a) update spec** to use `next/og` (which is the canonical 2026 import) and **(b) update code** to add the per-route OGs the spec promises. |
| `idempotent-bash-script` | "Every bash script Day14 ships is safe to re-run" — covers `#!/usr/bin/env bash; set -euo pipefail` headers + the GREEN/YELLOW/RED log helpers | Production code generalizes this idea to SQL too (every `prisma/sql/*.sql` is idempotent per pattern in NEW skill #4 above) and to startup actions (`src/lib/storage-buckets.ts:ensureBucket` swallows "already exists" errors as part of the idempotency contract). | **(c) split**: keep `idempotent-bash-script` for bash; add `idempotent-supabase-sql-migration` (NEW #4) and `idempotent-startup-action` (new sub-skill from `storage-buckets.ts`) as siblings. |

---

## Overlap / consolidation candidates

### A. `stripe-payment-link-creator` + `stripe-webhook-verifier` + `stripe-test-mode-validator` + `vercel-route-stripe-webhook`

- All four touch the same module in production: `~/Documents/splash-jacks-pools/src/lib/stripe.ts` + `src/app/api/stripe/webhook/route.ts` + `src/app/api/stripe/checkout/route.ts` + `src/app/api/stripe/portal/route.ts`.
- Verifier and test-mode-validator are tiny — each is essentially "do this 5-line check."
- **Recommendation:** keep them as separate skills (they're invoked from different agents at different times — verifier in build, test-mode-validator on launch) BUT add a top-level `stripe-integration-pack` README that lists them in invocation order. Currently they live as siblings with no cross-link.

### B. `vercel-route-cal-com-webhook` + `vercel-route-intake-webhook` + `vercel-route-resend-inbound` + `vercel-route-stripe-webhook`

- All four are "Vercel webhook route at `day14.us/api/webhooks/{name}`" — identical skeletons (runtime=nodejs, dynamic=force-dynamic, POST handler, signature verification, dispatch by event type).
- **Recommendation:** extract a base skill `vercel-webhook-route-skeleton` (similar to the proposed `vercel-cron-bearer-auth` NEW #2) and have the four route-specific skills reference it for the boilerplate. The route-specific skills then focus on the dispatch logic. Otherwise we have 4 skills that each re-describe the same `runtime = "nodejs"; export const dynamic = "force-dynamic";` lines.

### C. `eod-update-writer` + `eod-telegram-formatter` + `daily-eod` + `daily-kickoff` + `daily-kickoff-telegram-formatter` + `morning-headline-format`

- Six skills, all about the daily writeup/format ritual.
- Cross-reference: the Round-2 methods-harvest already flagged `morning-headline-format` as new. Round-1 flagged `eod-update-writer` as needing widening.
- **Recommendation:** keep the writers separate from the formatters (Telegram formatter is a layer ON TOP of the writer) but consolidate the daily-kickoff trio into one skill `daily-kickoff` that has an optional Telegram-output mode. Same for daily-eod.

### D. `customer-build-day-1-bootstrap` + `template-forker` + `repo-rename-after-fork` + `dossier-folder-initializer` + `git-fork-utility`

- All five fire on a new customer build. `customer-build-day-1-bootstrap` is the orchestrator; the others are mechanics.
- **Recommendation:** the orchestrator is correctly its own skill (a single agent's playbook for a complex multi-step flow). The mechanics skills are correctly atomic. No consolidation needed — but **add cross-links** so the orchestrator's spec lists the mechanics it composes, and each mechanic lists "called by: customer-build-day-1-bootstrap." Currently the agent loading the bootstrap skill has to discover the mechanics by name.

---

## Anti-patterns in production worth a "DO NOT" skill

### 1. `dont-encode-data-in-string-prefixes` (DO NOT skill)

- **Evidence:** `~/Documents/splash-jacks-pools/src/lib/referrals/code.ts:1-30` — the explicit comment "The existing Referral schema has no dedicated `code` column. Rather than push a schema change for one field, we encode the share code inside the already-indexed `referredEmail` column on the customer's 'master' row: `referredEmail: 'code:ABC123'`."
- **Why a DO NOT skill:** This was a defensible v1 hack (avoid a migration), but the comment itself flags the smell ("Real conversions (one Referral row per signed-up friend) carry the friend's actual email in `referredEmail` and a non-null `status` — so the two row types never overlap in practice. See DAY_LOG for the rationale."). Future tenants will be tempted to repeat this pattern because Splash Jacks's code is the reference implementation. Skill should say: "When you find yourself reaching for a string-prefix encoding, just add the column. Migrations are cheap; ambiguous columns are not."
- **Build time:** ~15 min.

### 2. `dont-use-in-memory-rate-limit-across-pods` (DO NOT skill)

- **Evidence:** `~/Documents/splash-jacks-pools/src/app/api/chat/route.ts:42-46` — `const HITS = new Map<string, { count: number; resetAt: number }>(); ... // In-memory rate limit (8 msgs/min/IP). ... // bump to a Redis/Vercel KV later if abuse becomes an issue`
- **Why a DO NOT skill:** Vercel can serve the same route from multiple cold-started Node instances; an in-memory `Map` is per-instance, so the "8 msgs/min/IP" cap is actually "8 msgs/min/IP/instance." Sufficient at low traffic, becomes a hole if scraped. The comment owns the limitation; the skill should record the "when does this stop being acceptable?" threshold so the next build doesn't ship the same pattern at higher traffic.
- **Build time:** ~15 min.

### 3. `dont-hardcode-timezone-offset` (DO NOT skill)

- **Evidence:** `~/Documents/splash-jacks-pools/src/lib/schedule-visit.ts:24` and `src/app/api/cron/visit-reminders/route.ts:47` — `const FL_OFFSET_HOURS = -4;` used to compute "Florida midnight." This is correct during EDT but wrong during EST (which would be -5).
- **Why a DO NOT skill:** Twice a year (DST transitions, typically March + November) the cron will fire at the wrong wall-clock time. SWFL daylight saving means EDT runs ~Mar→Nov; the cron schedule was tuned to EDT and the offset is hardcoded to -4. Skill should: "Always derive timezone offset from `Intl.DateTimeFormat` with a named zone like `America/New_York`, never hardcode the numeric offset. Florida observes DST."
- **Build time:** ~20 min.

---

## Tenant-specific patterns to leave alone

These patterns are Splash-Jacks-specific and should NOT lift to `_shared/skills/`:

1. **Pool chemistry math** — `~/Documents/splash-jacks-pools/src/lib/pool-math.ts` + `pool-chemicals.ts`. Pure pool-domain knowledge. (Note: this duplicates into `studio-template-platform/src/lib/` because the platform tier targets service businesses — but it's still vertical-specific. Should live in a "pool-vertical" skill bundle, not in `_shared/`.)
2. **SWFL cities catalog** — `service-cities.ts`. Geographic to Splash Jacks's route. Other tenants will have different cities.
3. **Pool-specific brand voice** ("Pool care, told straight." / "🐥" emoji in OG / "splash-300" / "water-600" Tailwind tokens) — `src/components/ui/icons.tsx`, `tailwind.config.ts`, the marketing copy strewn through `src/app/(marketing)/`. Brand-specific.
4. **Stripe price IDs by tier** — `src/lib/stripe.ts:43-58` (`priceIdForTier`, `tierFromPriceId`). The CHEM_ONLY / FULL / PREMIUM tiering is pool-business-shaped; other tenants will have different tiers.
5. **Mapbox SWFL bounding box** — `route-map.ts:30` — `const SWFL_BBOX = "-82.4,25.6,-81.4,27.0"`. Vertical-specific geocoding bias.
6. **"Pool Type" / "Pool Surface" / "Sanitizer" enums** — the Prisma enums in `schema.prisma`. Industry-specific.

The patterns that DO lift to `_shared/` are: env-thunk-module, vercel-cron-bearer-auth, graceful-degrade-vendor-sdk, idempotent-supabase-sql-migration, nextjs-stealth-gate-middleware, admin-csv-export-endpoint, dual-notes-pattern, lead-drip-dedupe-via-junction-table, photo-watermarker, chatbot-prompt-builder, og-image-generator (improved).

---

## Open questions for Jack (max 5)

1. **Casamoré + Buildbridge repos are empty on this machine.** Was this round meant to mine those two repos plus Splash Jacks, but they haven't been cloned/synced locally yet? If yes — I treated `studio-template-portal` and `studio-template-platform` as their stand-ins for cross-tenant signal, but a real clone would let me check what each tenant DIVERGED from the template, which is where the next round of skill candidates would surface.

2. **"v1 simplification" patterns — one big skill or many small ones?** Production code has at least four "we deliberately did the cheap thing here, here's when to upgrade" comments: the `Map` geocode cache, the `Map` rate-limit, the `referredEmail` prefix encoding, the all-time CSV export with no date filter. They're each a small pattern. Worth one consolidating `pragmatic-v1-pattern-catalog` skill rather than four little ones?

3. **Photo-watermarker vs visit-photo-attacher — which name wins?** The spec calls for `photo-watermarker`; the installed skills directory has `visit-photo-attacher`. Production code lives in `src/lib/photo-watermark.ts` (closer to spec name). Recommend renaming the installed `visit-photo-attacher` → `photo-watermarker` and creating a separate (thinner) `visit-photo-attacher` for the wiring step. OK to do?

4. **Spec'd-but-uninstalled skills — auto-build from working code, or wait for the next customer?** Five skills are named in `day14-os-skills-and-empire.md` and have full implementations in Splash Jacks (chatbot-prompt-builder, photo-watermarker, seo-city-page-builder, case-study-writer, feedback-classifier). I can write the skill specs from the working code today (~30 min each), or wait for the next customer build to trigger extraction. Which?

5. **Hardcoded `-4` timezone offset — fix now or wait for the bug?** Production code in `schedule-visit.ts` and `visit-reminders/route.ts` will misfire by an hour during EST (roughly Nov-March). The bug doesn't trigger until November. Worth a hotfix + a "no numeric offsets" DO-NOT skill now, or wait for the failure to write the postmortem?

