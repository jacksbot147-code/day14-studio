# ☀️ Morning review — empire-state cron redesign (innovation-t8)

**For Jack. 2026-06-08 overnight run. ~5 min read + one decision.**

## What I was asked to do

Redirect the every-15-min `empire-state.json` sync off `main`/`redesign` (it has
added **847** `sync: empire state HH:MM` commits to the current branch) onto a
dedicated `state/auto` branch, add a daily rollup-to-main job, and document it.

## What I actually did — and why I stopped short of going live

I built the full implementation but left it **staged, not live**, because going
live tonight was unsafe on three counts:

1. **No review gate.** The LaunchAgent runs `scripts/sync-empire-state.mjs`
   straight from the working tree, so editing it in place ships to production on
   the next tick — no chance for you to review first. The task itself said the
   rollup "needs Jack's eyes first"; same logic applies to the sync rewrite.
2. **Active git lock + busy tree.** A fresh `.git/index.lock` was present (a
   concurrent git writer — likely the cron or a sibling overnight task), and the
   `redesign` branch was mid-flight with another task's staged deletions
   (T6's `creative-direction.md` files, alignmd scripts). Branch-switching in
   that state risks clobbering in-flight work.
3. **One real design decision is yours, not mine** (see below).

This is the task's documented fallback: "If you can't safely modify the cron
without risking the empire-state pipeline, write a recommendation doc instead."

## What's ready for you

All under `docs/runbook/`:

- `EMPIRE-STATE-SYNC.md` — full architecture (current + proposed), safety
  properties, promotion + rollback steps.
- `proposed/sync-empire-state.mjs` — drop-in replacement. Identical to the live
  script except the `--push` tail, which now redirects to `state/auto` and
  always restores your branch + working tree via a `finally` block. `node
  --check` passes.
- `proposed/empire-state-daily-rollup.mjs` — daily rollup job. **Dry-run by
  default**; only writes to `main` with `--run`. `node --check` passes.
- `proposed/install-empire-rollup.sh` — LaunchAgent installer (06:00 local).
  Not run.

I did **not**: edit the live script, switch branches, push to `main`, install
the rollup LaunchAgent, run the rollup, or delete anything.

> **Note on the redesign-branch commit/push:** I could not make it. A
> `.git/index.lock` was held the whole run and the sandbox refused to remove it
> (`Operation not permitted`), so every `git add`/`commit` returned exit 128.
> All five files above are therefore on disk but **untracked** under
> `docs/runbook/`. The 15-min cron only `git add`s `public/data`, so it won't
> sweep them into an auto-sync commit. To track them yourself once the lock
> clears:
> ```bash
> cd ~/Documents/studio
> git add docs/runbook/EMPIRE-STATE-SYNC.md \
>         docs/runbook/MORNING-REVIEW-empire-state-sync-2026-06-08.md \
>         docs/runbook/proposed/
> git commit -m "innovation-t8: empire-state cron → state/auto branch + daily rollup to main"
> git push origin redesign/apple-base44-2026-06-03
> ```
> (A stale `.git/index.lock` from 08:31 was sitting in the repo — worth a glance;
> if nothing is mid-commit, `rm .git/index.lock` clears it.)

## The one decision I need from you ⚠️

The redirect leaves `public/data/empire-state.json` as a **permanent
uncommitted change** on `main`/`redesign` (because the delta is stashed and
popped back to keep your branch clean). Pick how to handle it — both are in the
runbook:

- **Option A:** gitignore + `git rm --cached` the synced JSON on tracked
  branches; the daily rollup re-materialises it on `main`.
- **Option B:** give `state/auto` a dedicated git **worktree** so the sync never
  touches your main working tree at all (cleanest, slightly more setup).

Also confirm **which branch Vercel deploys** — if it builds from `main`, the
live dashboard will refresh once/day post-rollup instead of every ~15 min.

## To promote (after you decide)

See the "Promotion steps" section of `EMPIRE-STATE-SYNC.md`. Quick version:

```bash
cd ~/Documents/studio
cp docs/runbook/proposed/sync-empire-state.mjs scripts/sync-empire-state.mjs
cp docs/runbook/proposed/empire-state-daily-rollup.mjs scripts/empire-state-daily-rollup.mjs
node scripts/empire-state-daily-rollup.mjs            # dry run, eyeball it
bash docs/runbook/proposed/install-empire-rollup.sh   # install 06:00 job
```
