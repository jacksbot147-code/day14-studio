# Today's Execution Checklist — 2026-06-09
# Open this file first when you sit down. Work top to bottom.
# Every action is paste-and-send. No drafting required.

---

## 0. Unblock (5 min) — do this first

- [ ] **Push the redesign branch** so Vercel preview catches up:
  ```
  cd ~/Documents/studio && git push origin redesign/apple-base44-2026-06-03
  ```
  If auth fails again: see `drafts/PUSH-FALLBACK-2026-06-09.md` for the PAT recipe.

- [ ] **Verify the Cal.com link works.** Open `https://cal.com/day14/intro` in your browser. If it 404s, every Book scope call CTA is broken — text me and I'll set up the mailto fallback chain.

- [ ] **Read `drafts/OVERNIGHT-BRIEFING-2026-06-08.md`** (or 06-09 if newer). T10 produced it overnight. Tells you exactly what landed.

---

## 1. Send the X-thread (10 min)

- [ ] Open `drafts/X-THREAD-SEND-READY-2026-06-09.md` in a separate tab
- [ ] Open x.com, click compose
- [ ] Copy Tweet 1 → paste → click "Add tweet" → paste Tweet 2 → repeat for all 8
- [ ] Hit "Post all"
- [ ] When live, pin to top of profile

**Why now:** Wed lunchtime EDT is peak builder scroll. Don't over-edit. Send.

---

## 2. Text Angela (3 min)

- [ ] Open Messages on your Mac (it syncs with iPhone)
- [ ] Copy the message from `drafts/ANGELA-SMS-DRAFT-2026-06-09.md`
- [ ] Paste into a new thread to her phone number
- [ ] Send

**Why now:** Her site is staged and ready. The only blockers are bio photo + phone + email + pricing. The sooner she sends, the sooner she's live.

---

## 3. Record the Loom (30 min, including setup + one take)

- [ ] Open `drafts/LOOM-SCRIPT-2026-06-03.md`
- [ ] Open day14.us/admin in a browser tab (your live admin)
- [ ] Hit record on Loom (camera bubble + screen)
- [ ] Read the cold open verbatim (30 sec)
- [ ] Walk through the beats (3 min)
- [ ] Close with the CTA (15 sec)
- [ ] Stop recording, copy the share URL
- [ ] In `src/app/page.tsx`, find `const LOOM_EMBED_URL = "";` and paste the URL inside the quotes
- [ ] Commit + push:
  ```
  cd ~/Documents/studio && git add src/app/page.tsx && git commit -m "loom: live demo URL wired" && git push origin redesign/apple-base44-2026-06-03
  ```

**Why now:** Coffee makes the take better. One take only. Don't over-script — script is for confidence, not memorization.

---

## 4. Publish the manifesto (30 min)

- [ ] Open `drafts/MANIFESTO-SUBSTACK-READY-2026-06-09.md`
- [ ] Open Substack (or your blog) → New post
- [ ] Copy title → paste
- [ ] Copy subtitle → paste
- [ ] Copy body → paste
- [ ] Publish
- [ ] Copy the published URL
- [ ] Reply to your own Tweet 8 from earlier with: "The longer version: [paste URL]" → compounds engagement on the same thread

**Why now:** Manifesto + thread reinforce each other. Same-day publish is the multiplier.

---

## 5. Inbox triage block (60 min)

Open `https://day14.us/admin/inbox` (or wherever your inbox UI lives). Process in this order:

- [ ] AlignMD hero image + landing headline (2 items, ~15 min)
- [ ] Day14 Realty hero image + landing headline (2 items, ~15 min)
- [ ] Day14: pick hero image for /work-with-us, pick Newsletter #1 subject (2 items, ~15 min)
- [ ] Top 3 life-loophole items if you have time

That's 9-12 items in an hour. Cuts the awaiting-jack queue by 25-30%.

---

## 6. Merge decision (5 min)

After all the above:

- [ ] Open the Vercel preview one more time, walk top to bottom
- [ ] If it feels right, merge to main:
  ```
  cd ~/Documents/studio && git checkout main && git pull && git merge redesign/apple-base44-2026-06-03 && git push origin main
  ```
- [ ] day14.us reflects everything within 90 seconds

---

## 7. Wrap (5 min)

- [ ] Eat something
- [ ] Send Angela a follow-up if she hasn't replied: "Still need that photo + phone whenever you have a sec — site is ready to go live the moment you send them"
- [ ] Set tomorrow's calendar block for AlignMD strategy work

---

## What's NOT on today's list (deliberately deferred)

- AlignMD migrations 0011-0013 — post-Sunday
- launchctl ops — post-Sunday  
- Referral mechanism for Spark tier — post-Sunday signal lands
- AlignMD Phase 10 redesign strategy — post-Sunday
- Per-tenant creative-direction doc reviews — Monday's brand-animator audit handles

---

## If something breaks

- **Push auth fails:** `drafts/PUSH-FALLBACK-2026-06-09.md`
- **Cal.com link 404s:** I set up mailto fallback in next session
- **Loom recording flops:** ship the manifesto without the embedded video; a recorded Loom from your phone uploaded raw works too
- **X-thread gets no engagement:** don't take it personally — try the alternate hook variants in `drafts/X-THREAD-SEND-READY-2026-06-09.md`

Sunday at 14:00 EDT you read the signal. Until then, ship.
