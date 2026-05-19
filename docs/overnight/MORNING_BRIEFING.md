# Morning briefing — 2026-05-16 (Saturday)
> Jack: read this with coffee. Then run today.

## TL;DR
All three overnight tasks completed cleanly. Today's job hasn't changed — buy the mini, run the runbook, run bootstrap, smoke test, then rest. Three runbook edits to apply before you leave the house. Budget is ~$1,190, not $850.

## Today's only job
Pick up Mac mini → follow runbook → run bootstrap → smoke test. Done.

## What changed overnight
- **01 runbook audit (0.85):** runbook is solid but pricing is stale and three URLs/commands need patching. 9 specific edits proposed in `01-runbook-audit.md` §"Recommended runbook edits".
- **02 seed expansion (0.88):** 3 new skills landed (`copy-writer`, `eod-update-writer`, `pricing-decision-helper`) + 2 new agents (`pm-agent`, `qa-agent`). `bootstrap-day14-os.sh` updated to seed all 6 skills + 3 agents. Verified on disk.
- **03 comms pack (0.90):** all drafts ready — 5 Resend templates, 3 Stripe Payment Link blocks, Cal.com setup, 4 Twilio SMS, 3 warm DMs. Not wired anywhere. Monday's job.

## ⚠️ Critical edits to the runbook before you walk into Apple
1. **Reserve the mini in the Apple Store iPhone app FIRST.** M4 / 24GB / 512GB is build-to-order at many stores. If "Pick up: Today" at Coconut Point doesn't show, order online for next-day delivery and run the runbook Sunday — don't walk up cold on a Saturday.
2. **Budget is $1,190, not $850.** Mac mini 24GB/512GB is $999 (256GB base was discontinued May 1). APC BR1000MS is $172 on Amazon, not $130. Don't flinch at the register.
3. **Change `claude.ai/download` → `claude.com/download`** in the runbook before you start Hour 3. The `.ai` URL may 403.

## Top 3 things to look at first
1. Apple Store app on iPhone — configure M4/24/512, check "Pick up: Today" at **Apple Coconut Point** (10am–8pm Saturday, 23151 Fashion Drive, Estero). Reserve it. ~35 min drive via I-75.
2. Open `01-runbook-audit.md` and apply Edits 1–9 to `day14-mac-mini-runbook.md`. Five minutes of find/replace. Most important: Edit 5 (add `xcode-select --install` BEFORE the Homebrew block — otherwise Homebrew pops a blocking GUI dialog mid-script).
3. Skim `03-customer-comms-pack.md` §"What's next for Jack" — it's the Monday wire-up order. Nothing to do today, but file it.

## Decisions waiting on Jack
None. No `QUESTIONS_FOR_MORNING.md` was written — every overnight task completed without a blocker.

## What I couldn't finish and why
1. Couldn't verify live in-store inventory at Coconut Point — Apple's cart API isn't on the sandbox egress allowlist. That's why C1 is "reserve via the iPhone app", not "I confirmed they have one."
2. Heads-up on macOS Tahoe 26: there's a documented "Screen Sharing connects to black screen" bug after display sleep. If you hit it, SSH in and run `caffeinate -du -t 5` to wake the display. Or set `displaysleep 0` (10W idle, rounding error). See audit §S1.
3. Tahoe is a major-version jump from what the runbook was written against (Sequoia 15). All `pmset` flags verified working; flagging only so you're not surprised by `macOS 26` on the About screen.

## Recommended sequence for the next 12 hours
- **8:00 AM** — coffee + read this briefing
- **8:15 AM** — reserve mini in Apple Store iPhone app; apply 9 runbook edits
- **9:25 AM** — leave for Coconut Point (Apple opens 10:00 sharp)
- **10:00 AM** — walk in, pick up reserved mini, drive home
- **10:30 AM** — back home, unbox, start runbook
- **12:30 PM** — runbook done, run `bash ~/Documents/studio/scripts/bootstrap-day14-os.sh`, then day1 playbook
- **1:30 PM** — smoke test passes, mini is operational, headless via Screen Sharing
- **rest of day** — rest. Don't start Week 1 work today.
