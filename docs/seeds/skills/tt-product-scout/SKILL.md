---
name: tt-product-scout
description: Daily scan for viral-velocity TikTok Shop affiliate products. Scores candidates on commission, sales velocity, content-fit for AI video, and saturation. Outputs a ranked shortlist of 5 with a one-line content angle each. Feeds tt-content-producer.
triggers:
  - "tiktok products"
  - "viral products"
  - "product scout"
  - "/ttscout"
---

# tt-product-scout

> Picking the product IS the strategy. A mediocre video on a product at
> the start of its curve beats a great video on a dead one.

## What this skill does

1. Pulls candidates from the TikTok Shop Affiliate Center ("Product
   Marketplace") — sorted by commission rate and items-sold velocity —
   plus open-web trend signals (TikTok Creative Center trending,
   "TikTok made me buy it" searches, Kalodata-style velocity reads if
   available).
2. Scores each candidate 0–100:
   - **Velocity (35%)** — units/week trend, rising not peaked
   - **Commission economics (25%)** — % × price; target ≥ $3/sale
     payout, price band $15–$50 (impulse zone)
   - **AI-content fit (25%)** — can the product be sold WITHOUT
     hands-on demo footage? Best: products whose appeal is the
     *outcome or idea* (gadgets, home, organization, beauty-adjacent).
     Worst: fit/feel products (clothing, texture-dependent).
   - **Saturation (15%)** — penalize products where top creators
     already flooded the niche this week.
3. Writes the daily shortlist to
   `~/Documents/businesses/tiktok-engine/products/shortlist-{YYYY-MM-DD}.md`:
   5 products max, each with product link, commission, score breakdown,
   and ONE content angle in a single sentence.
4. Logs the run to the work-register.

## Hard rules

1. **Five products max per day.** A shortlist of 20 is a research
   document, not a decision.
2. **Never pick a product you can't legally/safely promote** — no
   supplements with health claims, no medical devices, no weapons-ish
   gadgets, nothing requiring claims we can't verify.
3. **Always record the commission % and price at scout time** —
   sellers change them; the log is our receipt.
4. **Rising, not risen.** If a product's top video is >2 weeks old and
   declining, skip regardless of total sales.
5. **Respect the platform.** Only data from surfaces we're allowed to
   access; no scraping behind auth walls.

## Output

Daily shortlist file + one-line Telegram/jack-tap summary:
"Scout: 5 candidates, top = {name} ({commission}%, score {n}). Full list in products/."
