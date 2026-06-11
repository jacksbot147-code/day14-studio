# Run of show — Mini arrival night, 2026-06-10 evening

> Final sweep ran 2026-06-10 ~5:30 PM ET. Live state below — supersedes this
> morning's reports. Follow MINI-ARRIVAL-KIT.md for full commands; this is the
> ordered timeline with current blocker state inlined.

## Blockers as of final sweep

1. **Env keys: 0/8 set ✗** — `.env.local` still has only VERCEL_OIDC_TOKEN +
   GEMINI_API_KEY. All 8 (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
   RESEND_API_KEY, ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
   SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD) missing. **Do this FIRST, before
   the box even opens** — it's the long pole and needs only the laptop +
   password manager. Recipe per key: docs/env-keys-checklist-2026-06-10.md.
2. **Merge/push: NOT done ✗** — `redesign/apple-base44-2026-06-03` is 168
   commits ahead of `main` (main == origin/main at 308392e) and **5 commits
   unpushed** to its own origin branch — the arrival kit, preflight/verify
   scripts, and admin-auth commit exist only on the laptop. Not a cutover
   blocker (rsync carries the working tree), but push the branch tonight as
   cheap insurance before wiping anything: `git push origin
   redesign/apple-base44-2026-06-03` (Jack runs it — agents never push).
   Merge-to-main + prod deploy stays day-2 (todo-94).

E2E not re-run this sweep: gated on keys (0/8). Morning run was 4/7 — failures
consistent with missing keys, as the kit predicts.

## Today's prep reports — status

- merge dry-run (11:00) — **MISSING** (docs/merge-dryrun-2026-06-10.md never written; assume dry-run didn't happen — extra reason to keep merge off tonight's plate)
- data hygiene (12:15) — **MISSING** (docs/data-hygiene-2026-06-10.md not found)
- readiness report (1:30) — **MISSING** (docs/mini-eve-status-2026-06-10.md not found)
- env keys checklist (2:00) — **done** ✓ (confirms 0/8; per-key recipes ready)
- visual QA (2:45) — **MISSING** (docs/visual-qa-2026-06-10.md not found)
- outreach package (4:00) — **done** ✓ (SWFL prospect list + 3-touch Spark sequence + tracker in content/outreach/; DRAFT, no sends until Jack approves — not tonight's problem)

## Timeline — box open → go headless (~3.5 h + key hunt)

**T-0 (before/while unboxing) — keys, on the laptop.** Paste all 8 keys into
`~/Documents/studio/.env.local` per the checklist. Then (optional, 1 min) push
the branch. *Everything downstream assumes keys are in before the Phase 3
rsync.*

**T+0:00 — Phase 0: unbox + connect (15 min).** UPS outlet, Ethernet (not
WiFi), monitor + keyboard, power on.

**T+0:15 — Phase 1: macOS setup (~45 min, mostly update waits).** Existing
Apple ID; Siri/Analytics off. Software Update + restart. Enable **Screen
Sharing AND Remote Login**. Sticky-note the mini's IPv4.

**T+1:00 — Phase 2: dev env on the mini (~30 min).** Homebrew; git, node@20,
gh; git identity; `gh auth login`. Grant Terminal Full Disk Access.
**Do NOT clone the repo. Do NOT run bootstrap-day14-os.sh** — rsync brings
everything.

**T+1:30 — Phase 3: laptop side (~30 min + transfer).**
3a keys — should already be done (T-0); verify 8/8 lines present.
3b `MINI_IP=<ip> bash scripts/mini-preflight.sh` — all 8 keys must show ✓.
3c `--handover` — laptop goes passive; marker written.
3d the three rsyncs (studio, businesses, alignmd).

**T+2:00 — Phase 4: mini boot + verify (~20 min).**
`bash ~/Documents/studio/scripts/boot-day14.sh` then
`bash ~/Documents/studio/scripts/mini-verify.sh` → ALL GREEN. Known-going-in:
telegram-poller down since ~May 22 and events-poller never installed on the
laptop — boot on the mini fixes both once keys exist. Heartbeats need ~60s.

**T+2:20 — Phase 5: Claude desktop + always-on (~20 min).** Install, sign in,
Cowork on `~/Documents`, sanity prompt, `pmset` always-on block, lock-screen
password-after-saver off, Claude as Login Item. **Dedup rule:** today's
scheduled tasks finish on the laptop; recreate recurring ones on the mini this
weekend.

**T+2:40 — Phase 6: smoke test + go headless (~20 min).** 2-min one-shot
scheduled task → `cat /tmp/mini-smoke-test.txt`; from laptop: ssh check +
`vnc://<mini-ip>`. Unplug monitor + keyboard. **Mini is the runtime.**

## Rollback

Mini misbehaving → on the mini `launchctl bootout gui/$(id -u)
~/Library/LaunchAgents/com.day14.*.plist`, then on the laptop rsync
`businesses/` back and re-run `boot-day14.sh` (full commands in
MINI-ARRIVAL-KIT.md §Rollback).
