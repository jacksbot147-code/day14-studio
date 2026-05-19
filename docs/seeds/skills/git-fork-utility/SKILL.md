---
name: git-fork-utility
description: Mechanical git operations for forking a template repo into a customer build. Handles fork creation, clone, remote rewiring, default-branch normalization, .git config. Supporting skill for template-forker. Pure mechanics — no decisions.
triggers:
  - "fork a repo"
  - "git clone template"
  - "create new repo from template"
---

# git-fork-utility

> The git-level mechanics underneath template-forker. Idempotent.

## Required inputs
- `template_repo` — e.g., `jacksbot147-code/studio-template-portal`
- `target_repo_name` — e.g., `customer-acme-pool`
- `target_visibility` — `private` (always; never public for customer builds)
- `local_clone_path` — defaults to `~/Documents/businesses/day14/customers/{slug}/code`

## The sequence

```bash
# 1. Fork via gh CLI (authenticated as jacksbot147-code)
gh repo fork "$template_repo" \
  --clone=false \
  --remote=false \
  --fork-name="$target_repo_name" \
  --org=jacksbot147-code

# 2. Set visibility to private
gh repo edit "jacksbot147-code/$target_repo_name" --visibility private

# 3. Clone locally
mkdir -p "$(dirname $local_clone_path)"
gh repo clone "jacksbot147-code/$target_repo_name" "$local_clone_path"

# 4. Verify default branch is 'main' (not 'master', not template's branch)
cd "$local_clone_path"
current_branch=$(git symbolic-ref --short HEAD)
if [ "$current_branch" != "main" ]; then
  git branch -m "$current_branch" main
  git push -u origin main
  git push origin --delete "$current_branch" 2>/dev/null || true
fi

# 5. Configure repo settings
gh repo edit "jacksbot147-code/$target_repo_name" \
  --description "Day14 build for {company_name} — SKU: {sku}, started {date}" \
  --add-topic "day14-customer-build" \
  --add-topic "$vertical" \
  --add-topic "$sku" \
  --enable-issues=false \
  --enable-wiki=false

# 6. Disconnect from template (no upstream tracking — customer build evolves independently)
git remote remove upstream 2>/dev/null || true
```

## Hard rules

1. **Never fork into public visibility.** Customer code is private always.
2. **Never push to the template repo.** Forks are read-only relative to source.
3. **Never delete the fork via this skill.** Deletion is a separate, gated operation.
4. **Idempotent: if the fork already exists**, log "exists, kept" and proceed to step 3 (clone) only if local copy missing.
5. **Always disable issues + wiki** on customer forks. Those distract from build communication; everything goes through the dossier instead.

## Failure modes

- **Template repo doesn't exist or gh-CLI auth expired**: stop. Surface to Jack.
- **Fork name collision** (rare, e.g. customer-acme-pool already exists): append `-v2`. Log clearly.
- **GitHub API rate-limit**: backoff 30s + retry; max 3 retries.
- **Local clone fails** (disk full, permissions): leave the GitHub fork in place; surface local error so Jack can re-clone manually.

## Logging

`[YYYY-MM-DD HH:MM ET] git-fork-utility → template: {repo}, target: {repo}, visibility: private, local_path: {path}, branch: main`

## When invoked
- Inside `template-forker` step 2 (the actual git/gh operation)
- Manually when Jack wants to create a fork for a one-off purpose
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('git-fork-utility', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'git-fork-utility', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
