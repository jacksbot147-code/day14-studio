---
name: draft-promoter
description: The last-mile of growth-always-on. When Jack taps "approve" on a draft SKILL.md (via Telegram or manually), this skill moves it from _drafts/ to seeds/skills/, updates bootstrap, commits to git, and re-runs the bootstrap deploy.
triggers:
  - "promote draft"
  - "approve skill"
  - "move from drafts"
  - "ship the draft"
---

# draft-promoter

> Drafts are cheap (2-occurrence rule). Promotions are commitment.
> This skill is the gate that takes a draft from "auto-generated"
> to "installed in the empire."

## The promotion sequence

When Jack approves a draft (via Telegram tap, manual command, or scheduled-task auto-approve for very-low-risk drafts):

### Step 1 — Validate
- Run `skill-naming-validator` against the draft's name (no collision)
- Run `skill-promotion-criteria` (3+ occurrences now required for actual promotion, vs 2 for draft)
- Run `pre-flight-verification-pass` on the draft's structure (required sections present)

If any fail: surface why; don't promote.

### Step 2 — Move
```bash
mv ~/Documents/studio/docs/seeds/skills/_drafts/{name}/ \
   ~/Documents/studio/docs/seeds/skills/{name}/
```

### Step 3 — Update bootstrap
Append `{name}` to the `for skill in ...; do` loop in
`~/Documents/studio/scripts/bootstrap-day14-os.sh`.

Verify via grep that the addition landed.

### Step 4 — Attach growth hook
Run `bash ~/Documents/studio/scripts/attach-growth-hook.sh` so the new
skill gets the standardized growth section.

### Step 5 — Re-run bootstrap
```bash
bash ~/Documents/studio/scripts/bootstrap-day14-os.sh
```
Should show 1 new green `✓ seeded skill: {name}`. The skill is now in `_shared/skills/`.

### Step 6 — Update empire cluster map
If the draft has a `parent_anchor` field in frontmatter:
- Find the parent in `day14-os-skills-and-empire.md`
- Add this draft as a supporter under the parent's bullet

If standalone:
- Add to the appropriate pack section

### Step 7 — Commit
```bash
cd ~/Documents/studio
git add docs/seeds/skills/{name}/ scripts/bootstrap-day14-os.sh docs/day14-os-skills-and-empire.md
git commit -m "feat(skill): promote {name} from draft"
```
Don't push — that's a separate manual decision (per `skill-registrar` boundary).

### Step 8 — Log to growth log
Update `growth-log.md`:
- Mark the draft's entry as "Status: promoted ({timestamp})"
- Add the new skill to the empire count

### Step 9 — Notify
Telegram message (P3):
```
✅ Promoted: {name}

Now in _shared/skills/.
Empire size: {N} → {N+1}.
```

## Per-trigger source

### Triggered via Telegram (most common)
Jack taps the "✅ Promote" inline button on a draft notification.
The button's `callback_data` is `promote:{draft_name}`.
The Telegram bridge routes this to `draft-promoter` automatically.

### Triggered via Telegram free-text
Jack types `promote {draft-name}` in chat.
`telegram-command-router` parses + invokes.

### Triggered manually
Jack runs:
```bash
bash ~/Documents/studio/scripts/promote-draft.sh {name}
```
(A wrapper around this skill's steps.)

### Triggered automatically (very-low-risk only)
For drafts that are:
- Pure spec extension of an existing skill (no new logic)
- Already match a known-safe pattern (e.g., adding a city to seo-city-page-builder list)
- Risk score <0.15 per `risk-scoring`

These auto-promote silently with audit log. The threshold list is in `~/Documents/businesses/_shared/growth/auto-promote-rules.json`.

## Hard rules

1. **Always run pre-promotion validation.** Skipping any step risks bloat.
2. **Never push to remote** without Jack's explicit tap. Commit yes, push no.
3. **Always update the cluster map** in `day14-os-skills-and-empire.md`. The map is the empire's index.
4. **Always preserve the draft's audit trail** — keep the original auto-generation metadata in the SKILL.md frontmatter.
5. **Never auto-promote a draft >7 days old.** Stale drafts may have outdated evidence; surface for re-evaluation.

## Failure modes

- **bootstrap.sh update fails** (sed/regex issue): roll back the file move; surface error
- **git commit fails** (uncommitted unrelated changes): stash first; if still fails, surface
- **Skill name collision discovered late** (between draft and promotion): rename + retry; or merge with existing
- **Promoted skill never fires after 30 days**: surfaces in `skill-coverage-auditor` as archive candidate

## When invoked
- Jack taps "✅ Promote" on a Telegram draft notification
- Manual `/promote {name}` command in Telegram
- Auto-fire for very-low-risk drafts per allowlist
- Scheduled task during weekly council review for batch-promote pending drafts

## Logging

`[YYYY-MM-DD HH:MM ET] draft-promoter → name: {name}, trigger: {tg-button|manual|auto|batch}, empire_size_after: {N}`

When validation fails:
`[YYYY-MM-DD HH:MM ET] draft-promoter REJECTED → name: {name}, reason: {validation step that failed}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('draft-promoter', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'draft-promoter', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
