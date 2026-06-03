# Night Brief — Apple × Base44 hybrid redesign
# 2026-06-03 overnight (Tuesday → Wednesday)

## Vibe
Apple-grade display typography and scroll cinema layered over Base44's product-screenshot warmth. Cream backgrounds, oversized ink-black headlines, floating admin-product cards with soft warm shadows, single ember accent for action and emphasis, occasional full-bleed dark sections for drama.

## Palette tokens
- paper-cream: #fafaf7  (dominant surface)
- ink: #0a0a0a  (type)
- ember: #ef6c33  (single accent, action only)
- warm-gray-50: #f5f4f0
- warm-gray-100: #e8e6e0
- warm-gray-200: #d1cec5
- warm-gray-400: #8a8579
- warm-gray-500: #5c5850
- warm-gray-700: #2e2c27
- dark-cream-bg: #1a1715 (for full-bleed dark sections)

## Type
- Display headlines: system-ui display stack (SF Pro Display feel). 96–160px desktop, -0.04em tracking, 0.95 line-height.
- Body: Inter or system sans, 17–20px, 1.6 line-height.
- Chrome / mono: JetBrains Mono or ui-monospace.

## Radius / shadow
- Card radius: 18px
- Button radius: 12px
- Shadow: long, warm (slight peach undertone), low opacity.
  Example: `box-shadow: 0 24px 60px -20px rgba(239, 108, 51, 0.10), 0 8px 24px -8px rgba(15, 23, 42, 0.06);`

## Branch + git rules
- Branch: redesign/apple-base44-2026-06-03
- All commits stay LOCAL. Never push.
- Each task commits at the end with a clear message.

## Tonight's schedule
- 00:15 — setup + audience-reframe copy + branch
- 01:00 — tokens (globals.css + tailwind.config)
- 02:00 — Apple/Base44 hero rebuild
- 03:30 — Loom section + case studies bento
- 04:30 — how-it-works + pricing + waitlist + footer
- 05:30 — side agenda drafts (AlignMD strategy, manifesto, X-thread, Loom script)
- 06:15 — final QA + morning briefing artifact

## Constraints
- Never push.
- Never delete.
- No new deps.
- hot-flash-co + kennum-lawn-care excluded.
- All work on branch `redesign/apple-base44-2026-06-03` only.
