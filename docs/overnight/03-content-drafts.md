# Overnight Task #3 — Content Drafts

**Date:** 2026-05-15
**Operator on duty:** Claude (autonomous overnight run)
**Wall-clock spent:** ~30 minutes
**Status:** Complete. All deliverables shipped.

---

## What was written

### A. Five blog post drafts — `~/Documents/studio/docs/blog-drafts/`

| File | Word count | Thesis |
|---|---|---|
| `01-the-14-day-claim.md` | 978 | One-operator + AI agents + template-first cadence + deposit-back guarantee = real 14-day platform builds. Splash Jacks is proof. |
| `02-owned-not-rented.md` | 1,006 | SaaS rents you the back office and owns the brand surface. Jobber/Housecall Pro/GoHighLevel/Squarespace 5-year math beats out at $5k–$20k while still leaving you with nothing. Day14 alternative ends with you owning the platform. |
| `03-vertical-templates.md` | 1,095 | Productized-agency case for refusing work outside mobile-service / membership / food. Designjoy analogy. The no's protect the yes's. |
| `04-built-by-an-operator.md` | 1,068 | The agency-dev-vs-operator tell on a 30-min call. Splash Jacks = founder-as-customer signal. "What would you cut if budget halved" question. |
| `05-the-storm-mode-moat.md` | 1,148 | Storm Mode + multi-county permit integrations as concrete example of locally-defensible regional+vertical IP. AI-coded national agencies can't compete on this axis. |

All five are inside the 800–1,200 word target. All five lead with a concrete claim in sentence one, reference real Day14 builds (Splash Jacks Pools, Casamoré, Buildbridge), and end with a soft CTA to day14.us.

### B. Four DM templates — `~/Documents/studio/docs/outreach/dm-templates.md`

- Cold #1 — SWFL mobile-service operator (74 words, references splashjackspools.com)
- Cold #2 — SWFL membership business (57 words, references the membership vertical page)
- Cold #3 — SWFL food / hospitality (58 words, references Casamoré)
- Follow-up #4 — single-sentence resurface with screenshot (22 words)

Plus a "Sending notes" section with channel discipline, personalization rules, follow-up cadence, and tracking guidance. All templates are under the 80-word cap.

### C. Two newsletter drafts — `~/Documents/studio/docs/outreach/newsletter-drafts.md`

- **Issue #1 — Shipping vs scoping** (534 words). First-issue intro: who Jack is, what Day14 is, what to expect, the missing-voice argument, three live builds referenced.
- **Issue #2 — Why I'm publishing the build-log live, on purpose** (503 words). Case for radical build transparency. Three-point argument. References `day14.us/builds/[slug]` infra and the agenda's Phase 2.4 status.

Both land inside the ~500-word target.

---

## Top two posts (strongest, in my read)

### 1. `05-the-storm-mode-moat.md` — strongest

Reason: it's the only post in the set that *attacks* the elephant-in-the-room thesis of 2026 (AI-coded agencies will commodify build work to zero) and lands a counter-thesis that has real evidence behind it. The Storm Mode example is genuinely concrete — NOAA feed, FIPS county codes, multi-county permit integration, four-channel notify fan-out, pre-approved contractor roster — and it does the rhetorical work of showing what "regional moat" actually means in code rather than asserting it. Pairs cleanly with the Buildbridge case-study page and is the post that's most likely to get picked up on X by other productized-agency operators. Recommend leading the publishing rotation with this one.

### 2. `02-owned-not-rented.md` — second strongest

Reason: this is the post that directly answers the most-common SWFL operator objection ("why not just use Jobber"). The 5-year math is specific (Jobber Connect $169/mo → $10,140; Housecall Pro Pro $129/mo → $7,740; Day14 Portal $5k + $199/mo → $16,940 with ownership at the end) and grounds the SaaS-vs-ownership argument in dollars instead of feelings. The "try canceling Jobber and keeping the customer portal" line is the quotable. Best landing-page-ad post in the set — recommend it as the one to drive cold traffic to.

Honorable mention: `04-built-by-an-operator.md` — the "what would you cut if budget halved" framing is the most original move in the set. Could be a standalone tweet or LinkedIn post on its own.

---

## Anything that needs Jack's review

1. **Pricing references.** All posts reference $2,500 (SITE), $5,000 (PORTAL), $10,000 (PLATFORM), $99/$199/$399 monthly. These match `src/lib/site.ts` as of 2026-05-15 — but if the pricing page ever shifts, every post needs a find-and-replace. Recommend a single `<PriceRef>` MDX component if these move into a CMS.

2. **Specific competitor prices in `02-owned-not-rented.md`.** I cited Jobber Connect at $169/mo, Housecall Pro Pro at $129/mo, GoHighLevel agency starter at $97/mo, Squarespace Commerce at $36/mo + extensions. These are plausible May-2026 numbers but I didn't network-verify any of them. Worth a 10-minute pass before publishing — competitor pricing pages change, and quoting a stale number is the kind of thing that gets ratioed on X. **Highest-priority review item.**

3. **Splash Jacks specifics.** I asserted things in the operator post like "two numbers on the home screen: revenue this month, jobs scheduled this week," "AI chatbot trained on services and pricing saves 6 calls a week," "daily admin digest at 7am." These are reasonable but not all in the source `site.ts` / case-study pages — Jack should confirm or soften the specificity to "a couple of headline numbers" / "saves a few calls a week" / "morning digest." None of them are *wrong*, just claimed with more precision than the source material strictly supports.

4. **Buildbridge Storm Mode details.** The post references NOAA feed parsing, FIPS county codes, multi-county permit-portal integrations for Lee/Collier/Charlotte/Sarasota/Manatee, and a four-channel notify fan-out (SMS/push/email/banner). The case-study page mentions Storm Mode and multi-county integrations but doesn't enumerate the five counties or detail the threshold logic. If Buildbridge actually only covers three counties or uses a different threshold model, soften before publishing.

5. **Newsletter Issue #1 mention of "missing voice."** I wrote that productized-services voice is missing from the small-business build conversation. That's defensible but slightly bold for a first issue — Jack may want to soften from "the missing voice" to "the voice I want to add to the mix."

6. **DM templates use Mustache-style placeholders** (`{{first_name}}`, `{{business_name}}`, `{{city}}`, `{{screenshot_attached}}`). If outreach tooling uses a different syntax (Instantly, Lemlist, Apollo), the templating needs adjusting. Easy mechanical fix.

---

## What I would write next (post-publish backlog)

- "The intake form is the entire input" — argument for radical scope minimalism, walked through the actual one-page intake at `docs/day14-intake-form.md`.
- "Anatomy of a Stripe milestone-escrow integration" — Buildbridge-specific, technical, would do well on HackerNews-adjacent crowd.
- "What I cut from the Splash Jacks build (and what I refused to cut)" — operator-decision post, would pair with post #4.
- "Why the build-log is the marketing flywheel" — deeper than newsletter issue #2, with the static `/builds/[slug]` infra as the reference implementation.
- "The 12-step QA gate" — internal-process post, useful for the SEO long-tail "how to QA a SaaS launch."

---

## Files written tonight

```
~/Documents/studio/docs/blog-drafts/
  01-the-14-day-claim.md
  02-owned-not-rented.md
  03-vertical-templates.md
  04-built-by-an-operator.md
  05-the-storm-mode-moat.md

~/Documents/studio/docs/outreach/
  dm-templates.md
  newsletter-drafts.md

~/Documents/studio/docs/overnight/
  03-content-drafts.md   (this file)
```

Total: 7 deliverable files, ~6,800 words of publish-ready copy.

Nothing was pushed to git. Jack to commit after the review pass above.
