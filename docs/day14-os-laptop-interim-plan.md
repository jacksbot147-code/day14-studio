# Day14 OS — laptop interim plan

> Mac mini ships Jun 10–17 (~25 days out). The laptop is the runtime
> until then. This document is the bridge plan.

---

## Reframe: 25 days is a gift, not a delay

Three concrete wins from waiting:

1. **Field-test on cheap iron.** Bootstrap, skills, agent prompts,
   dossier template, build-agent — all of it gets tested against
   reality before the mini ever boots. When the mini arrives, we
   drop in v3, not v1.
2. **No data loss at cutover.** Anything that runs on the laptop
   writes to `~/Documents/businesses/` which sync to Vercel/GitHub/
   Supabase. Cutover = `rsync` plus reopen Cowork. Zero state migration.
3. **Customer #1 might happen first.** Per Council 0001, the next
   2 weeks are about acquisition. If a real customer pays a deposit
   before Jun 10, the build runs on the laptop. That's a bigger win
   than waiting for the mini.

---

## What changes vs. the original plan

| Original | Now |
|---|---|
| Mini = runtime starting May 17 | Laptop = runtime through Jun 9 |
| 24/7 agent fleet | Daytime-only Cowork sessions (laptop sleeps) |
| Cron-driven daily ops loop | Manual "run-when-Cowork-is-open" + scheduled tasks that queue while sleeping |
| Headless via Screen Sharing | You're at the laptop already |

Everything else stays. Skills, council-decision, build-agent prompt,
empire pattern, Supabase schema, customer dossier — all run anywhere.

---

## What runs FINE on the laptop right now

- Bootstrap the empire (`~/Documents/businesses/_shared/`)
- Deploy the SQL schema to Supabase
- Wire the three Vercel webhook routes (stripe / intake / inbound) —
  these run on Vercel, not your laptop, so they're always available
- Council runs (already worked; entry 0001 is logged)
- Skill invocations
- Build-agent prompt against a fake customer dossier
- Scheduled overnight tasks (already worked the last 6 hours)
- Customer #1 outreach + 14-day build

## What WAITS for the mini

- True 24/7 background work (e.g. a 3 AM scheduled task fires *only*
  if Cowork happens to be open; otherwise queues until next open)
- Headless operation away from your desk
- Always-on Screen Sharing access from your phone
- Tailscale + remote operations

None of these are blocking customer #1.

---

## 25-day agenda

### Week 1 — May 16–22 (this week)

- **Today (Sat 5/16):** Run the bootstrap on the laptop. Verify with
  sanity-check. Read this morning's overnight outputs (`docs/overnight/`).
  Start the skill harvest.
- **Sun 5/17:** Record the 5-min Splash Jacks case study video
  (per Council 0001). Don't edit, don't polish.
- **Mon 5/18:** Post the video three places (one pool-service FB
  group, one SWFL business FB group, one founder Discord). Send 5
  personal DMs from the Executor's list in Council 0001.
- **Tue 5/19 – Wed 5/20:** Spin up the Supabase project for Day14 OS.
  Paste schema. Verify all 5 tables created. Write a smoke-test that
  inserts a fake customer row and reads it back.
- **Thu 5/21:** Build the three Vercel webhook routes (stripe,
  intake, inbound) at `day14.us/api/webhooks/*`. Test mode only.
- **Fri 5/22:** Run a full fake-customer end-to-end through the
  dossier: deposit (test) → intake → brand.json → preview URL →
  approval → "launch."

### Week 2 — May 23–29

- Whichever channel won the May 19 test, double down. Drop the other.
- Reach out to your existing warm network (Outsider advisor's note).
- If anyone pays a deposit: customer #1 build kicks off. Real work.
- If nobody pays yet: write 2 more case study videos (Casamoré, Buildbridge).

### Week 3 — May 30 – Jun 5

- If customer #1 is mid-build, focus is the build (don't take #2 yet).
- If still hunting: pricing experiments per Council recommendation.
  Consider a $999 stripped "Site Lite" intro tier to drop the friction.
- Skill harvest pass #2 — what did weeks 1-2 reveal that we missed?

### Week 4 — Jun 6 – Jun 9

- Polish. Final laptop-side tests. Stage `rsync` plan for mini cutover.
- Document any laptop-specific quirks that need different treatment on mini.

### Cutover — Jun 10–17

- Mini arrives. Follow `day14-mac-mini-runbook.md`.
- Run `bootstrap-day14-os.sh` on the mini.
- `rsync -av ~/Documents/businesses/ jcboppington@mac-mini-IP:~/Documents/businesses/`
- Verify with sanity-check.
- Move scheduled tasks from laptop Cowork to mini Cowork.
- Laptop returns to "developer machine" role; mini becomes runtime.

---

## Right now (next 10 minutes)

Run this in Terminal on your laptop:

```bash
# 1. Bootstrap the empire on the laptop
bash ~/Documents/studio/scripts/bootstrap-day14-os.sh

# 2. Verify everything landed
bash ~/Documents/studio/scripts/sanity-check-day14-os.sh

# 3. (Optional) read the morning briefing once it generates at 7:30 AM
cat ~/Documents/studio/docs/overnight/MORNING_BRIEFING.md
```

If sanity-check is all green, the empire is live on your laptop.
Then fire the skill harvest in Cowork using
`~/Documents/studio/docs/skill-harvest-prompt.md`.

---

## Updated docs that reference "tomorrow is mini day"

These three docs assumed the mini was 24 hours out. They're now
~25 days out but the content is still correct — just delayed:

- `day14-mac-mini-runbook.md` — exact same runbook, just executed
  ~Jun 10 instead of May 16
- `day14-mac-mini-day1-playbook.md` — same playbook, same day-of-mini
- `day14-os-vision.md` — "always-on Mac mini" is true after Jun 10;
  before then, substitute "always-on laptop with Cowork open"

No edits to those docs needed unless a specific instruction breaks.
This file is the only one with the new 25-day calendar.
