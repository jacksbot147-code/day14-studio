# OG-card refresh — run from your Mac (2026-06-09)

The overnight queue staged a one-shot orchestrator that regenerates the
public-facing OG/social cards for the new build-studio positioning. The
sandbox can't reach Gemini, so it's staged but **not run** — you run it from
your Mac terminal.

> **Heads-up — push the overnight commits.** The sandbox has no GitHub
> credentials (auth lives in your Mac keychain), so tonight's commits are local
> only. The branch `redesign/apple-base44-2026-06-03` is ahead of origin. Push
> first thing:
> ```
> cd ~/Documents/studio && git push origin redesign/apple-base44-2026-06-03
> ```

## The command

```
cd ~/Documents/studio && node scripts/_internal/og-refresh-2026-06-09.mjs
```

That's it. Same pattern as the proven `banana-refire-2026-05-28.mjs` and
`landing-images-2026-06-02.mjs` runs.

## What it does

Reads `GEMINI_API_KEY` from `.env.local`, runs the budget gate, fires one tiny
smoke-test image to confirm auth, then generates **4 OG cards** (1200×630 PNG)
into `public/og/`:

| File | Route | Headline rendered |
|------|-------|-------------------|
| `public/og/home.png` | homepage | "We build websites and apps in days, not months" |
| `public/og/work-with-us.png` | hire page | "Hire Day14 — Build it. Ship it in days." |
| `public/og/process.png` | 14-day process | 14 ember dots + "14 DAYS · BEAT BY BEAT" |
| `public/og/status.png` | live status | "DAY14 · OS · LIVE" terminal card |

All cream-paper editorial with a single ember-orange accent, except `status`
which is the dark terminal card.

## What to expect

- Run takes **~30s** (1 smoke call + up to 4 image calls).
- On success you'll see `[og-refresh] OK …` lines and a final JSON summary.
- A new section is appended to `WORK-LOG.md`.
- If the smoke test fails (auth/rate-limit), it stops cleanly with no partial
  spam and logs the reason — just re-run after fixing the key.

## Important: the stale work-with-us.png

The script is **idempotent** — it **skips any file that already exists** so
re-runs are safe. But that means the current stale `public/og/work-with-us.png`
(pre-pivot copy) will be **skipped**, not replaced.

To regenerate it with the new "Hire Day14" copy, delete the old one first, then run:

```
cd ~/Documents/studio
rm public/og/home.png public/og/work-with-us.png public/og/process.png public/og/status.png 2>/dev/null
node scripts/_internal/og-refresh-2026-06-09.mjs
```

(`home.png`, `process.png`, and `status.png` don't exist yet, so on a fresh run
only `work-with-us.png` needs the `rm`. The line above is safe either way.)

## After it runs

Eyeball the 4 PNGs in `public/og/`. Gemini sometimes mangles long headlines —
if the type is garbled, delete that one file and re-run (it'll only regenerate
the missing card). When they look right, commit + push the PNGs yourself and the
new OG tags will pick them up on the next Vercel deploy.
