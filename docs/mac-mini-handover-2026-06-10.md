# Mac mini handover — 2026-06-10 delta

> Companion to `day14-mac-mini-runbook.md` (hardware + macOS + dev env —
> still accurate, follow it first) and `day14-mac-mini-day1-playbook.md`.
> This doc covers what changed since those were written: the live data
> handover, env keys, and the one rule that prevents chaos.

## The one rule

**Exactly one machine runs the Day14 runtime at a time.** The runtime =
the `com.day14.*` LaunchAgents + the `~/Documents/businesses/` state they
read and write (dossiers, work-register, telegram outbox, heartbeats,
operator-todos). If both machines run pollers against diverged copies,
you get duplicate Telegram processing and a forked audit trail.

The laptop hands over; the mini takes over. The laptop keeps dev work.

## What moves (and how)

| What | How | Why not git |
|---|---|---|
| `~/Documents/studio` | `rsync` from laptop (NOT `gh repo clone`) | local commits (2e69357 security middleware) are unpushed; `.env.local` is gitignored; node_modules needs fresh `npm install` on the mini anyway (excluded from rsync) |
| `~/Documents/businesses` | `rsync` from laptop | live state, never in git |
| `~/Documents/alignmd` | `rsync` from laptop | separate project, has its own pending migrations |
| `.env.local` keys | comes along inside the studio rsync | — |
| LaunchAgents | re-install on mini via `scripts/install-*.sh` / `boot-day14.sh` | plists hardcode `$HOME` paths; never copy plists between machines |

## Tonight's sequence (after the runbook's Hour 1–2)

1. **On the mini:** finish runbook Hours 1–2 (macOS, Ethernet, Screen
   Sharing + Remote Login ON, Homebrew, git, node, gh). Note the IP.
2. **On the laptop:** `bash ~/Documents/studio/scripts/mini-preflight.sh`
   — inventories loaded agents, checks env keys, sizes the transfer, and
   prints the exact rsync commands with the mini's IP filled in.
3. **On the laptop:** `bash scripts/mini-preflight.sh --handover`
   — stops every loaded `com.day14.*` agent and writes a HANDOVER marker
   into `businesses/_shared/`. From this moment the laptop is passive.
4. **On the laptop:** run the three rsync commands preflight printed.
5. **On the mini:** `bash ~/Documents/studio/scripts/boot-day14.sh`
   (installs deps, regenerates registry, loads LaunchAgents, starts dev
   server, runs E2E).
6. **On the mini:** `bash ~/Documents/studio/scripts/mini-verify.sh`
   — single green/red readout. Green = the mini is the runtime.
7. **On the mini:** runbook Hour 3 (Claude desktop + Cowork, mount
   `~/Documents`) + always-on `pmset` settings + Login Item.
8. Day-1 playbook prompts, then go headless.

## Rollback

If the mini misbehaves: stop its agents
(`launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.day14.*.plist`),
rsync `businesses/` back to the laptop, re-run `boot-day14.sh` on the
laptop. The HANDOVER marker records which machine owned the runtime when.

## Known-broken going in (don't debug these on the mini at 11pm)

- `.env.local` has only `VERCEL_OIDC_TOKEN` + `GEMINI_API_KEY`. All
  webhooks 500 until the 7 service keys + `ADMIN_PASSWORD` are added
  (jack-tap todo-95). The mini setup is the natural moment to do this.
- telegram-poller has been down since ~May 22; events-poller never
  installed. `boot-day14.sh` on the mini fixes both — after keys exist.
- day14.us prod still serves old main until todo-94 (merge + push).
- E2E currently fails 3/7 for the env-key reason, not a code reason.

## Mini-specific gotchas

- **Don't sign into the mini's Cowork with scheduled tasks running on
  the laptop's Cowork too** — same dedup rule as pollers. Move the
  scheduled-task center of gravity to the mini once it's stable.
- The laptop's Claude app keeps THIS session's scheduled tasks
  (outreach prep, launch gate, outreach package). Let them finish today;
  recreate the recurring ones on the mini this weekend.
- Screen Sharing from laptop: Finder → Go → Connect to Server →
  `vnc://<mini-ip>`.
