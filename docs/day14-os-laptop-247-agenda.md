# Day14 OS — laptop 24/7 agenda (May 16 → Jun 9)

> Mac mini is 25 days out. The laptop is the always-on runtime
> until then. This doc translates everything that was scheduled for
> the mini into recurring tasks on the laptop, plus the macOS settings
> that keep the laptop alive 24/7.

---

## Part 1 — macOS settings to make the laptop always-on

**These are one-time setup. Run in Terminal.**

```bash
# Never sleep the system (plugged in)
sudo pmset -c sleep 0
sudo pmset -c disksleep 0
sudo pmset -c displaysleep 10    # display off after 10 min — OK, system stays awake
sudo pmset -c powernap 1         # allow background work while display is off
sudo pmset -c tcpkeepalive 1     # keep network alive

# On battery too (in case of brief outages)
sudo pmset -b sleep 0
sudo pmset -b powernap 1
```

Then in System Settings:

- **General → Login Items** → add **Claude** so it auto-opens on reboot
- **Battery → Options** → set "Slightly dim the display on battery" → ON
- **Lock Screen** → "Turn display off on power adapter when inactive" → "10 minutes"
- **Lock Screen** → "Require password" → "Immediately" → change to "Never" (so an auto-reboot brings you back to desktop, Claude relaunches, scheduled tasks resume)

**Lid behavior:** keep the laptop lid **open**. macOS sleeps on lid-close
unless in clamshell mode (external display + power + keyboard
connected). The simplest setup is just lid-open, screen-asleep. The
fan will run a bit more — that's the cost.

**UPS recommendation:** Plug the laptop's charger into a small UPS
(~$60 APC BE600M1). Florida thunderstorms WILL kill your runtime
otherwise. Skip the larger UPS until the mini arrives.

---

## Part 2 — Recurring scheduled tasks (translated from mini ops loop)

The mini was going to run 5 daily tasks. Same cadence on the laptop:

| Time (ET) | Cadence | Task | Purpose (laptop-interim) |
|---|---|---|---|
| 09:00 | Mon–Fri | `daily-kickoff` | Read MASTER_LOG + open Slack/email, surface today's 3 priorities |
| 17:00 | Mon–Fri | `daily-eod` | What shipped today, what's pending, blockers for tomorrow |
| 23:00 | Every day | `nightly-day14-polish` | Lighthouse + link-health on day14-studio.vercel.app |
| 20:00 | Sunday | `weekly-council-review` | Re-read council-log, note which calls aged well |
| 22:00 | Sunday | `weekly-skill-harvest` | Re-run skill-harvest-prompt against the week's new evidence |

I'll schedule these below. Each runs in a fresh Cowork session,
follows the `scheduled-task-prompt-author` skill conventions, and
appends to `MASTER_LOG.md` on completion.

---

## Part 3 — Event-driven flows (no schedule; fires on trigger)

These don't need a cron — they need a webhook. We'll wire them in
Week 1's Supabase + Vercel work, but the patterns are:

| Trigger | Skill invoked | Output |
|---|---|---|
| Stripe `payment_intent.succeeded` | `customer-build-day-1-bootstrap` | Dossier created, build queued, approval card drafted |
| Resend inbound email | `inbound-classifier` (TBD) → `eod-update-writer` | Draft reply in dossier 04-feedback.md |
| Intake form submission | `customer-readiness-check` | brand.json populated, kickoff call queued |
| Vercel deploy failure | `nightly-day14-polish` (same skill, manual invoke) | Approval card "deploy failing" |

For customer #1, the first three fire manually — you receive the
email, you tell Cowork "new customer just paid, run the day-1
bootstrap." From customer #2 on, the webhook auto-triggers Cowork.

---

## Part 4 — What I'm parking until the mini arrives

These were mini-only ambitions. Deferred:

- **Twilio voice interface** ("approve the Acme deploy") — works on mini, low-value on laptop
- **Tailscale remote access from phone** — works on laptop too, low priority until mini
- **Wake-on-LAN** — N/A for laptop
- **iCloud→Time Machine backup automation** — laptop is already in iCloud
- **Hardware health monitoring** (CPU temp, fan RPM) — only matters when machine is unattended

When the mini arrives Jun 10–17, the cutover is:
1. Run bootstrap on the mini → empire scaffolded identically
2. `rsync -av ~/Documents/businesses/ jcboppington@mini-IP:~/Documents/businesses/`
3. Recreate the 5 scheduled tasks on mini Cowork (cron expressions transfer 1:1)
4. Disable the 5 on the laptop
5. Mini becomes runtime; laptop reverts to developer machine

---

## Part 5 — Skills still to build for full 24/7 autonomy

These skills are referenced above but don't exist yet. Build order:

1. **`daily-kickoff`** — what the 9 AM morning briefing actually says
2. **`daily-eod`** — what the 5 PM end-of-day report covers
3. **`nightly-polish`** — Lighthouse + link-health + deploy-health pattern
4. **`weekly-council-review`** — the quarterly Council re-read protocol
5. **`inbound-classifier`** — when a Resend email lands, what tag does it get
6. **`approval-card-builder`** — the format for every approval card

Six skills, ~15-25 min each. Total ~2 hrs of focused work. Schedule
this as a Saturday afternoon block or break it across the next 3 days.

---

## Part 6 — What happens TONIGHT

- 7:30 AM morning briefing fires (already scheduled). Reads everything
  overnight, lands at `docs/overnight/MORNING_BRIEFING.md`.
- I'll schedule the 5 recurring tasks below before this session ends.
- You'll see them in the Cowork "Scheduled" panel.
- First one fires Monday 9:00 AM ET (`daily-kickoff`).
- Sunday 8:00 PM ET (`weekly-council-review`) is the first one to
  fire after this is set up.

After today, the laptop should never need your manual touch to start
work. You open Cowork in the morning and read the briefing. The rest
of the day, scheduled tasks fire on time as long as Claude is open
and macOS isn't sleeping.
