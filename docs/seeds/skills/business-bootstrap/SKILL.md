---
name: business-bootstrap
purpose: Stand up an entire new business in one command — any archetype.
inputs:
  - slug
  - display_name
  - niche
  - archetype (pod-store | saas | course | newsletter | info-product | agency | consulting | physical-product | affiliate-site | marketplace | community)
  - product_type (optional, for pod-store/merch)
  - skip_merch (optional)
  - skip_research (optional)
outputs:
  - ~/Documents/businesses/<slug>/CONSTITUTION.md
  - ~/Documents/businesses/<slug>/brand-identity.json
  - ~/Documents/businesses/<slug>/competitor-research.json
  - ~/Documents/businesses/<slug>/bootstrap-manifest.json
  - tenant registered in _shared/tenants.json
  - studio/src/app/brands/<slug>/page.tsx scaffolded
  - LaunchAgents installed (archetype-specific)
  - merch products created (unless --skip-merch)
  - Telegram launch summary
triggers:
  - User says: "spin up a new business", "launch <X>", "bootstrap <X>"
  - Telegram /new-business command
hand_coded: true
implementation: scripts/business-bootstrap.mjs
jack_tap_required: false
---

# business-bootstrap

The platform-level orchestrator for spinning up a brand-new business of any archetype.

Pulls together: `brand-identity-generator` → `competitor-researcher` → archetype-specific scaffolder → `merch-attacher` → Telegram summary. Each step is its own skill and can be run individually.

## What it does

1. Validates slug is unique
2. Creates tenant directory + registers in `tenants.json`
3. Generates brand identity (voice, palette, typography, ICP, positioning) via Gemini
4. Researches competitors via Gemini grounded search
5. Runs archetype-specific scaffold:
   - `pod-store`: full launch via `new-store-bootstrap` (10 product drafts)
   - others: constitution + brand site stub only
6. Auto-attaches merch (5 mug drafts) unless `--skip-merch`
7. Installs LaunchAgents for the archetype
8. Telegram-pings Jack with launch summary

## Archetype catalog

Defined in `~/Documents/businesses/_shared/business-archetypes.json`. Each archetype declares:
- Default channels (Printify, Stripe, Cal.com, etc.)
- Default LaunchAgents to install
- Default skill bundle
- Whether merch attaches by default (almost always yes)
- Bootstrap step order

## Merch-always-on rule

Every Day14 business sells merch by default. The `merch-attacher.mjs` script reads the tenant's constitution + brand identity and generates 5 brand-aligned products. Merch is opt-out (`--skip-merch`), never opt-in.

This is intentional: merch is high-margin, low-effort, brand-amplifying. Every business benefits.

## Example invocations

```bash
# A POD store (full launch)
node scripts/business-bootstrap.mjs \
  --slug "hot-flash-co" \
  --display-name "Hot Flash Co" \
  --niche "perimenopause humor"

# A paid newsletter (with merch attached)
node scripts/business-bootstrap.mjs \
  --slug "rust-belt-revival" \
  --display-name "Rust Belt Revival" \
  --niche "weekly newsletter on midwest economic stories" \
  --archetype newsletter

# A course business (with merch + brand-aligned mugs)
node scripts/business-bootstrap.mjs \
  --slug "calm-spreadsheets" \
  --display-name "Calm Spreadsheets" \
  --niche "Excel mastery for people who hate Excel" \
  --archetype course
```
