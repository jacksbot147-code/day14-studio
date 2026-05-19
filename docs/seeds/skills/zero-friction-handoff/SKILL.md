---
name: zero-friction-handoff
description: When agent work hits a step only Jack can do (account creation, payments, browser logins, third-party dashboards, real signatures), don't just say "you need to do X." Prep everything — staged docs, pre-filled scratchpads, exact URLs in order, copy-paste-ready commands — so when Jack sits down, friction is zero.
triggers:
  - "you need to do this"
  - "blocked on Jack"
  - "Jack tap required"
  - "human handoff"
  - "prep for me"
  - "pull up everything"
---

# zero-friction-handoff

> Agents stop and say "you need to do X". Bad agents leave it at that.
> Great agents make sure when X gets done, it takes 30 seconds because
> everything is staged. This skill is the staging.

## When to invoke

Any time the agent work hits a hand-off that requires Jack's input:

- External account creation (BotFather, Stripe, Vercel, Resend, Cal.com, etc.)
- Real-money operations (Stripe Payment Links, refunds beyond auto-approval, payouts)
- DNS / domain registrar config
- Browser authentication / OAuth flows
- Anything signed (contracts, agreements, NDAs)
- First-time integrations needing setup keys
- Production deploys
- Decisions requiring strategic judgment (pricing, hiring, scope)

## The 4-doc prep pattern

Each handoff produces up to 4 prep docs in `~/Documents/businesses/_shared/founder-ops/`:

### 1. `{topic}-checklist.md` — sequenced action plan
- Top-to-bottom, no thinking required
- Time estimate per step + total
- Exact commands with paths already filled in
- "If something's broken" section at the bottom

### 2. `{topic}-scratchpad.txt` — pre-formatted values
- Empty fields Jack pastes values into
- Pre-formatted env var lines (`KEY=` ready to fill)
- Field names match exactly what the agent code expects later
- Comments explain where each value comes from

### 3. `{topic}-tabs.md` — every URL in order
- Tabs to open in Chrome, ordered by work sequence
- One-line "what to do here" per tab
- Read-only reference tabs separately listed

### 4. `{topic}-guide.md` — step-by-step for the messy parts
- Exact buttons to click, in order
- Required vs optional toggles called out
- Safety rules (don't commit, don't share, etc.) at the bottom
- Verification steps that prove it worked

Not every handoff needs all 4. A 30-second handoff only needs #1.
A multi-service setup needs all 4.

## Hard rules

1. **Never just list things to do.** Either fully prep them or escalate
   that they can't be prepped.
2. **Always include exact commands**, not "run npm install or something."
   Paths absolute, flags filled in.
3. **Always estimate time** at the top of the checklist. Sets expectations.
4. **Always include a "what to verify when done" step.** Otherwise
   Jack doesn't know if it worked.
5. **Never assume Jack remembers a prior session.** Each prep doc
   is self-contained.
6. **Always link to dependencies.** "After this, see {other-doc}.md."
7. **Never include real secrets in prep docs.** Scratchpads have
   empty fields; Jack fills them in himself.
8. **Always save to `_shared/founder-ops/`** so they're easy to find later.

## What "good prep" looks like

Bad:
> "You need to set up the Telegram bot."

Better:
> "Set up the Telegram bot via @BotFather. Add the token to .env.local."

Best (this skill's output):
> "I've staged tomorrow-morning.md with the exact 10-minute flow,
> env-vars-scratchpad.txt with the `TELEGRAM_BOT_TOKEN=` line ready to
> paste into, tabs-to-open.md listing every URL in order, and stripe-
> setup-guide.md for when you're ready for Tier 3. Open
> tomorrow-morning.md first."

## Auto-trigger conditions

This skill should auto-invoke when any of these happen in agent work:

- A `Jack-tap` Telegram card is queued
- A skill returns `jack_tap_required: true`
- The agent says "you need to" or "Jack needs to" in chat
- The agent encounters a TODO in code referencing Jack
- The dispatcher routes to a skill that requires external API setup
- An E2E test fails because of missing env vars

## Output

The prep docs land at:
`~/Documents/businesses/_shared/founder-ops/{topic}-{type}.md`

A final chat message to Jack:
- Lists each prep doc with a 1-line summary
- Suggests which one to open first
- Estimates total time across all docs
- Reminds Jack what's blocked until the handoff is done

## When invoked

- Manually via `/prep {topic}` Telegram command
- Auto-triggered when any agent flow hits a Jack-tap requirement
- During end-of-session cleanup if outstanding handoffs exist
- Inside `morning-briefing-generator` if handoffs are pending

## Failure modes

- **Prep doc gets stale**: include a generated-at timestamp; if older
  than 30 days when Jack opens it, surface a re-prep card
- **Multiple handoffs at once**: aggregate into a single "punch list"
  doc with tiered sections, not 5 separate files
- **Handoff is one-time vs recurring**: distinguish via the prep-doc
  template (`one-time` gets archived after completion; `recurring` stays)

## Logging

`[YYYY-MM-DD HH:MM ET] zero-friction-handoff → topic: {name}, docs_prepped: {N}, est_handoff_minutes: {N}, blocking: {what's blocked}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('zero-friction-handoff', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'zero-friction-handoff', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
