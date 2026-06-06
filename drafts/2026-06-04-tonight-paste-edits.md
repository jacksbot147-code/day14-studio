# Tonight's paste-edits for `studio/src/app/page.tsx`
**Date:** 2026-06-04 evening session
**Purpose:** The exact lines to change tonight. Each block is paste-ready.

---

## EDIT 1 — Hero copy + title metadata

Find (around lines 49-52):

```ts
const TITLE = "Day14 — Build studio running on its own OS. Sites and apps shipped in 14 days.";
const DESCRIPTION =
  "Day14 is a build studio with its own operating system. We ship sites and apps in 14 days, then $299/mo keeps them running on Day14 OS — the same stack we use for six of our own businesses. Now booking 3 builds for July.";
```

Replace with (per VOICE.md — "I" not "we", drop "ship"):

```ts
const TITLE = "Day14 — Sites and apps for small businesses. Live in 14 days.";
const DESCRIPTION =
  "I'm Jack. I build small-business sites and apps in 14 days, then $149/mo keeps them running on Day14 OS — the same stack I use for six of my own businesses. Now booking 3 builds for July.";
```

---

## EDIT 2 — Replace the OS_CASE_STUDIES array (lines 81–150)

Three new live tall cards (Splash Jacks, AlignMD, Casamoré), three short cards (Buildbridge as live, Day14 Realty paused, Life Loophole live short). Hot Flash + Kennum removed from this section — they belong in a future "Archive" or "Parked" footer block.

```ts
const OS_CASE_STUDIES: Array<{
  slug: string;
  name: string;
  title: string;
  story: string;
  state: TenantState;
  brandColor: string;
  size: "tall" | "short";
}> = [
  {
    slug: "alignmd",
    name: "AlignMD",
    title: "Credential-aware staffing, end to end.",
    story:
      "Clinician intake that used to take 40 minutes now takes 4. Same admin app I run every other business from.",
    state: "live",
    brandColor: "#3B82F6",
    size: "tall",
  },
  {
    slug: "splash-jacks-pools",
    name: "Splash Jacks Pools",
    title: "A real platform for a real pool guy.",
    story:
      "Customer booking, route dispatch, photo-proof visits with GPS+timestamp, Stripe billing. Live in Southwest Florida. Replaced a Squarespace brochure with software that runs the business.",
    state: "live",
    brandColor: "#0EA5E9",
    size: "tall",
  },
  {
    slug: "casamore",
    name: "Casamoré",
    title: "Silent disco with a brand that doesn't blink.",
    story:
      "18 marketing pages, 19 essays, poster series, MailerLite-wired waitlist. The site runs itself on scheduled agents — nightly polish, weekly UX audit, monthly analytics, T-minus rituals for every show.",
    state: "live",
    brandColor: "#EF6C33",
    size: "tall",
  },
  {
    slug: "buildbridge",
    name: "Buildbridge",
    title: "Hurricane-season marketplace, 14 SQL migrations deep.",
    story:
      "Homeowner-contractor marketplace with Stripe escrow, multi-county permit lookups, and Storm Mode — NOAA-triggered contractor mobilization in hours.",
    state: "live",
    brandColor: "#0F766E",
    size: "short",
  },
  {
    slug: "life-loophole",
    name: "Life Loophole",
    title: "Editorial finance, drafted by an agent nightly.",
    story:
      "A background automation drafts essays in brand voice each night. I review and publish from the inbox.",
    state: "live",
    brandColor: "#CA8A04",
    size: "short",
  },
  {
    slug: "day14-realty",
    name: "Day14 Realty",
    title: "Coastal listings, paused for licensing.",
    story:
      "Brand and admin wired into the OS. On hold until broker-of-record paperwork clears.",
    state: "paused",
    brandColor: "#14805A",
    size: "short",
  },
];
```

**Note:** Hot Flash Co and Kennum Lawn Care are intentionally removed from this case-study section. Per the empire triage they're being archived/sunset and don't belong in the hero proof.

---

## EDIT 3 — Replace the Loom slot copy

Find around line 350-380 where `LoomDemo()` renders the loom embed empty state. Replace any "scope call" CTA copy with:

```tsx
// In the LoomDemo empty-state link block:
<a href="#intro-call" className="btn-ghost">
  Book a 15-min intro call — free, no pressure
</a>
```

And in the hero CTAs (find `StaggerCtas` block):

```tsx
{/* Primary CTA */}
<Link href="#intro-call" className="btn-primary">
  Book a 15-min intro call
</Link>
{/* Secondary CTA */}
<a href="#case-studies" className="btn-ghost">
  See three live builds ↓
</a>
```

---

## EDIT 4 — Add phone number + name to header or hero

In `<ProfessionalHero />` block (around lines 260–280), add right above or after the hero text:

```tsx
<div className="text-sm text-muted-foreground">
  Jack Boppington · solo operator · <a href="tel:+1XXXXXXXXXX">(XXX) XXX-XXXX</a>
</div>
```

Replace `XXXXXXXXXX` / `(XXX) XXX-XXXX` with your real cell.

---

## EDIT 5 — Mobile terminal flourishes ~40% quieter

In `tailwind.config.ts` or in a global CSS file, add a media query that disables the loudest decorative components on mobile. The cleanest path is to wrap the loud ones in:

```tsx
<div className="hidden md:block">
  <TerminalSnippet />
</div>
```

Targets: `TerminalSnippet`, `DecryptText`, `MeshGradient` decorative instances, anything with `cursor-spotlight`. Audit `page.tsx` for these and gate them with `hidden md:block` where they're purely decorative.

---

## After all 5 edits

```bash
cd ~/Documents/studio
npm run build  # catch any TS errors
npm run dev    # eyeball it locally
git add -A && git commit -m "voice pass + 3 real case studies + phone number"
git push       # Vercel auto-deploys
```

Smoke test on the live URL:
- [ ] Hero says "I" not "we"
- [ ] 3 case-study tall cards visible (AlignMD, Splash Jacks, Casamoré)
- [ ] Phone number visible above the fold
- [ ] "Book a 15-min intro call" replaces "scope call" everywhere
- [ ] Mobile view doesn't show TerminalSnippet decorations
