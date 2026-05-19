---
name: product-catalog-manager
description: Source-of-truth product catalog: SKUs, variants, prices, descriptions, photos. Lives at `~/Documents/businesses/{tenant}/catalog/products.json` per ecom tenant. Single edit point for Stripe products, Shopify items, site listings.
triggers:
  - "product catalog"
  - "add product"
  - "edit SKU"
  - "catalog update"
pack: ecom-ops
---

# product-catalog-manager

> The catalog is one file. Stripe + Shopify + site listings all derive from it.
> If you find yourself editing in 3 places, you're doing it wrong.

## Schema (products.json)

```json
{
  "products": [
    {
      "sku": "BOAT-DECK-CLEANER-32OZ",
      "name": "Marine deck cleaner — 32oz",
      "description": "Salt-cured deck cleaner for fiberglass and teak.",
      "price_cents": 2495,
      "compare_at_cents": null,
      "inventory_count": 47,
      "weight_oz": 36,
      "photos": ["catalog/photos/deck-cleaner-1.jpg"],
      "variants": [],
      "tags": ["cleaning", "marine"],
      "active": true,
      "stripe_product_id": "prod_...",
      "stripe_price_id": "price_..."
    }
  ]
}
```

## What this skill does

1. Read/edit products.json
2. Push changes to Stripe (if stripe_*_id present, update; else create)
3. Push changes to Shopify (if shopify integration set up)
4. Regenerate site product pages on next deploy
5. Audit-log every change

## Hard rules

1. **Never delete a product** — set `active: false` so order history stays valid.
2. **Always preserve stripe_*_id** — don't recreate; update.
3. **Never edit price without Jack-tap** (price changes break customer trust).
4. **Always update inventory_count atomically** — concurrent orders need locking.
5. **Photos must live in catalog/photos/** — no external URLs (broken-link risk).

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('product-catalog-manager', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'product-catalog-manager', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
