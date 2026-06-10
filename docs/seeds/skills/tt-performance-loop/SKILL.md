---
name: tt-performance-loop
description: Nightly readback of posted TikTok content — views, watch-through, clicks, affiliate conversions/GMV. Doubles down on winning angles, kills losers, and adjusts tomorrow's scout weights. The learning half of the engine.
triggers:
  - "tiktok performance"
  - "content stats"
  - "/ttperf"
---

# tt-performance-loop

> The pipeline without this skill is a content sprinkler. With it,
> it's an experiment machine.

## What this skill does

1. Reads performance for every posted video (manual export or TikTok
   analytics screenshots Jack drops in
   `~/Documents/businesses/tiktok-engine/analytics/inbox/`, parsed
   automatically; API if/when access exists):
   views, 3s retention, completion, profile taps, shop clicks,
   orders/GMV from the Affiliate Center.
2. Appends per-video rows to
   `~/Documents/businesses/tiktok-engine/analytics/ledger.jsonl`
   (append-only).
3. Classifies each video after 48h: **scale** (top quartile retention
   AND converting), **iterate** (hooked but didn't convert — new angle,
   same product), **kill** (below floor on both).
4. Writes tomorrow's directives:
   - "scale" products → tt-content-producer makes 2 more variants
   - angle/format learnings → one-line rules appended to
     `playbook.md` (e.g. "outcome-first hooks beat question hooks 3:1
     in home-org niche")
   - scout weight nudges → niches that convert get a velocity bonus
5. Weekly (Sunday): rolls the week into a P&L —
   GMV, commission earned, Higgsfield credits spent, $/video,
   commission per 1k views — and queues a jack-tap with
   **continue / adjust / kill** recommendation against the gates below.

## Hard rules

1. **The ledger is append-only.** Bad weeks stay on the books.
2. **48h before judging a video.** TikTok distribution is spiky;
   day-one flops sometimes catch the algorithm on day two.
3. **Real numbers only.** No estimated GMV, no vanity rollups —
   if the Affiliate Center says $0, the report says $0.
4. **The kill gates are pre-committed:** if by day 14 the engine has
   < $50 commission OR < 1 video above 10k views, the Sunday tap
   recommends pause-and-rethink, and says so plainly.

## Output

Nightly: classification + tomorrow's directives. Sunday: P&L jack-tap.
