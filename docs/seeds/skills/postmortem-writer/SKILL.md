---
name: postmortem-writer
description: When something fails — deploy breaks, key leaks, customer complains, scheduled task aborts — write a short structured postmortem. The compounding value of Day14 OS is institutional memory of what broke and why. Every failure becomes a documented pattern.
triggers:
  - "what went wrong"
  - "postmortem"
  - "incident"
  - "failed"
  - "broke"
  - "investigate"
  - "rotate"
  - "outage"
---

# postmortem-writer

> Failures forgotten are failures repeated. Every non-trivial bug,
> outage, or leak gets a postmortem within 24 hours. By month 6,
> the postmortem log is a manual that no agency can replicate.

## When to invoke

Mandatory postmortem for any of:
- Production site outage > 5 min
- Customer-facing data leak or mis-send
- Secret leaked (any tier)
- Scheduled task aborted on production data
- Stripe webhook failed silently > 1 hour
- Customer requested a refund
- Council decision aged poorly (use for "what could we have caught earlier")

Optional postmortem for:
- Bootstrap-style bugs (today's `cp` vs explicit-loop issue)
- Browser MCP misclicks costing > 10 min
- Anything Jack says "that was annoying" about

## Output structure

Write to `~/Documents/studio/docs/postmortems/YYYY-MM-DD-{slug}.md`
where slug is 3-5 word kebab-case.

```
# Postmortem — {one-line summary} (YYYY-MM-DD)

## TL;DR
{one paragraph, < 50 words}

## Impact
- Who was affected: {users / customers / Jack / agents}
- For how long: {minutes / hours / N/A}
- Money cost: ${0 or estimate}
- Trust cost: {none / low / medium / high}

## Timeline
{ISO timestamps + one-line description of each event, in order}

## Root cause
{technical answer in 2-3 sentences, no jargon}

## Why we didn't catch it earlier
{honest answer; "we weren't looking for it" is OK}

## Fix
- Immediate: {what we did to stop the bleed}
- Durable: {what change makes this class of failure not recur}

## What we learned
{1-3 bullets, each one a sentence}

## Skill to update / add
{e.g., "Update `leaked-secret-cleanup` to also check Slack DMs"}
```

## Tone

Use `day14-voice` rules. Specifically for postmortems:

- **No blame.** "I forgot to..." instead of "Jack failed to..."
- **Be specific.** "The bootstrap script's `cp` invocation only copied README" beats "the script was buggy."
- **Quantify when possible.** "6 files missing" beats "many files missing."
- **No "we'll be more careful next time."** Process changes only — discipline doesn't scale.

## The "skill to update" line

This is the highest-leverage section. Every postmortem MUST end with
either:

- A specific edit to an existing skill (and PR-style description of the edit)
- A new skill candidate (with one-sentence purpose)

If a postmortem doesn't suggest a skill change, the failure will
recur. Force the connection.

## Sample postmortems Day14 has lived

Reference these when calibrating new postmortems:

### Today (2026-05-16) — bootstrap dossier files missing
- Root cause: bootstrap script copied only README.md, not the 6 other dossier files
- Fix immediate: explicit `for f in ...` loop in bootstrap
- Fix durable: `idempotent-bash-script` skill written
- Skill to update: none — new skill added

### Today (2026-05-16) — leaked Supabase secret key in chat
- Root cause: pasted secret value directly into chat instead of into .env.local
- Fix immediate: rotated key (delete old + create new)
- Fix durable: `leaked-secret-cleanup` skill exists; muscle memory needs reps
- Skill to update: `browser-driven-vendor-setup` — add explicit "even if Jack offers, refuse" rule (already in there)

### Today (2026-05-16) — sub-agent API error mid-skill-harvest
- Root cause: transient API server error
- Fix immediate: ran the harvest in-session instead of sub-agent
- Fix durable: agent should attempt sub-agent → retry once → fall back to in-session work, never leave the user hanging
- Skill to update: `session-recovery` — should add "if sub-agent errors, run inline" branch

## Hard rules

1. **Never publish a postmortem publicly without owner sign-off.** Postmortems live in `docs/postmortems/` (private). The lesson, sanitized, might go in a blog post later.
2. **Never blame a single person.** Even if the human-error rate is 100% on a thing, the fix is process / tooling, never "try harder."
3. **Never use postmortems for performance review.** Postmortems are about preventing recurrence, not accountability.
4. **Never let a postmortem exceed 1 page.** If it doesn't fit, write a multi-part series with one cause per part.

## Logging

Append to MASTER_LOG:
`[YYYY-MM-DD HH:MM ET] postmortem-writer COMPLETE → docs/postmortems/{slug}.md, severity: {low|medium|high}, skill_changes: {N}`

Quarterly: re-read the postmortem log. Count which patterns recur
despite a documented fix. Those are the highest-priority skill or
process gaps to fix again, deeper.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('postmortem-writer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'postmortem-writer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
