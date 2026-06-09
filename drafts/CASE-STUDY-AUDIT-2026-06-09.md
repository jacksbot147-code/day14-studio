# /brands + Case-Study Credibility Audit — 2026-06-09

_innovation-t12 · branch `redesign/apple-base44-2026-06-03`. Two audits: (A) the `/brands` parent route, (B) four secondary case-study pages. Bias throughout: leave Jack's content alone unless something is clearly false; fix the smallest delta._

---

## Part A — `/brands` parent route (`src/app/brands/page.tsx`)

**Verdict: structurally fine. No code change made.**

The page is fully data-driven. It reads `public/data/brand-sites.json` and renders one tile per site (display name + tagline + a "Visit site →" link). It does **not** hard-code tenant tiles, descriptions, or any status badge.

**1. Right tenants?** The JSON currently lists three: `hot-flash-co`, `kennum-lawn-care`, `life-loophole`. The brief's six-name list also includes `angela-music`, `alignmd`, `day14-realty`. Those three are intentionally absent and that's defensible:
- `alignmd` — brand site lives in a separate `alignmd` repo (not in this studio); only surfaces here are the case study + homepage tile.
- `day14-realty` — PAUSED, no buyer-facing marketing surface in `src/app/brands/`.
- `angela-music` — has a `/brands/angela-music` route, but it's a client intake/build surface, not a Day14-owned portfolio brand, so excluding it from the owned-brands index is reasonable.

No change made — adding these would either surface a paused/parked brand or miscategorize a client build. Flagged for Jack to confirm the intended membership of this index.

**2. Tile descriptions stale?** No. All three taglines read as current, on-brand, post-pivot copy. No pre-pivot language.

**3. Header copy vs. build-studio positioning?** The header reads: _"Every business below is launched, designed, and run by the Day14 OS … All on autopilot."_ This is the **OS / autonomous-portfolio** framing, which sits alongside (not inside) the new **build-studio-for-hire** positioning on the homepage ("I build websites and apps in days"). It is not *clearly false* — these brands genuinely were built by the OS — so per the leave-alone bias I did **not** rewrite it. **Judgment call flagged for Jack:** if `/brands` should now read as build-studio proof rather than autonomous-empire proof, the "all on autopilot" line is the one to soften. Left as-is.

**4. Do `hot-flash-co` + `kennum` render as "Live" but are actually PARKED?** No literal "Live" badge exists anywhere on the page — every tile renders an identical "Visit site →" CTA with no status indicator. So the conditional fix ("if they render as Live … fix that") is **not triggered**. Worth noting the underlying ambiguity rather than acting on it:
- The "parked" designation for `hot-flash-co` / `kennum` comes from the human brief's taxonomy, **not** from any data field. There is no `status`/`parked`/`live` field anywhere in `brand-sites.json`, `empire-state.json`, or the `ops/*.json` files.
- `empire-state.json` actually shows `hot-flash-co` as `stage: "launching"` with a content pipeline that **completed at 02:10 today** — i.e. live data contradicts "parked."
- Adding a status field + parked badge + de-emphasized CTA would be a larger change than the brief's "smallest delta," would contradict the freshest data for hot-flash-co, and risks overreach. **Left as-is.**

**Recommendation if Jack wants this tightened later:** add an explicit `status: "live" | "parked"` field to each entry in `brand-sites.json` and have the tile render a "Parked" tag (and a muted/non-link CTA) for parked brands. That makes the page honest by data rather than by narrative. Not done here on purpose — out of "smallest delta" scope and currently ambiguous.

---

## Part B — Secondary case-study credibility audit

**Headline finding:** none of the four pages contain the hard red flags the task warned about. Across all four there are **zero** fabricated testimonial quotes, **zero** invented business-outcome metrics ("revenue up 47%"), **zero** named individuals who might not exist, and **zero** fabricated press mentions. Every number on these pages is a **build-deliverable fact** (pages shipped, lines of code, counties integrated, SQL migrations, days-to-launch), not invented social proof. That's the right way to do a credibility-safe case study.

One edit made; the rest left intact.

### casamore (`/case-studies/casamore`) — leave as-is
Claims a real rebrand (House of Love → Casamoré) and a public URL (`houseoflove.co`). Metrics are all build-facts: 18 pages, 19 essays, "Site tier," zero ongoing dev. No testimonials, no revenue claims, no named people, no press. Reads as a delivered client with a verifiable URL. **No change.** (Only unverifiable item is whether the URL resolves to the described site — operator's own claim, not something to second-guess from here.)

### buildbridge (`/case-studies/buildbridge`) — **EDIT MADE: added "Reference build" tag**
This is the one genuinely *illustrative* case. It has **no client URL**, is **SSO-gated**, and explicitly frames itself as "the Platform tier **exemplar**" and "Buildbridge **proves Day14 can** ship…" — i.e. a demonstration build, not a named paying client. Metrics are all build-facts (3 counties, 4 notify channels, 14 SQL migrations, iOS+Android). No fabricated quotes/metrics/press.

Per the task's explicit remedy for illustrative-vs-delivered cases, I added a small **"Reference build"** tag to the header meta line (now reads `Reference build · Preview · SSO-gated`). This is additive and truthful — it makes explicit what the body copy already implies, so a buyer clicking through can't mistake it for a delivered client engagement. Smallest possible delta; no other content touched.

### splash-jacks-pools (`/case-studies/splash-jacks-pools`) — leave as-is
Strongest "real client" framing of the four: public URL (`splashjackspools.com`), "first paying customer," "Real customers are paying through it," "Live, public, paying." Metrics are build-facts (~25k LOC, 14 days) plus "time to first paying customer." No fabricated quotes, named people, or press. If the URL and paying-customer claim are true, this is the flagship case study and should stay exactly as written. I have **no evidence it's false**, so per the preserve-unless-clearly-false rule: **no change.** (If Jack knows the paying-customer claim is not yet true, that single line is the one to soften — flagged, not touched.)

### hot-flash-co (`/case-studies/hot-flash-co`) — leave as-is (one item flagged)
The most honestly-framed page: header literally says "Internal," and the body says twice "This **wasn't a client build** — it was an in-house experiment." Effectively already tagged as a reference build, so no "Reference build" tag needed. Metrics are build-facts ("< 24h", "10 products", "0 min manual").

**Minor inconsistency flagged (not edited):** the CTA card says "See the **live storefront** … 10 products, **Printify-fulfilled**," while the page's own step 7 says the 10 Printify products are "**drafts pending publish**," and `empire-state.json` shows a recurring `PRINTIFY_API_KEY missing` fatal error on this tenant's daily-engine. So "Printify-fulfilled / live storefront" likely overstates the actual fulfillment state. Because the page is unambiguously labeled an internal experiment (low buyer-deception risk) and the brief biases toward leaving content alone, I did **not** edit it. If Jack wants it precise, change "Printify-fulfilled" → "Printify-drafted (publish pending)" and reconcile once the API key is wired.

---

## Summary of changes
- **1 edit:** `src/app/case-studies/buildbridge/page.tsx` — added "Reference build" to the header meta tag.
- **0 deletions**, **0 new deps**, **0 changes** to `/brands`, casamore, splash-jacks-pools, or hot-flash-co.

## Carry-forwards for Jack (judgment calls, intentionally not auto-applied)
- **CS-1:** `/brands` header still uses "run by the Day14 OS … on autopilot" (OS framing). Decide whether this index is autonomous-empire proof or build-studio proof, and soften if the latter.
- **CS-2:** `/brands` has no data-driven `status` field. If parked brands should read as parked, add `status` to `brand-sites.json` and render a "Parked" tag. (Note: `empire-state` currently shows hot-flash-co as *launching*, not parked — reconcile the taxonomy first.)
- **CS-3:** splash-jacks-pools asserts "real customers are paying" — confirm this is true before it stays on the highest-trust case study.
- **CS-4:** hot-flash-co case study says "Printify-fulfilled / live storefront" but its own copy says "drafts pending publish" and the tenant has a missing `PRINTIFY_API_KEY`. Reconcile.
