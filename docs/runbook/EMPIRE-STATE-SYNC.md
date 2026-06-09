# Empire-State Sync — Runbook

_Last updated: 2026-06-08 (innovation-t8). Status: **PROPOSED, not yet live.**_

## TL;DR

The 15-minute empire-state sync currently commits `public/data/empire-state.json`
to whatever branch is checked out — usually `main`/`redesign` — adding a
`sync: empire state HH:MM` commit every cycle. On the `redesign/apple-base44`
branch alone there are **847** such commits; they bury the human commit log.

This runbook proposes redirecting those auto-syncs to a dedicated `state/auto`
branch and folding them into **one** `sync: empire-state daily rollup <date>`
commit on `main` per day. The implementation is staged in
`docs/runbook/proposed/` and is **not active** — promotion needs Jack's review
(see "Decision needed" below).

---

## Current architecture (live today)

```
LaunchAgent  com.day14.admin-sync   (scripts/install-admin-sync.sh)
  └─ every 900s → node scripts/sync-empire-state.mjs --push
       ├─ scans ~/Documents/businesses/** + _shared/**
       ├─ writes studio/public/data/empire-state.json (+ ops/*.json snapshots)
       └─ --push:  git add public/data
                   git commit -m "sync: empire state <ISO HH:MM>"
                   git push origin HEAD     ← commits to CURRENT branch
```

Vercel `/admin` pages read `public/data/empire-state.json` from the deployed
branch to render the dashboard (Vercel has no access to Jack's Mac filesystem,
so the JSON is the bridge).

**Problem:** `git push origin HEAD` targets whatever branch is checked out, so
every 15 minutes a machine commit lands on the human's working branch.

## Proposed architecture

```
LaunchAgent  com.day14.admin-sync     (every 15 min)  — UNCHANGED schedule
  └─ node scripts/sync-empire-state.mjs --push
       └─ --push (REWRITTEN):
            capture original branch (git symbolic-ref --short HEAD)
            git add public/data; bail if no delta
            git stash -u   (only if tree dirty — protects concurrent work)
            git checkout -B state/auto
            re-apply public/data from stash; commit; git push -u origin state/auto
            finally: git checkout <original>;  git stash pop
            → original branch + working tree restored exactly as found

LaunchAgent  com.day14.empire-rollup  (daily 06:00 local)  — NEW, needs install
  └─ node scripts/empire-state-daily-rollup.mjs --run
       checkout main; pull --ff-only
       git checkout state/auto -- public/data        (latest snapshot only)
       git commit -m "sync: empire-state daily rollup <YYYY-MM-DD>"
       git push origin main
       git branch -f state/auto main; push --force-with-lease   (cycle resets)
```

Result: `main` shows human commits plus **one** rollup row per day; the noisy
15-min commits live on `state/auto` and are recycled daily.

### Files (staged, not yet promoted)

- `docs/runbook/proposed/sync-empire-state.mjs` — drop-in replacement for
  `scripts/sync-empire-state.mjs`. Everything above the `--push` block is
  byte-identical to the live script; only the commit/push tail changed.
- `docs/runbook/proposed/empire-state-daily-rollup.mjs` — the daily rollup job.
  **Dry-run by default**; only writes to `main` when invoked with `--run`.
- `docs/runbook/proposed/install-empire-rollup.sh` — LaunchAgent installer for
  the rollup job (mirrors `scripts/install-admin-sync.sh`). Not executed.

### Safety properties built into the proposed scripts

- The sync script's `--push` block uses a `try/finally` that **always** returns
  to the original branch and pops the stash — even on a failed `git push` or a
  thrown error — so the human's tree can't get stranded on `state/auto`.
- It stashes the whole working tree (incl. untracked) before switching
  branches, so a concurrent agent's uncommitted edits aren't clobbered by the
  branch switch.
- The rollup script is **dry-run unless `--run`**, refuses to run on a dirty
  tree, and only `--ff-only` pulls `main` (aborts on divergence). It is the
  ONLY component permitted to push to `main`.

---

## Decision needed before promotion ⚠️

**Perpetual dirty `empire-state.json` on the working branch.** Because the
proposed `--push` flow stashes the empire-state delta and pops it back onto the
original branch (to guarantee a clean branch restore), `public/data/empire-state.json`
will show as a permanent uncommitted modification on `redesign`/`main`. The
current live script avoids this by committing it to the current branch — which
is exactly the pollution we're removing. Pick one:

- **Option A — gitignore the synced JSON on tracked branches.** Add
  `public/data/empire-state.json` (+ `public/data/ops/*.json`) to `.gitignore`
  and `git rm --cached` them on `main`/`redesign` (file stays on disk; only
  untracked). The daily rollup re-materialises them on `main`. Cleanest log,
  but Vercel must deploy from a branch where the JSON IS committed (the daily
  rollup on `main`, or `state/auto` directly).
- **Option B — dedicated git worktree for `state/auto`.** Give `state/auto` its
  own worktree (e.g. `studio-state-auto/`) so the sync writes + commits there
  and never touches the main working tree at all — no stash/branch-switch,
  zero disruption to concurrent agents. More moving parts; the sync script
  would write the JSON into the worktree path instead of `public/data`.

**Which branch does Vercel deploy?** If Vercel builds from `main`, the live
dashboard only refreshes once per day after the rollup (acceptable, but a
behaviour change from ~15-min freshness). If near-real-time dashboard updates
are required, point Vercel's production deploy at `state/auto`, or keep the JSON
committed via Option A on the deployed branch. Confirm before promoting.

---

## Promotion steps (after Jack approves a decision above)

```bash
cd ~/Documents/studio

# 1. Promote the rewritten sync script over the live one.
cp docs/runbook/proposed/sync-empire-state.mjs scripts/sync-empire-state.mjs
node --check scripts/sync-empire-state.mjs

# 2. (If Option A) gitignore + untrack the synced JSON. (If Option B) set up the worktree.

# 3. Promote + install the daily rollup job.
cp docs/runbook/proposed/empire-state-daily-rollup.mjs scripts/empire-state-daily-rollup.mjs
node --check scripts/empire-state-daily-rollup.mjs
node scripts/empire-state-daily-rollup.mjs        # DRY RUN — review the plan first
bash docs/runbook/proposed/install-empire-rollup.sh   # installs the 06:00 LaunchAgent

# 4. The 15-min LaunchAgent (com.day14.admin-sync) needs no reinstall — it runs
#    the same scripts/sync-empire-state.mjs path, now with the redirected push.
#    To pick up the new code immediately instead of waiting for the next tick:
#      launchctl kickstart -k gui/$(id -u)/com.day14.admin-sync   # optional
```

## Rollback

```bash
git checkout scripts/sync-empire-state.mjs     # restore the live version
launchctl unload ~/Library/LaunchAgents/com.day14.empire-rollup.plist
rm ~/Library/LaunchAgents/com.day14.empire-rollup.plist
git branch -D state/auto          # optional; deletes the local sync branch
```

## Why this wasn't auto-promoted on 2026-06-08

The overnight agent (innovation-t8) deliberately did **not** edit the live
`scripts/sync-empire-state.mjs` or run any branch surgery. Reasons:

1. The LaunchAgent runs the working-tree file directly, so an in-place edit
   goes to production on the next 15-min tick with no review gate — counter to
   the "needs Jack's eyes first" instruction for anything touching `main`.
2. A fresh `.git/index.lock` was present (active concurrent git writer), and
   the `redesign` tree was mid-flight with another task's staged changes —
   not a safe moment to switch branches.
3. The dirty-tree tradeoff above is a real architectural decision Jack should
   make, not the agent.

See `docs/runbook/MORNING-REVIEW-empire-state-sync-2026-06-08.md` for the
morning checklist.
