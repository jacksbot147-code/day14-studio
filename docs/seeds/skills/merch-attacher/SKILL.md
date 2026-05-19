---
name: merch-attacher
purpose: Add print-on-demand merch to any existing tenant. Day14 default: every business sells merch.
inputs:
  - slug
  - count (default 5)
  - product_type (default mug)
outputs:
  - 5 brand-aligned Printify product drafts
  - ~/Documents/businesses/<slug>/merch-manifest.json
  - Telegram launch ping
triggers:
  - Called by business-bootstrap by default for non-pod archetypes
  - User says "add merch to X"
  - Telegram /merch <slug>
hand_coded: true
implementation: scripts/merch-attacher.mjs
jack_tap_required: false  # creates drafts only — Jack taps publish in Printify
---

# merch-attacher

The "merch-always-on" engine. Any business in the Day14 family can run this to get a starter merch lineup without manual design work.

## How it reads voice

1. Loads `~/Documents/businesses/<slug>/CONSTITUTION.md`
2. Loads `~/Documents/businesses/<slug>/brand-identity.json` (if exists)
3. Sends both to Gemini with a "generate N merch concepts" prompt
4. Each concept gets: slug, quote, visual style, title, description, 10 tags

## Image generation

Pollinations.ai Flux (free, no auth). Each image generated at 1024×1024, uploaded to Printify, attached to the 11oz mug blueprint (or whatever `--product-type` specifies).

## Why every business

Merch is:
- **High margin** — 50-70% on a $19 mug
- **Brand-amplifying** — your customer's friend sees the mug, asks about it, follow-on sales
- **Low-effort** — Printify handles fulfillment, no inventory
- **Compatible with every archetype** — SaaS, course, newsletter, agency all benefit from giftable swag

Default = ON. Opt-out via `--skip-merch` on business-bootstrap.
