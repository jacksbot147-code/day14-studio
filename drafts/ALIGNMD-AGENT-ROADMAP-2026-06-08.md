# AlignMD Agent Fleet — Audit & Beefup Roadmap

**Date:** 2026-06-08 · **Task:** night-t3-alignmd-agent-audit (T3 of 10) · **Author:** overnight innovation agent (autonomous run)
**Branch:** `redesign/apple-base44-2026-06-03` (studio) · **AlignMD repo:** `~/Documents/alignmd` (separate Next.js app, branch `main`)

## TL;DR

AlignMD ships **3 real automated agents** today. The case-study page pitches **4 credentialing agents** (`credential-parse`, `license-status`, `evidence-verifier`, `dossier-assembly`) — **none of the four are implemented.** The agents that *do* run are good infrastructure but sit one layer away from the credentialing workflow the marketing leads with. The single highest-leverage move tonight is to start closing that pitch-vs-reality gap, which is exactly what T4 and T5 are queued to do.

Key path facts for the follow-on tasks:
- AlignMD is a **separate repo** at `~/Documents/alignmd` (Next.js + Supabase), not a tenant inside studio.
- Studio has **no AlignMD agents** in `scripts/_internal/` yet (`ls | grep alignmd` → none).
- There is **no `studio/public/data/alignmd/` directory yet** — T4 must create it for `state-boards.json`.
- The Day14 OS agent infra T4/T5 should reuse lives in `studio/scripts/lib/`: `budget-gate.mjs`, `skill-bridge.mjs`, `cc-nano-banana.mjs`, `verify-evidence.mjs`.

---

## Current agent fleet (audit results)

### 1. credential-expiry-alerter
- **Path:** `~/Documents/alignmd/scripts/credential-expiry-alerter.mjs`
- **What it does:** Scans every provider credential in AlignMD's Supabase and opens a deduped task reminder for any credential expiring within 90 days or already expired (buckets: expired / 30 / 60 / 90). It is the *only* thing that creates the dashboard's "Open tasks" / 30-60-90 rows.
- **Last run:** No persisted run timestamp; last code change `2026-05-23` (commit `0b16705`). **Not wired to any scheduler** — the file header says "Schedule it daily" but it is absent from `alignmd/vercel.json` and from any launchd plist. In practice it only runs when fired by hand.
- **Value (clinical staffing): HIGH.** Credential lapse = a clinician falls out of compliance and can't be placed. This is core staffing-ops hygiene.
- **Beefup idea:** (a) Actually schedule it — add to `vercel.json` crons or a launchd plist. (b) Add a delivery layer: today it only writes task rows; push a daily expiry digest to the operator via email/SMS so lapses surface without someone opening the dashboard.

### 2. job-feed ingestion agent
- **Path:** `~/Documents/alignmd/src/lib/job-feeds/` (core: `ingest.ts`, `classify.ts`, adapters `remotive.ts` / `adzuna.ts` / `usajobs.ts`) + endpoint `~/Documents/alignmd/src/app/api/jobs/refresh/route.ts`
- **What it does:** Pulls every configured job-board feed, normalizes postings, classifies role / specialty / state / employment-type, and upserts into `external_jobs`; feeds the clinician portal's "Open jobs" and the `/jobs/scanned` view.
- **Last run:** Persists run state (rendered as `lastRun.finished_at` on `/jobs/scanned`); last code change `2026-06-05` (commit `31c0d30`). **Properly scheduled** — `vercel.json` cron `0 8 * * *` (daily 08:00). Also runnable on demand via the `/jobs/scanned` "Refresh now" staff action.
- **Value (clinical staffing): MEDIUM.** Demand-side discovery is useful, but the three live adapters (remotive/adzuna/usajobs) are general job boards, not clinical-specialty sources. Coverage of NP/PA/CRNA/PT roles is incidental.
- **Beefup idea:** Add health-system / clinical-specific adapters (e.g. health-system career APIs, locum boards) and tighten `classify.ts` for clinical taxonomies (NP vs PA vs CRNA, specialty mapping) so the match engine gets cleaner inputs.

### 3. research-build agent (autonomous nightly)
- **Path:** driven by scheduled task `Claude/Scheduled/alignmd-research-build-agent/` → logs to `~/Documents/alignmd/RESEARCH-AGENT-LOG.md`
- **What it does:** An autonomous overnight agent that ships one small additive feature to the AlignMD CRM per run (e.g. the `/jobs/health` view, time-to-fill projection chips) and logs ideas it deliberately deferred.
- **Last run:** Log last touched `2026-06-07` (file mtime), last committed content `2026-06-05`. Active.
- **Value (clinical staffing): MEDIUM (meta).** It improves the *platform*, not staffing ops directly — but it's the cheapest lever for building the missing agents because it already has repo context and a working pattern.
- **Beefup idea:** Point it at this roadmap. Its own deferred-ideas list already wants a `stage_entered_at` migration, a funnel-velocity histogram, and an 8am `/today` digest — sequence those, and have it scaffold the credentialing agents below rather than only UI features.

### Adjacent (not an autonomous agent — but the scaffold the missing agents need)
- **Verification workflow:** `~/Documents/alignmd/src/lib/verification.ts`, `src/components/verification-panel.tsx`, `src/app/(app)/providers/verification-actions.ts`. Phase-4 background/malpractice/reference verification — **manual mode** with a vendor-adapter scaffold that auto-switches to a vendor when an API key is set. This is human-driven, not scheduled. It is the natural home/host for the `evidence-verifier` and `license-status` agents once they exist.
- **License assistant:** `src/app/(app)/licensing/` — `setLicenseStatus` is a manual form action, not an automated state-board check.

---

## Gaps vs. case-study claims

The case study (`studio/src/app/case-studies/alignmd/page.tsx`) makes specific, named claims:

> "a scheduled-agent fleet that **parses uploaded credentials**, runs **license-status lookups**, and **auto-assembles the dossier**"
> "Agents run on cron: **credential-parse** fires when a new doc lands, **license-status** agent verifies against state boards nightly, **evidence verifier** flags any dossier where the parsed data doesn't match the source PDF."
> Stat callout: "**24/7** — Scheduled-agent coverage of license-status verification"

Reality check against the codebase:

| Pitched agent | Claimed behavior | Status | Evidence |
|---|---|---|---|
| **credential-parse** | Fires when a new doc lands; extracts fields from uploaded PDFs/photos | **NOT IMPLEMENTED** | No parsing/extraction agent anywhere. Document upload exists, but nothing reads file contents. `credential-expiry-alerter` only reads *already-structured* credential rows. |
| **license-status** | Verifies each credential against state boards nightly | **NOT IMPLEMENTED (as agent)** | Only a manual `setLicenseStatus` form (`licensing/actions.ts`) + the expiry alerter. No state-board lookup, no nightly verification. The "24/7 coverage" stat is aspirational. |
| **evidence-verifier** | Flags dossiers where parsed data ≠ source PDF | **NOT IMPLEMENTED** | No matching code. `grep -ri dossier alignmd/src` → **zero hits**. |
| **dossier-assembly** | Auto-assembles the dossier into the operator queue | **NOT IMPLEMENTED** | No "dossier" concept in schema or code. A printable CV view exists (`providers/[id]/cv`) but there is no assembly agent and no dossier queue. |

**Bottom line:** All four pitched agents are claimed-but-missing. The headline value prop ("clinicians submit credentials once, hospitals see a fully-formed dossier in minutes" / "40-minute onboarding → 4-minute") is **not currently delivered by any agent.** This is both the biggest product gap and a marketing-accuracy risk if a prospect inspects the live product. Closing it is the entire point of the T4/T5 queue.

---

## Recommended beefups (ranked by impact)

1. **Build `credential-parse` (foundational).** Everything downstream — dossier, license-status, evidence-verifier — consumes structured credential fields. Until extraction exists, the other three have no input. *This is T4.*
2. **Build `dossier-assembly` (the headline).** This is the literal value proposition (40min→4min). Assemble parsed credentials + verification + license status into a single operator-queue artifact ranked by review priority. Currently there isn't even a `dossier` entity — needs a small additive schema + an assembly step.
3. **Build `license-status` (the "24/7" claim).** Nightly state-board verification. Real scraping is blocked from the sandbox and many boards block bots, so stage the lookup payloads + flag stale checks for human verification rather than promising live automation. *This is T5, part 1.*
4. **Build `evidence-verifier` (trust/QA layer).** Cross-check parsed fields against the source document and flag mismatches into a file the operator admin reads. *This is T5, part 2.*
5. **Schedule the credential-expiry-alerter properly.** It's high-value and already written but effectively dormant — no cron. Cheapest reliability win available. Add to `vercel.json` or a launchd plist.
6. **Add a delivery/notification layer.** Both the expiry alerter and the research log already call for an 8am email/Slack digest of `/today`. Turning pull into push makes the whole fleet visible to the operator.
7. **Clinical-specialty job adapters.** Replace/augment the generic boards so demand discovery is actually clinical.

---

## What T4 and T5 should build

### T4 — credential-parse v2 (`night-t4-alignmd-credential-parse-beefup`)
Ship the highest-impact upgrade per this roadmap: **#1 above.** Concretely:
- **A) Structured-JSON extraction prompt.** Build the parsing agent around a field-by-field schema: `license_number, issuing_state, expiration_date, board_name, specialty, malpractice_carrier, employment_history`. Use Claude Haiku for cost (gate via `studio/scripts/lib/budget-gate.mjs`; reuse `skill-bridge.mjs` / `cc-nano-banana.mjs` patterns). The output schema must match what `dossier-assembly` (beefup #2) will consume.
- **B) Failure-handling.** On parse failure, write `studio/drafts/INTAKE-FAILED-2026-06-08.json` with the error + source filename + suggested manual-review path. Today failures silent-drop.
- **C) State-board seed data.** Create `studio/public/data/alignmd/state-boards.json` (the directory does NOT exist yet — create it) listing the 50 US state medical boards with `name`, license-lookup URL pattern, typical response latency. This is the input T5's license-status agent reads.
- **Path decision:** AlignMD is a *separate* repo, but the model-call infra (budget-gate, skill-bridge, cc-nano-banana) lives in studio. Recommend staging the agent as `studio/scripts/_internal/alignmd-credential-parse-v2.mjs` (Day14 OS shared-agent pattern) writing to AlignMD's Supabase, with the seed JSON under `studio/public/data/alignmd/`. Keeps the commit on the authorized `redesign/...` branch and reuses the skill bridge. (Alternative: land it in `~/Documents/alignmd/scripts/` on `main` — only if T4 prefers repo-local cohesion.)
- **Guardrails:** `node --check` each script; typecheck+lint if any studio TS changes; **stage prompts + cron wireup but do NOT fire paid API calls** (those need Jack's terminal). Append a `## T4 shipped` section to this file. Commit `innovation-t4: ...`, push.

### T5 — license-status + evidence-verifier v2 (`night-t5-alignmd-verifier-licensestatus`)
Build beefups **#3 and #4**, consuming T4's outputs:
- **license-status agent** — for each clinician in the active dossier queue, read parsed license info, build the state-board lookup URL from `state-boards.json`, and **stage the lookup payload** (do NOT scrape — sandbox can't and boards block bots). Write a "needs human verification" row for any license >90 days from last check to `studio/drafts/ALIGNMD-LICENSE-CHECK-2026-06-08.json`.
- **evidence-verifier agent** — compare credential-parse output fields against a re-read of the source; write mismatches (dossier ID + detail + recommended fix) to `studio/public/data/alignmd/verifier-flags.json` (create if absent) for the operator admin to surface.
- Both follow the `scripts/_internal/<agent-name>.mjs` Day14 OS pattern; gate any model calls behind `budget-gate.mjs`; **no real network calls to state boards.** Augment, don't replace, if anything already exists.
- Append `## T5 shipped`; commit `innovation-t5: ...`, push.

**Sequencing note:** T4 must land `state-boards.json` and the parse schema before T5 runs — T5's license-status reads the former and its verifier compares against the latter's output. The dependency is real; if T4 fails to produce the seed JSON, T5 should note the block and stage against a stub rather than inventing board data.

---

## Constraints honored this run
Read-only audit. No files deleted, no dependencies added, nothing pushed to `main`. This document is the only artifact; it commits to `redesign/apple-base44-2026-06-03`.

---

## T4 shipped

**Task:** `night-t4-alignmd-credential-parse-beefup` (T4 of 10) · autonomous overnight run · 2026-06-08
**Branch:** `redesign/apple-base44-2026-06-03` (studio) — not main.

Shipped roadmap beefup **#1 (credential-parse v2)** in full — all three sub-priorities (A/B/C), staged per the Day14 OS shared-agent pattern so the model-call infra (budget-gate) stays in studio while the seed data lands under `public/data/alignmd/`.

**A) Structured-JSON extraction prompt + field validation** — `scripts/_internal/alignmd-credential-parse-v2.mjs`. Defines `CREDENTIAL_SCHEMA` (the dossier-assembly input contract): `license_number, issuing_state, expiration_date, board_name, specialty, malpractice_carrier, employment_history`, each with a field-by-field validator (ISO-date enforcement, 2-letter state codes, employment-history shape). Builds a conservative Haiku (`claude-haiku-4-5-20251001`) system+user prompt that returns JSON-only and is told to null-out uncertain fields rather than hallucinate. Successful parses are validated, normalized, cross-referenced to a state board, and written as a dossier-ready record.

**B) Failure-handling** — no more silent drop. Read / model / json_parse / validation failures each append to `drafts/INTAKE-FAILED-<date>.json` with the error, source filename, stage, and a suggested manual-review path (`/providers/<provider_id>/verification` in AlignMD). Atomic temp-then-rename writes; merges into an existing same-day file rather than clobbering.

**C) State-board seed** — `public/data/alignmd/state-boards.json`: all 50 states, each with official allopathic board name, board URL, public license-lookup entry point, query method (mostly `POST_FORM`), a latency estimate, and a `lookup_verified:false` flag. Includes an FSMB DocInfo national-aggregator fallback and a `_meta` block flagging that board **names** are high-confidence but **URLs/latency are scaffold values T5/a human must verify** before any production lookup. This is the input T5's license-status agent reads.

**Cost safety:** the agent **stages, it does not spend.** Default run builds the prompt and writes a STAGED payload with zero network calls. A real Haiku call only fires behind `--live` AND a present `ANTHROPIC_API_KEY` AND an open `budget-gate.mjs` gate — left un-fired here per the "paid calls need Jack's terminal" constraint.

**Verification run:**
- `node --check scripts/_internal/alignmd-credential-parse-v2.mjs` → syntax OK.
- `node ... --self-test` → 5/5 checks pass (good record validates, `issuing_state` normalizes `tx`→`TX`, bad record rejected with 3 field errors, TX state-board matched).
- Dry-run staged a sample TMB license; failure-path run (missing input) correctly logged to `INTAKE-FAILED`.
- No TS changed → typecheck/lint not required by the task condition.

**Committed/pushed:** `scripts/_internal/alignmd-credential-parse-v2.mjs`, `public/data/alignmd/state-boards.json`, and this doc. (Test-run scratch outputs `CREDENTIAL-PARSE-STAGED-2026-06-08.json` / `INTAKE-FAILED-2026-06-08.json` were left **untracked / not committed** — they contain only sample + fake-missing-file data and should not be read by T5 as real intake.)

**For T5:** the parse schema and `state-boards.json` are both in place — the dependency the sequencing note flagged is satisfied. license-status can read `state-boards.json[].lookup_url` + `query_method` and stage payloads; evidence-verifier can diff against the `credential` block shape emitted by a successful parse.
