---
name: eod-update-writer
description: Writes the daily one-paragraph end-of-day status email Day14 sends each active customer during their build window. Invoke at 5pm ET on weekdays for every customer with status `building`, and any time Jack asks for "today's update" or "EOD draft." Output is one paragraph, ≤75 words, in Jack's voice, closing with what tomorrow brings. Always passes through day14-voice before send.
triggers:
  - "EOD"
  - "end of day"
  - "daily update"
  - "today's update"
  - "status email"
  - "5pm update"
  - "draft an update"
---

# eod-update-writer

> One paragraph a day. The customer should be able to read it standing
> at a job site between calls. If they have to scroll, you wrote too
> much.

## When to invoke

- Automatic: 5:00 PM ET, weekdays, for every customer row where
  `customers.status = 'building'`.
- Manual: Jack asks for "today's EOD" or "draft an update for Acme."
- Pre-launch: replace with the launch-day note (a different beat).
- Post-launch: NOT this skill — the monthly-status note is its own thing.

Do NOT invoke for prospects, paused customers, or customers in
`intake-pending` status.

## The contract

Every EOD update has exactly four moves, in this order:

1. **What shipped today** — one sentence, concrete nouns.
2. **The preview URL** — always include it, even if it didn't change.
3. **What ships tomorrow** — one sentence, named.
4. **The open door** — invite the customer to flag anything off.

Then the signature. Always:

  *— Jack*
  *Day14*

## Hard rules

- **75 words max.** Including the signature. If you're over, cut.
- **One paragraph.** No bullet lists. No headings. Customer is on phone.
- **Past tense for today, future tense for tomorrow.** Never "we're
  working on" — say "shipped" or "ships."
- **Specific nouns, not categories.** "Stripe checkout" beats "payment
  setup." "the about page" beats "content work."
- **No apologies for things that didn't go wrong.** Don't write "sorry
  for the delay" if there was no delay. Don't write "thanks for your
  patience" — they signed an SOW, not a hostage note.
- **No filler openers.** Skip "Hi {{name}}", "Hope your day's going
  well," "Quick update." Open with the verb: "Shipped...", "Pushed...",
  "Wired up..."
- **No marketing voice.** This is a status report from your operator,
  not a press release. No "excited to share."
- **One link only — the preview URL.** Don't link to GitHub, the
  build-log dashboard, or a Loom unless Jack explicitly added one.
- **Always invokes day14-voice** before producing the final text.
  Run the calibration test at the end of day14-voice.

## Good examples

### Day 2 — Splash Jacks Pools (Platform build)

> Shipped the customer portal login + the route-tracking screen for
> your techs. Preview is live at splashjackspools.day14.dev — tap the
> login at the top, magic-link goes to your gmail. Tomorrow: the photo
> watermark pipeline and the first city LP for Cape Coral. Anything
> looks wrong, text me.
>
> *— Jack*
> *Day14*

(54 words. Hits all four moves.)

### Day 6 — Casamoré (Site build)

> Pushed the new hero photos you sent and rebuilt the FAQ section
> with your real questions from the intake. Preview's at
> casamore.day14.dev. Tomorrow: the events grid + the booking form
> wires into Cal.com. Tap around, flag anything that feels off-brand.
>
> *— Jack*
> *Day14*

(46 words.)

### Day 11 — Buildbridge (Platform, in late polish)

> Wired the Storm Mode toggle into the admin app and ran QA across
> all 14 routes. Preview is at buildbridge.day14.dev. Tomorrow:
> Lighthouse pass + final copy edits on the contractor onboarding.
> We're on track for Friday launch.
>
> *— Jack*
> *Day14*

(42 words. The "we're on track" closer replaces the "anything off"
opener — fine on the late days, when launch is the news.)

## Bad examples — and what's wrong

### Bad — apologizing for nothing

> Hi Tom! Hope your week's going great. Just wanted to send a quick
> update — sorry it's late! Today we worked on a bunch of stuff
> including the home page, the about page, and we made some
> progress on the portal. We're really excited about how it's
> coming together! Tomorrow we'll keep going. Please don't hesitate
> to reach out if you have any questions at all!!
>
> Best regards,
> The Day14 Team

Problems: filler opener, apology for nothing, vague nouns ("stuff,"
"progress"), royal "we" (there is no team), exclamation points,
fake-warm closer, agency signature. Every voice rule broken.

### Bad — too long, too proud

> Today was a big day on your build. I started the morning by
> reviewing the brand guidelines you sent over and then I dove into
> the hero section, which took longer than expected because I wanted
> to nail the typography. Then I moved on to the services grid...

Problems: hour-by-hour diary, "look how hard I worked" framing, no
preview URL, no tomorrow plan. Customer doesn't want your timesheet.

### Bad — missing the open door

> Shipped the booking flow. Preview at acme.day14.dev. Tomorrow:
> services page. — Jack

Problems: technically passes the rules but slams the door. The
fourth move ("tell me if anything looks off") is non-negotiable —
it's how feedback gets surfaced before launch instead of after.

## When today was nothing-shipped

Sometimes a day produces no customer-visible change (cleanup, infra,
dependency work). Still send the update. Be honest, keep it short:

> Spent today on cleanup — refactored the Supabase queries so the
> portal pages load in <500ms across the board. No visible change on
> the preview. Tomorrow: customer onboarding emails + the invoice
> templates. Holler if you've got questions on either.
>
> *— Jack*
> *Day14*

## When something actually went wrong

If a real delay or bug happened, name it once, propose the fix, move on.
Don't grovel. Don't over-explain. The customer trusts an operator who
names problems quickly.

> Hit a snag on the Stripe webhook — went down a wrong path for
> about two hours, fixed it this afternoon. Preview's fully working
> again at acme.day14.dev. Tomorrow: the services page and the
> first round of SEO city LPs. Tell me if checkout looks off.
>
> *— Jack*
> *Day14*

## Output contract

Return three blocks, in this order:

```
SUBJECT: Day {{N}} — {{customer business name}}
BODY:
{{the one-paragraph update}}

— Jack
Day14
```

Subject line is the build day number + business name. No emoji, no
exclamation, no "update" or "status" filler words.

## Why this skill matters

Customers panic when they don't hear from their builder. The EOD
update is the single highest-leverage customer-trust move Day14
makes — five minutes of writing per customer per day, and they
sleep well, refer friends, and don't text Jack at 11pm asking
"how's it going."
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('eod-update-writer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'eod-update-writer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
