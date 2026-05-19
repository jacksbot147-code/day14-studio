---
name: competitor-researcher
purpose: Pull live competitor data + market signals for any niche via Gemini grounded search.
inputs:
  - slug
  - niche
  - archetype (default pod-store)
outputs:
  - ~/Documents/businesses/<slug>/competitor-research.json
triggers:
  - Called by business-bootstrap as STEP 2
  - User says "research competitors for X"
hand_coded: true
implementation: scripts/competitor-researcher.mjs
jack_tap_required: false
---

# competitor-researcher

Uses Google Search via Gemini grounding to find REAL competitors that exist today. No hallucinations.

## Output

- 5-10 competitors with name, URL, positioning, pricing, audience, what-works, gaps
- Market size signal (high/medium/low + reasoning)
- Average market price (cents)
- Underserved segments
- 3+ winning angles
- 5+ search terms to target

## When to re-run

Quarterly per tenant. Markets shift. Add a scheduled task per tenant to re-run every 90 days.
