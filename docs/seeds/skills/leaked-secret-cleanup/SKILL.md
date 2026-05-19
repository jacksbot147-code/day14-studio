---
name: leaked-secret-cleanup
description: The procedure for when real secrets land somewhere they shouldn't — a `.env*` file in a `studio-templates/` repo, an API key in a customer dossier, a service-role token in a commit message. Invoke on any sign of leaked credentials. Returns a 4-step cleanup pass + the rotate-or-not decision + the prevention pair. Skill exists because rsync ignores `.gitignore`, agents copy files between repos, and the same leak hit `studio-template-portal/` and `studio-template-platform/` on consecutive overnight runs.
triggers:
  - ".env in"
  - "leaked"
  - "secret"
  - "credentials"
  - "API key"
  - "service role"
  - "DATABASE_URL"
  - "rotate"
  - "rsync"
  - "checked in"
  - "committed by accident"
---

# leaked-secret-cleanup

> The procedure when real credentials show up where they shouldn't.
> `.gitignore` only protects you from `git add`. Anything else
> (rsync, cp -R, zip, tar, drag-and-drop, agent copy-paste) ignores
> `.gitignore` completely. So real `.env` files end up in template
> repos. So API keys end up in dossier markdown. This skill is the
> standard cleanup + the prevention pair.

## When to invoke

Invoke automatically when ANY of:

- A `.env`, `.env.local`, `.env.production.local`, or `.env.<anything>`
  file appears in `~/Documents/studio-templates/*/` (the templates
  should only ever contain `.env.example`)
- An API key, service-role token, or `DATABASE_URL` string appears in
  any markdown file under `~/Documents/businesses/`
- An agent's rsync / cp / clone output lands a file the agent doesn't
  recognize as expected template content
- Jack says "I think I leaked something" or "did we just commit secrets"

Do NOT invoke for:

- `.env.example` — that's the legit template marker, stays
- Public publishable IDs (Stripe `pk_…`, Supabase `anon` key,
  Cloudflare site IDs) — those are designed to ship to clients
- A test-mode Stripe `sk_test_…` key in a local dev env that never
  left the laptop

## The 4-step procedure

### Step 1 — Confirm not yet committed

This decides everything else. Run from the offending repo:

```bash
cd ~/Documents/studio-templates/{template-name}
git log --all --full-history -- .env .env.local .env.production.local 2>/dev/null
git log --all --full-history -- '*.env' 2>/dev/null
```

If output is empty → the secret is in the working tree only. Step 2
is enough.

If output is non-empty → the secret is in git history (locally,
possibly pushed). You're now in rotate-credentials territory. See
"If it's in git history" below before doing anything else.

### Step 2 — Delete the working-tree files

```bash
cd ~/Documents/studio-templates/{template-name}
ls -la .env* 2>/dev/null      # see what's there
rm -f .env .env.local .env.production.local
ls -la .env* 2>/dev/null      # confirm only .env.example remains
```

If the leak is in a different shape (dossier markdown, etc.), replace
the `rm` with whatever surgical edit gets the secret out — but in all
cases the next step (sanity verify) is the same.

### Step 3 — Sanity verify

```bash
# nothing matching in the working tree
find ~/Documents/studio-templates -name '.env' -not -name '.env.example'
find ~/Documents/studio-templates -name '.env.local'
find ~/Documents/studio-templates -name '.env.production.local'

# nothing matching in dossier markdown
rg -n 'sk_live_|sk_test_|DATABASE_URL=postgres|OPENAI_API_KEY=sk-|RESEND_API_KEY=re_' \
   ~/Documents/businesses/ 2>/dev/null
```

All four should return empty. If any returns hits, repeat Step 2 on
the offender.

### Step 4 — Document + prevent

Write one line in the relevant repo's `CHANGELOG.md` under a "Cleanup"
section:

> `YYYY-MM-DD — Removed leaked .env / .env.local / .env.production.local
> from working tree (origin: rsync from splash-jacks-pools, never
> committed). No rotation needed.`

If you DID rotate credentials, note which ones and where the new ones
were issued.

Then drop the prevention pair (see below) into the offending repo so
the same leak can't happen the same way twice.

## If it's in git history

The secret has been written to a commit. `.gitignore` won't help; `rm
+ git commit` won't help. You have to assume any pushed commit is
public.

1. **Rotate every credential in the leaked file immediately**, even if
   the repo is private. Order:
   - Supabase service-role key → Project → Settings → API → Roll
   - `DATABASE_URL` password → Project → Settings → Database → Reset
   - Stripe live-mode keys → Dashboard → Developers → API keys → Roll
   - Stripe webhook secret → Webhooks → Roll signing secret
   - Resend API key → API Keys → Revoke + new
   - Twilio auth token → Console → Settings → Roll auth token
   - OpenAI / Anthropic keys → respective dashboards
2. **Force-rewrite history** with `git filter-repo` (NOT
   `filter-branch` — it's deprecated and slow):
   ```bash
   pip install git-filter-repo --break-system-packages
   git filter-repo --invert-paths --path .env --path .env.local --path .env.production.local
   git push origin main --force-with-lease
   ```
3. **Note in CHANGELOG.md** which credentials were rotated, when, and
   that the history was force-rewritten. Tell any teammate who pulled
   the offending commit that they need to re-clone.

If the repo is on GitHub, also open Settings → Secret scanning and
check whether GitHub already alerted on the leak — they will have
filed a security advisory that you should mark resolved with the
rotation note.

## The prevention pair

Once cleaned, install both of these so the leak can't recur the same
way:

### A. The rsync exclude

Any script that rsyncs one repo into another (the Portal Phase A
pattern is the canonical case) must use:

```bash
rsync -av \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='.env.*.local' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='.vercel' \
  --exclude='*.tsbuildinfo' \
  source/ dest/
```

The `.env.example` file is intentionally NOT excluded — it ships.

### B. The pre-commit hook

In every `~/Documents/studio-templates/*/.git/hooks/pre-commit` (chmod
+x), drop:

```bash
#!/usr/bin/env bash
# Block commits that include real .env files.
# .env.example is intentionally allowed.
set -e
staged=$(git diff --cached --name-only --diff-filter=ACMR)
bad=$(echo "$staged" | grep -E '(^|/)\.env(\.|$)' | grep -v '\.env\.example$' || true)
if [ -n "$bad" ]; then
  echo "✗ refused to commit: real .env files staged:"
  echo "$bad"
  echo "  rm them, or rename to .env.example with placeholder values."
  exit 1
fi
```

This isn't synced via git (hooks live in `.git/`, not the repo). So
add a helper: `~/Documents/studio-templates/_shared/install-hooks.sh`
that copies the hook into every template's `.git/hooks/`. Run after
any template clone.

## What this skill does NOT cover

- **The first-time leak detection** — that's a `dependency-auditor` or
  `screenshot-diff-checker`-adjacent ops skill (see Pack 6). This
  skill assumes you already know there's a leak.
- **Customer-side credentials** — if a CUSTOMER leaks their own
  Stripe/Supabase keys to you, escalate to Jack and have THEM rotate.
  Day14 doesn't rotate credentials on a customer's behalf.
- **GitHub secret scanning configuration** — that's a one-time repo
  setting; see GitHub docs.

## Failure modes

- **Trusting `.gitignore` to save you on a non-git tool.** `.gitignore`
  is consulted by `git` only. `rsync`, `cp -R`, `zip`, `tar`, file
  explorers, agent file-copies all ignore it. The prevention pair
  above is the only durable fix.
- **Skipping Step 1 (git log check).** If the secret is in history
  and you only delete the working-tree file, the secret is still
  reachable from any clone. Always run the log check first.
- **Rotating in the wrong order.** If you rotate `DATABASE_URL`
  before the service-role key, the service-role key briefly works
  against the new password (race condition). Service-role first, then
  `DATABASE_URL`, then webhook secret.
- **Letting the same leak come back.** A leak that happened from
  rsync once will happen from the next rsync unless the exclude is
  added. Always install the prevention pair after the cleanup.

## Why this skill exists

This bit twice in 48 hours on the Portal/Platform templates (see
`docs/overnight/04-portal-skeleton.md:57-67` and
`docs/overnight/00-end-of-day-status.md:25,39`). The fix is mechanical
but the order matters: confirm-not-committed → delete → verify →
prevent. Skipping any step leaves the leak warm.

Treat every leaked-secret event as an opportunity to install the
prevention. The number of leaks compounds the longer the empire
runs; the prevention compounds faster.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('leaked-secret-cleanup', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'leaked-secret-cleanup', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
