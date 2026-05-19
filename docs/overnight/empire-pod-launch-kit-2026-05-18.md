# Scheduled task — empire-pod-launch-kit (2026-05-18)

**Status: PARTIAL — script blocked, manual fallback delivered**

## What was scheduled

Three sequential `idea-worker.mjs` calls for tenant `pod-store-1` with 90s
sleeps between them:

1. `pod-niche-researcher` for women's health (perimenopause), single parenting, migraine community.
2. `pod-product-mix-recommender` for "perimenopausal women 40–55 humor". Buyer intent: self + gift.
3. `pod-design-brief-generator` for "perimenopausal humor", product_type `mug`, voice `humor`.

Then: write task result, queue P2 with file list.

## What actually happened

The Cowork sandbox cannot reach `generativelanguage.googleapis.com`.
Outbound DNS for that host fails (`EAI_AGAIN`), and the HTTPS proxy at
`localhost:3128` returns 403 on CONNECT to it. Node's `fetch` doesn't
auto-route through the proxy.

Evidence (from `~/Documents/businesses/_shared/poller/idea-worker.log`):

```
[2026-05-18T08:00:54.822Z] Gemini API error: fetch failed
[2026-05-18T09:01:45.798Z] Gemini API error: fetch failed
[2026-05-18T10:02:07.232Z] Gemini API error: fetch failed
[2026-05-18T16:01:51.538Z] Gemini API error: fetch failed   <-- this scheduled run
```

The 14:13 / 14:54 successes earlier in the day appear to have run from
Jack's laptop directly (not the scheduled-task sandbox), which has full
network access. **Every overnight/scheduled Gemini call today has failed
the same way.** This is the blocker, not a transient outage.

### Decision taken

Per the scheduled-task contract ("execute autonomously, make reasonable
choices, note them"), I did **not** fabricate Gemini-grounded output.
Instead I produced three manual-fallback artifacts (clearly labeled) so
Jack has something concrete to react to when he wakes up. These should
be **replaced** the next time the same three skills can run end-to-end
from the laptop.

## Artifacts produced

All three under `~/Documents/businesses/pod-store-1/research/`:

1. `pod-niches-perimenopause-singleparent-migraine.md` — 6 niche candidates with audience size, competition, product fit, design concepts, revenue band. Manual fallback.
2. `product-mix-perimenopausal-40-55-humor.md` — 8-SKU mix, ratios, pricing floor, first-30-days plan, channel allocation. Manual fallback.
3. `design-brief-mug-perimenopausal-humor.md` — print specs, 4 color palettes, 6 ready-to-paste Midjourney prompts, listing copy starter, QA checklist. Manual fallback.

## Recommended next actions (for Jack)

1. **Fix the scheduled-task network gap** — either (a) install a host-side proxy bridge so the Cowork sandbox can reach Gemini, or (b) move the `idea-worker.mjs` cron off the sandbox and onto the Mac mini once it's up. The Mac mini runbook (`day14-mac-mini-runbook.md`) is the natural home for these jobs.
2. **Re-run the three skills from the laptop** to overwrite the manual-fallback files with real grounded research. The skills are hand-coded in `~/Documents/studio/src/lib/skills/pod-*.ts` and can also be invoked directly without going through the `idea-worker` agent loop.
3. **Eyeball the manual drafts now** — the niche & product-mix files are reasonable starting points; the mug brief has 6 prompts ready to push into Midjourney today if you want to seed the store.

## Telegram

Queued P2 with the file list (see outbox).

— scheduled empire-pod-launch-kit task, 2026-05-18T16:00 UTC
