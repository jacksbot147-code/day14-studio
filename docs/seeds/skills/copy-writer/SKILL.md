---
name: copy-writer
description: Day14's general customer-facing copy skill. Use for any short surface a customer or end-user reads — landing page sections, headlines, button text, navigation labels, error messages, empty states, toast notifications, transactional email subject lines, SMS one-liners. Always invokes day14-voice for tone. Not for long-form blog posts (use blog-post-writer) or EOD customer emails (use eod-update-writer). Outputs are tested against the calibration rules below before being returned.
triggers:
  - "headline"
  - "CTA"
  - "button text"
  - "error message"
  - "empty state"
  - "tagline"
  - "subhead"
  - "tooltip"
  - "placeholder text"
  - "nav label"
  - "marketing copy"
  - "landing page copy"
  - "section copy"
---

# copy-writer

> Short-form surface copy. The one-line stuff that's everywhere and
> easy to mail in. Mailing it in is how a site starts to sound like
> every other Squarespace.

## Always invoke day14-voice first

Before producing any output, load the `day14-voice` skill. Every rule
in this file is downstream of those voice rules. If a rule here ever
conflicts with day14-voice, day14-voice wins.

## Surface-specific rules

### Headlines (h1, h2, hero text)

- **Sentence case.** Never Title Case. `Real platforms, owned by you.`
  Not `Real Platforms, Owned By You.`
- **8 words max.** If you can't say it in 8, the idea isn't sharp yet.
  Cut adjectives first, then verbs, then articles.
- **Make a claim, not a category.** "14 days flat" beats "fast delivery."
  "Owned, not rented" beats "you keep the code."
- **No subjects implied by the brand.** "Day14 helps you grow" is two
  rules broken (royal voice + buzzword). Strip the subject if it's
  obviously Day14: "Built in 14 days. Owned by you."
- **Punctuation: period or nothing.** No question-mark headlines unless
  the question is genuinely the move ("Why pay rent on your own site?").
  Never an exclamation.

Good:

> Real platforms. Two weeks. Done.
> Built by an operator, not an agency.
> Cancel any day before launch. Pay nothing.

Bad:

> Empowering Small Businesses To Unlock Their Digital Potential
> (Title Case, buzzwords, generic claim, 9 words)
> We Make Beautiful Websites Fast!
> (royal we, exclamation, vague)

### Subheads + section intros

- **18 words max.** A subhead is a one-breath sentence.
- **Make the headline concrete.** If the h1 is the claim, the subhead is
  the proof. "Live in 14 days or your deposit refunds" works because the
  proof structure is named.
- **One sentence.** Period.

### CTAs (button text, link text)

- **Verb first, present tense, no period.** `Book a call.` is wrong
  (period). `Book a call` is right.
- **3 words max for primary CTAs.** `Book a call`. `Start your build`.
  `See the demo`.
- **5 words max for secondary CTAs.** Used for "Read the case study"
  type links.
- **No "click here," ever.** Name the destination: "See pricing,"
  "Read the SOW."
- **No "submit."** Never `Submit`. Always name the action: `Send message`,
  `Start checkout`, `Save changes`.
- **No "learn more."** Replace with the actual thing learned: "See
  Portal features," "Read how it works."
- **Match the voice register of the page.** A hero CTA can be cocky
  ("Take a look"); a checkout CTA is plain ("Pay $1,250 deposit").

Good:

> Book a call
> See the demo
> Pay $1,250 deposit
> Read the case study

Bad:

> Submit
> Click Here To Learn More!
> GET STARTED NOW →

### Nav labels

- **One word ideal, two max.** `Pricing`, `Case studies`, `About`.
- **Lowercase the menu visually, but write sentence case in code.**
  CSS handles the case transform.
- **No nesting beyond one level.** If you need a third level, the
  IA is wrong, not the copy.

### Error messages

- **Never start with "Oops."** Never "Whoops," "Uh oh," "Something
  went wrong" without specifics, or any cutesy framing.
- **Name what happened in plain terms.** `That email's already in
  use.` Not `An error has occurred.`
- **Name the next action.** `Try a different email, or log in instead.`
- **Never blame the user, never use "you."** `That password didn't
  match.` Not `You typed the wrong password.`
- **No technical leakage in customer surfaces.** `Something on our end
  glitched — try again in a minute.` Not `Error 500: Internal Server
  Error.` (Log the real error to Supabase events for the operator.)
- **Two sentences max.**

Good:

> That email's already on the list. Log in instead?
> The deposit didn't go through. Try the card again, or use Apple Pay.
> The booking link expired. Pick a new time.

Bad:

> Oops! Something went wrong. Please try again later or contact support.
> Error: ECONNREFUSED 127.0.0.1:5432
> You entered an invalid email address. Please correct your input.

### Empty states

- **Name the state plainly, then suggest the next action.** Two beats.
- **The next action is a CTA.** Always link or button, never just text.
- **No "you have no..." framing.** `No customers yet` beats `You have
  no customers yet.`
- **One sentence + one CTA. That's the whole component.**

Good:

> No customers yet. [Add your first customer]
> No invoices to show. [Send your first invoice]
> Nothing in the inbox. New messages land here as customers reply.

Bad:

> Hi there! You haven't created any customers yet. Don't worry — getting
> started is easy! Just click the button below to create your first one.
> [Get Started]

### Toast notifications + transactional one-liners

- **Past tense, ≤6 words.** `Customer saved.` `Invoice sent.`
  `Booking confirmed.`
- **No emoji unless customer-brand defaults to emoji.** Day14 itself
  defaults to no emoji.
- **Errors as toasts follow the error-message rules above.**

### Email subject lines (transactional, not marketing)

- **Lowercase. Specific. ≤7 words.**
- **Name the artifact, not the action.** `Your day-2 build update`
  beats `Update on your project`.
- **No "RE:" or "FW:" stuffing.** Don't fake a thread.
- **No emoji.** No `📦`. No `✨`.

Good:

> Your day-2 build update
> Preview is live: acme.day14.dev
> Deposit received — kickoff Monday

Bad:

> 🚀 Exciting Update About Your New Website! 🎉
> RE: Your project status (week 2)
> A quick check-in!

### SMS one-liners

- See the day14-voice SMS section. 6–12 words, period, no emoji unless
  the customer used one first.

### Placeholder text + tooltips

- **Placeholders show the format, not instructions.**
  Good: `you@business.com`
  Bad: `Please enter your email address`
- **Tooltips are one sentence.** Optional period.

## The calibration tests

Before returning any copy, run these passes. Cut anything that fails.

1. **Sentence-aloud test.** Read it out loud. If you stumble, rewrite.
   Customer reads everything in their head — your sentence has to work
   without breath marks.
2. **Buzzword sweep.** Search your output for: synergy, leverage,
   seamless, frictionless, robust, scalable, holistic, end-to-end,
   cutting-edge, world-class, premium, best-in-class, innovative,
   empower, unlock, transform, journey, solution, ecosystem. Any hit,
   rewrite.
3. **"Would Jack say this to a friend at a bar?"** If no, rewrite. If
   still no, delete.
4. **Length pass.** Headline ≤8 words. Subhead ≤18 words. CTA ≤3
   (primary) or ≤5 (secondary). Error ≤2 sentences. Empty state 1
   sentence + 1 CTA.
5. **Apostrophe + quote escape pass.** If output is going into JSX,
   all `'` → `&rsquo;`, `"` → `&ldquo;`/`&rdquo;`. (See SCHEDULED_TASK_CONTEXT.md.)

## When generating variants

If asked for "3 options" or similar, return them as a numbered list,
shortest first, no commentary between them. Let Jack pick. Don't write
"Here are some options I came up with!" — just the list.

## What this skill doesn't do

- **Long-form posts.** Use blog-post-writer (Pack 4).
- **EOD customer emails.** Use eod-update-writer.
- **Cold outreach DMs.** Use cold-dm-drafter (Pack 8, when built).
- **Customer business names, taglines, slogans.** Those live in
  brand-extractor (Pack 3). This skill is Day14's copy, not the
  customer's brand.

## Why this skill exists

Most of a site is short copy — a button, a heading, a 404 page. The
temptation is to use the same Squarespace placeholders everyone else
does. Each of those defaults is a small unit of "this is a template"
signal to a prospect. Stack a hundred of them and the operator
positioning evaporates. This skill keeps every surface, no matter how
small, in Jack's voice.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('copy-writer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'copy-writer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
