---
name: brand-identity-generator
purpose: Generate a complete brand identity (voice, palette, typography, ICP, positioning) for any new tenant.
inputs:
  - slug
  - display_name
  - niche
outputs:
  - ~/Documents/businesses/<slug>/brand-identity.json
triggers:
  - Called by business-bootstrap as STEP 1
  - User says "generate brand identity for X"
hand_coded: true
implementation: scripts/brand-identity-generator.mjs
jack_tap_required: false
---

# brand-identity-generator

Single source of truth for a tenant's brand. Feeds into:
- CONSTITUTION.md (voice rules)
- BrandStorefront component (colors, typography)
- merch-attacher (visual direction)
- marketing-engine (voice + ICP for content drafts)
- customer-service-triage (voice for CS responses)

## Output schema

```json
{
  "positioning_statement": "one-sentence",
  "icp": { "description": "...", "where_they_hang_out": [...], "what_they_buy_today": [...] },
  "voice_rules": { "yes": [...], "no": [...] },
  "color_palette": [{ "hex": "...", "name": "...", "role": "primary|secondary|accent", "reasoning": "..." }],
  "typography": {
    "heading": { "google_font": "...", "weight": 600, "reasoning": "..." },
    "body":    { "google_font": "...", "weight": 400, "reasoning": "..." }
  },
  "banned_phrases": [...],
  "competitor_archetypes": [...],
  "merch_aesthetic": "..."
}
```

## Voice principle

The prompt forces specificity. "Modern and elegant" is rejected — outputs must pick a lane like "1970s varsity patch" or "Brutalist Helvetica + grid".
