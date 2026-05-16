# Day14 — Day-4 Content Polish

**Date:** 2026-05-15 (daytime task #4 of 5, ~75 min budget)
**Scope:** close out the four content + code issues flagged by the wake-up
report (`00-wakeup-status.md`): competitor pricing fact-check, soften
operator-claims, verify Storm Mode specifics, plumb the contact-form
`message` field, and propagate `brand.chatbot_system_prompt` through
`swap.mjs`.

## Headline

Five issues touched, four real edits applied. Two of the five were
already done by a prior task today — the workers/subscribe.js `message`
plumbing and the swap.mjs wrangler.generated.toml emit both already exist
and look correct on inspection. I added one missing piece (the
`wrangler.generated.toml` line in the Site template's `.gitignore`) and
left the rest of that work alone. The remaining three — pricing,
softeners, Storm Mode — got real edits. Final blog-draft word counts all
still inside the 800–1,200 budget. Zero TODO / Lorem / REPLACE_ME / XXX
/ FIXME hits anywhere in `docs/`.

## 1. Competitor pricing — verified for May 2026

Searched each vendor's current public pricing page plus 1–2 corroborating
2026 review sources. Three of the four prices needed updating; the
plan names for two vendors have changed and the old draft numbers were
mostly stale.

**Jobber Connect — $169/mo (team Connect, 5 users).** Confirmed.
Jobber's 2026 lineup is Core (solo $39, team $89), Connect (solo $119,
team $169 for 5 users), Grow ($349, now per-user pricing extends up to
$599/user/mo at the top of the band). The draft already used the team
Connect number, so I updated the lead-in paragraph to reflect the new
solo Core price ($39, not $69) and clarified that the $169 figure is the
team tier. Source: https://www.getjobber.com/pricing/ and
https://costbench.com/software/field-service-management/jobber/.

**Housecall Pro — $149/mo Essentials (the plan formerly called "Pro").**
Updated. The plan name "Pro" is gone from Housecall Pro's 2026 lineup.
Their tiers are Basic ($59 annual / $79 monthly), Essentials ($149
annual / $189 monthly), and MAX ($299 annual / $329 monthly). I retired
"Housecall Pro Pro at $129/mo" and replaced with "Housecall Pro
Essentials at $149/mo (annual)" + a callout that the typical add-on band
runs $40–$149/mo on top. Source: https://www.housecallpro.com/pricing/
and https://schedulingkit.com/pricing-guides/housecall-pro-pricing.

**GoHighLevel Agency Starter — $97/mo.** Confirmed unchanged. The
$97/mo Agency Starter still exists (3 sub-accounts). I added a callout
in the math section that the SMS / call / email / AI usage fees they
bill separately add $20–$150/mo, which the original draft missed.
Source: https://www.gohighlevel.com/pricing and
https://sawankr.com/courses/go-highlevel/gohighlevel-pricing-2026.

**Squarespace Commerce — replaced by Core at $23/mo.** Updated.
Squarespace rolled out a new four-plan pricing model in early 2026:
Basic ($16), Core ($23), Plus ($39), Advanced ($99). The "Commerce"
plan name is retired. The cheapest plan that removes Squarespace's
transaction fee is now Core at $23/mo (annual). I rewrote the line as
"Squarespace Core at $23/mo + Acuity and extensions → ~$2,000 of fees."
Source: https://www.squarespace.com/pricing and
https://startupowl.com/reviews/squarespace-commerce.

**Pre-publish note added to my mental model (not the post):** pricing in
this post is the part most likely to age badly. Recommend doing a fresh
sweep on these four vendors before each major republish — every one of
them moved naming or numbers between 2024 and 2026.

## 2. Operator-claims in `04-built-by-an-operator.md` — softened where source didn't support

Grepped `~/Documents/splash-jacks-pools/` for each specific claim. One
held up, two didn't.

**"Two numbers on the home screen: revenue this month, jobs scheduled
this week" — NOT confirmed, softened.**
`src/app/admin/page.tsx` actually renders four to six stat cards (MRR,
new customers this week, pool count, visits scheduled this week, visits
completed this week, open quotes) plus a 30-day customer-growth
sparkline and a "Needs attention" alert widget. That's more than two
numbers. Softened to: "A couple of headline numbers up top — MRR, jobs
this week, open quotes — and one 'needs attention' widget. That's it."
Still captures the operator-stripping-things-out point, just truthful.

**"AI chatbot saves 6 calls a week" — NOT confirmed, softened.**
`DAY2_LOG.md` describes the chatbot (GPT-4o-mini, rate-limited, FAQ +
chemistry + pricing context) but nowhere documents a "6 calls a week"
measurement. The number was an editorial flourish. Softened to "Saves
a few calls a week."

**"Daily admin digest at 7am" — CONFIRMED, kept verbatim.**
`src/lib/emails/admin-digest.ts` line 318 literally renders the footer
"Splash Jacks Pools · Daily digest sent at 7am ET. Stop these by
changing OWNER_EMAIL in Vercel env." The cron route at
`src/app/api/cron/admin-digest/route.ts` exists. The blog draft's actual
phrasing was already "One email per morning" (not the more specific
"7am" version the wake-up report flagged), so no edit was needed —
existing prose is accurate and matches the code.

## 3. Storm Mode specifics in `05-the-storm-mode-moat.md` — corrected

Cross-checked the draft against `~/Documents/PORTFOLIO_REPORT.md`. The
report's IP-moat section is explicit: "Multi-county permit-portal
integrations (Buildbridge): **Lee Accela, Collier CityView, Charlotte
ePermitting scraping**." That's three counties, not five.

**Five-county claim — CORRECTED to three.** Replaced the bare list "Lee
County, Collier County, Charlotte County, Sarasota County, Manatee
County" with the actual integration surface: "Lee County runs on Accela,
Collier County on CityView, Charlotte County on its own ePermitting
stack. Three different portals, three different scrape-or-API surfaces,
three different outage windows." The new copy is more specific *and*
more accurate — names the actual permit systems Buildbridge integrates
with, which is more credible to a technical reader than a county
roll-call.

**Also softened the lede:** "every roofing contractor in five counties
is fielding 40 calls" → "every roofing contractor in the region is
fielding 40 calls." Same point, no false number.

**Four-channel notify fan-out — CONFIRMED, kept verbatim.** The
portfolio report describes Buildbridge's Storm Mode flow as "storm
tracker → pre-approved contractor panel → one-tap mobilization →
4-channel notify fan-out" and the IP-moat section adds "NOAA RSS +
active-storm RPC + 4-channel notify + pre-approved contractor panels."
The draft's enumeration — SMS via Twilio, push via FCM, email via
Resend, in-app banner via dashboard — stays.

## 4. workers/subscribe.js `message` field — already plumbed (verified)

The Site template's Worker at
`~/Documents/studio-templates/studio-template-site/workers/subscribe.js`
already implements the fix the wake-up report asked for:

- Parses `message` from the request body (line 61)
- Caps at `MAX_MESSAGE_LENGTH = 4000` chars, returns 400
  `message_too_long` on oversize (lines 40, 66–68)
- Forwards into the MailerLite `fields.message` custom field, but
  *only when the operator actually sent a non-empty message* (lines
  77–81) — so newsletter signups that don't carry a textarea don't
  pollute MailerLite with blank fields
- Surfaces a clear inline comment block (lines 17–36) noting the
  MailerLite "message" custom field must exist before this works

No edit needed. Validation logic still passes — empty message is OK
(skipped), oversize is rejected with a 400, missing email or
misconfigured env still fail correctly. Confidence: high.

## 5. `brand.chatbot_system_prompt` propagation in `swap.mjs` — already wired (verified, .gitignore added)

The Site template's `scripts/swap.mjs` already implements Option A from
the task brief:

- `writeWranglerGenerated(brand)` (lines 228–264) writes a
  `wrangler.generated.toml` at the template root after a successful
  brand swap
- It reads any existing `wrangler.toml`, appends a `[vars]` block with
  `SYSTEM_PROMPT = "..."` (properly TOML-escaped via
  `escapeTomlBasicString`), and emits the combined file
- If `brand.chatbot_system_prompt` is missing or empty it warns and
  skips — the deploy falls back to whatever default the chatbot Worker
  hard-codes
- The deploy flow is now `wrangler deploy --config
  wrangler.generated.toml` — no `wrangler secret put SYSTEM_PROMPT` step
  required

**One thing I added:** the template's `.gitignore` did not previously
list `wrangler.generated.toml`, which meant a non-careful operator could
have accidentally committed their brand-specific system prompt to a
public repo. Added a `wrangler.generated.toml` entry under the
`# Node / Wrangler` block with a comment explaining why it's ignored.
File: `~/Documents/studio-templates/studio-template-site/.gitignore`.

## 6. Final audit

```
grep -rn "TODO" docs/blog-drafts/                  → 0 hits
grep -rn "Lorem\|REPLACE_ME\|XXX\|FIXME" docs/     → 0 hits
```

**Post-edit word counts (target band: 800–1,200):**

| Draft | Words | Δ from overnight | In budget? |
|---|---:|---:|:---:|
| 01-the-14-day-claim.md          |   978 |   +0 | ✓ |
| 02-owned-not-rented.md          | 1,036 |  +30 | ✓ |
| 03-vertical-templates.md        | 1,095 |   +0 | ✓ |
| 04-built-by-an-operator.md      | 1,078 |  +10 | ✓ |
| 05-the-storm-mode-moat.md       | 1,158 |  +10 | ✓ |

All five drafts remain inside budget after edits.

## Files touched this task

- `docs/blog-drafts/02-owned-not-rented.md` — pricing updates (lede +
  five-year math list)
- `docs/blog-drafts/04-built-by-an-operator.md` — softened home-screen
  numbers claim and chatbot-saves-N-calls claim
- `docs/blog-drafts/05-the-storm-mode-moat.md` — five-county → three
  with named permit systems; softened lede
- `studio-templates/studio-template-site/.gitignore` — added
  `wrangler.generated.toml` ignore

## What's left for Jack

Nothing blocking. Two soft recommendations:

- **Pricing has a half-life.** When republishing `02-owned-not-rented.md`
  more than ~90 days from now, re-run the four vendor searches before
  pushing — Jobber, Housecall Pro, and Squarespace all moved plan names
  in the past 12–18 months.
- **Pre-publish smoke test for the Buildbridge claims.** I trusted
  `PORTFOLIO_REPORT.md` for Lee Accela / Collier CityView / Charlotte
  ePermitting. If those integrations have since been rewritten or one
  of them was deprecated, the post will need another touch-up. Worth a
  60-second check against the Buildbridge repo before hitting publish.
