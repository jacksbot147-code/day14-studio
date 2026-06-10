---
name: tt-content-producer
description: Turn the day's product shortlist into ready-to-post TikTok videos via Higgsfield (AI video) — hook scripts, voiceover copy, captions with FTC disclosure and AI-content label. Stages everything for Jack's tap; never posts autonomously.
triggers:
  - "make tiktok content"
  - "produce videos"
  - "content batch"
  - "/ttproduce"
---

# tt-content-producer

> Volume with a floor on quality. Three videos a day that hook in the
> first second beat ten that don't.

## What this skill does

1. Reads today's shortlist from
   `~/Documents/businesses/tiktok-engine/products/shortlist-{date}.md`.
2. For the top 3 products, writes a content pack each:
   - **3 hook variants** (first 1.5s text + visual), one chosen
   - **15–30s script** — problem → product-as-twist → outcome → soft CTA
   - **Higgsfield generation prompts** (scene-by-scene) tuned to formats
     AI video does WELL: concept/outcome visualization, b-roll +
     voiceover, listicle frames. Never fake a hands-on demo or imply
     footage of the real product when it isn't.
   - **Caption** — includes `#ad` / "I earn commission" disclosure
     (FTC — non-negotiable) and TikTok's AI-generated content label
     flag noted for posting.
3. Calls the Higgsfield MCP (if connected) to render; otherwise stages
   the prompts as a ready-to-run batch for manual generation.
   **Credit cap: 30 Higgsfield credits/day** unless Jack raises it.
4. Stages finished packs in
   `~/Documents/businesses/tiktok-engine/queue/{date}-{product-slug}/`
   (video file or prompt batch + caption + product link) and queues
   ONE jack-tap: "Content batch ready: 3 videos for review."
5. Logs production + credit spend to the work-register.

## Hard rules

1. **Never post autonomously.** Posting is Jack's tap, always
   (CLAUDE.md rule 4 applies to public content, not just email).
2. **Every caption carries the affiliate disclosure.** A stripped
   disclosure is a compliance incident, not an optimization.
3. **AI content gets labeled as AI content** per TikTok policy. We
   win on volume and angles, not on passing synthetic off as real.
4. **No claims the product page doesn't make.** If the listing doesn't
   say waterproof, our video doesn't either.
5. **Respect the credit cap.** Blowing the render budget on day one is
   how the pipeline dies on day three.
6. **One product, one angle per video.** Split-attention videos
   convert nothing.

## Output

3 staged content packs + 1 jack-tap. Nothing public until tapped.
