---
name: pre-flight-verification-pass
description: Before reporting "done" or "shipped", run a 5-check verification sweep that proves the work actually landed. Counters the "I wrote the file" assumption when the file might be empty or wrong path. Catches premature done-claims before they hit Jack.
triggers:
  - "verify it landed"
  - "before reporting done"
  - "pre-flight check"
  - "did the write succeed"
---

# pre-flight-verification-pass

> "I wrote the file" doesn't mean "the file is correct." This skill
> closes the gap.

## The 5 checks (run all 5 before claiming done)

### 1. File existence
For every file the work claims to have created:
- `ls -la {path}` → confirm exists
- File size > 0 bytes (empty file = silent fail)

### 2. Content sanity
- `head -10 {path}` → eyeball the first lines
- Confirm expected markers (frontmatter for SKILL.md; shebang for .sh; etc.)
- For JSON: verify with `jq .` (catches malformed)
- For Markdown: confirm at least one heading present

### 3. Permissions
For executable scripts:
- `[[ -x {path} ]]` confirms executable bit set
- If not set + filename ends in `.sh`: chmod +x

### 4. Idempotency check
If the operation should be safe to re-run:
- Run the operation a second time
- Compare output for "exists, kept" lines vs new writes
- Mismatch = idempotency bug

### 5. Cross-reference
If the work touched a registry (bootstrap.sh's seed list, package.json deps, etc.):
- Grep the registry for the new entry
- Verify it's actually there + properly formatted

## Output

```
PRE-FLIGHT VERIFICATION

✓ File exists: {path} ({N} bytes)
✓ Content sane: {first heading / shebang / etc.}
✓ Permissions: {expected}
✓ Idempotent: {N exists-kept lines on second run}
✓ Registry updated: {grep result}

Verdict: SHIPPED (all 5 pass)
```

If any fails:
```
✗ {check name}: {what went wrong}

Verdict: NOT SHIPPED — fix and re-verify
```

## What "done" SHOULD mean

Before declaring done in chat:
- All 5 checks pass
- Logged to MASTER_LOG with confidence ≥ 0.85
- Files are reachable from Jack's machine (host path, not sandbox)

## What "done" should NOT mean

- "I called the Write tool" (success message ≠ correct output)
- "I think it worked" (run the check)
- "It's done in my context" (Jack can't see your context)

## Hard rules

1. **Never claim done without running the 5 checks.** Even if the operation looked clean.
2. **Always include the verification output** in the chat reply when shipping something substantial.
3. **For multi-file work** (10+ files), check the top 3 most-critical files; spot-check 2 more random ones.
4. **Never skip the idempotency check** for any operation that updates registries or seeds.

## When to invoke
- Before sending a "shipped" message to Jack
- Before marking a TaskCreate as completed
- Inside `daily-eod` when computing "what shipped" — verify the claims

## Failure modes
- **Files are huge (>10MB)**: don't head them; use `wc -l` and existence checks only
- **The "registry" check times out**: log + skip; don't block on slow grep
- **Path is on a network mount that's down**: surface as P1; don't claim done

## Logging
`[YYYY-MM-DD HH:MM ET] pre-flight-verification-pass → checks: 5/5 pass, files_checked: {N}, verdict: SHIPPED`

When verification fails:
`[YYYY-MM-DD HH:MM ET] pre-flight-verification-pass FAIL → check: {N}, reason: {one-line}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('pre-flight-verification-pass', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'pre-flight-verification-pass', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
