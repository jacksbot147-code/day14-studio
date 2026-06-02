# Motion system — Day14 OS

*The component library that gives Day14 OS its motion vocabulary. Server-rendered pages stay server-rendered; motion lives behind `"use client"` wrappers.*

## Design principles

1. **Layout-preserving.** Wrappers never shift CSS — they only animate opacity, transform, and shadow. Page layout matches the static state on first paint.
2. **Reduced-motion is a first-class branch.** Every component honors `useReducedMotion()`. The reduced path returns either children straight through or static visuals — never half-animated.
3. **One-shot first impressions, idle thereafter.** Most motion fires once on mount or scroll-into-view. We don't draw attention back to elements unless the data demands it (status pulse on active units, live clock).
4. **Brutalist > bouncy.** No spring-y overshoot. Short easeOut curves (180–320ms). The aesthetic is editorial-tech, not playful.
5. **Mobile-first.** All transforms work on touch. Pulses use `transform`+`opacity` (GPU). No layout-thrashing properties.

## What's where

| Component | Used by | Vibe |
|---|---|---|
| `count-up.tsx` | Landing hero proof strip, Mission Control stats strip | Numbers count up from 0 once when scrolled into view |
| `scroll-fade.tsx` | Marketing pages, About | Fade-in-on-scroll for editorial sections |
| `stagger-cards.tsx` | /admin home KPI grid | Card grid waves in 50ms apart |
| `stagger-ctas.tsx` | Landing CTA clusters, hero buttons | CTA buttons cascade in |
| `route-transition.tsx` | Marketing layout (`src/app/layout.tsx`) | 200ms fade+slide between marketing routes |
| `admin-page-transition.tsx` | `src/app/admin/layout.tsx` | Same, scoped to `/admin/*` |
| `hero-aurora.tsx` | Landing hero background | Soft aurora gradient behind hero text |
| `cycling-word.tsx` | Hero, marketing taglines | Word in a sentence swaps through a list |
| `crew-stats-strip.tsx` | `/admin/mission-control` | 6-stat strip with CountUp + stagger reveal |
| `crew-fleet-section.tsx` | `/admin/mission-control` | Per-fleet header + card grid stagger reveal on scroll |
| `crew-card-live.tsx` | `/admin/mission-control` | Hover lift + accent glow on each crew card |
| `active-state-dot.tsx` | `/admin/mission-control` chip slots | Pulsing dot for `state="active"` units |
| `scanner-sweep.tsx` | `/admin/mission-control` page header | One-shot accent line sweeps across, radar/launch vibe |
| `live-clock.tsx` | `/admin/mission-control` header | NASA-console mission clock — pulsing accent dot + ticking time |
| `slide-in-banner.tsx` | `/admin/inbox` bulk-signoff callout | Banner slides in from top once on mount |

## When to reach for what

- **A new stat / KPI** → `<CountUp to={n} />`
- **A new admin page header that should "boot up"** → `<ScannerSweep />`
- **A new card grid (admin)** → wrap with `<StaggerCards>` (if KPI-style) or `<CrewFleetSection>` (if section-titled)
- **A new live/idle/error state indicator** → `<ActiveStateDot status={...} />`
- **A new notification / callout that should announce itself** → `<SlideInBanner>`
- **A new clickable card that should feel like a control surface** → wrap each card with `<CrewCardLive>` (active state lights the accent shadow)
- **Anything time-based** → `<LiveClock>` for current-time, `<CountUp>` for static numbers

## Adding a new motion component — checklist

1. `"use client";` at the top.
2. Import from `framer-motion` (already in package.json — never add another animation lib).
3. `const reduce = useReducedMotion();` — branch the entire animation tree on it.
4. JSDoc header explaining what + where + why. Match the voice of existing components.
5. Default to mounting at the *final* visual state for SSR (avoid first-paint flash on social-share previews + JS-disabled crawlers).
6. Keep duration under 350ms and ease to `easeOut`. We're not Pixar.
7. If the animation touches layout (height, width, position) — don't. Use `transform` and `opacity` only.
8. Register the new component in this README's table.

## Performance notes

- Everything uses `transform`+`opacity` (compositor-only repaints).
- No `layout` animations — they trigger reflow on every frame.
- `whileInView` uses `viewport={{ once: true, margin: "-80px" }}` so animations fire once and stop observing.
- Motion components are tree-shaken — only the pages that import them pay the bundle cost. framer-motion is the only motion dep across the whole app.

## What we deliberately don't do

- No 3D / WebGL / canvas. Out of scope.
- No GSAP. framer-motion covers everything we need.
- No mouse-trailing cursor effects (cute, but every operator-grade admin removes them within a week).
- No carousels. Static grids + scroll wins.
- No fancy page-transitions on the marketing site beyond the 200ms fade. Editorial sites are read-mode, not interaction-mode.
