# Loom Script — Homepage Demo, 2026-06-04
**Target length:** 60 seconds, single take. ~150-170 spoken words.

**Recording setup:**
- Loom desktop app, camera on (small inset bottom-right)
- Two browser tabs: day14-studio.com homepage + AlignMD admin
- Don't fuss with mic setup

---

## The script (60 seconds, ~155 words)

> [0:00, on camera, homepage in background]
> Hey. I'm Jack. I build sites and apps for small businesses, and the businesses run on the same operating system I built for my own six.
>
> [0:10, scroll to case study rail]
> Here are three of mine — live, running, taking real money. Splash Jacks is a pool-service platform doing routes and billing. Casamoré is a silent-disco brand whose site polishes itself every night. AlignMD is healthcare-staffing software that gets a clinician credentialed in four minutes instead of forty.
>
> [0:30, switch to AlignMD admin]
> Here's AlignMD running. Real customers, real dossiers. This is the kind of thing I'd build for you in 14 days.
>
> [0:45, back to homepage]
> Three tiers: fifteen hundred for a one-pager, nine thousand for a full marketing site, twenty-four thousand for a real software business. After launch, forty-nine, one-forty-nine, or two-ninety-nine a month keeps it running on Day14 OS.
>
> [0:55, on camera]
> Book a fifteen-minute intro call — free, no pressure. The number's on the page. Talk soon.

---

## Why this script works

- **Opens with "I" not "we"** (VOICE.md rule 1).
- **Names what each tenant DOES** in concrete verbs (routes, billing, polishes itself, credentials a clinician) — not adjectives.
- **One number per tenant** — "4 minutes instead of 40" beats generic "fast."
- **Pricing said plainly** — no "Spark/Studio/Platform" jargon.
- **CTA is the new one** — "15-min intro call, free, no pressure" — not "scope call."
- **60-second cap** ensures you don't ramble. One take.

## Don't say (banned by VOICE.md)

- "scope call"
- "we" / "our team"
- "ship" / "shipped"
- "ops ladder"
- "AI-native" / "world-class" / "unlock" / "leverage"

## After recording

1. Loom → Get Share Link.
2. In `studio/src/app/page.tsx`, find `const LOOM_EMBED_URL = "";` (around line 43).
3. Paste the URL inside the quotes.
4. Commit, push, Vercel deploys.
5. Done.
