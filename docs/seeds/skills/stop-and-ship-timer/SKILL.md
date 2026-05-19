---
name: stop-and-ship-timer
description: The 25-minute timer that fires when a work session crosses from "building" into "polishing." Forces a ship-now decision. Counterpart to action-bias-coach — that one catches stalling, this one catches over-polishing.
triggers:
  - "almost done"
  - "one more thing"
  - "let me also"
  - "while I'm here"
  - "polish"
  - "tighten up"
  - "another pass"
---

# stop-and-ship-timer

> Action-bias-coach catches stalling. Stop-and-ship catches the
> opposite problem: working past the point where additional polish
> stops adding value. The 80/20 trigger.

## The 25-minute rule (per work session)

Every distinct work session starts a timer. At 25 minutes, the
session must produce SOMETHING shippable, or the work stops and
gets scheduled for next session.

"Shippable" doesn't mean polished. It means:
- Code: committed (even if behind a feature flag)
- Copy: written into the actual destination file
- Decisions: logged with rationale, no longer deliberated
- Drafts: saved to the dossier
- Designs: a screenshot or rough wireframe exists

## The "you've crossed into polishing" tells

When you (the agent) notice these patterns, fire the timer:

1. **Same file opened 5+ times in a session** — diminishing returns
2. **Editing the same paragraph 3+ times** — micro-optimization
3. **Adding "one more" feature/section** — scope creep
4. **Comparing two near-identical versions** — bikeshedding
5. **Pixel-perfect alignment matters** — never (ship the rough alignment)
6. **"Should I also add..."** — no
7. **A/B testing two phrasings** — pick one; A/B test the LIVE version

## What's NOT polishing (don't trigger)

- First draft of anything new (that's building)
- Customer-facing copy that ships in <24 hours (allow 2 edit passes)
- Pre-flight checks before a production deploy (always allow)
- Security-related work (never short-cut)

## The cap rules

Per medium of work:

| Medium | Max edit passes before ship |
|---|---|
| Customer email | 2 (first draft + one revision) |
| Blog post | 3 (draft + structure pass + voice pass) |
| Skill SKILL.md | 1 (write it once, edit only if invalidated) |
| Customer site copy | 2 |
| Marketing site (Day14) | 4 (this is the showroom) |
| Code refactor | 1 |
| Documentation | 1 |
| Council decision text | 1 (the protocol is once-and-ship) |

If you've already done the cap'd number of passes and the work
isn't shipped, ship it as-is. Open a follow-up task for the
remaining concerns.

## How to surface the move

When the timer fires, output:

> 25 minutes on this. Ship-current-state move: {one specific action — e.g., "commit this file as-is with message 'wip: $brief' and open issue #N for the remaining concerns"}. Polish lives in the next pass after real feedback.

## The "ship rough" mental model

Per Council 0001's recommendation for the Splash Jacks video:
"Don't edit. Don't polish. Rough is the proof."

That principle extends:
- Rough code shipped > polished code unwritten
- Rough copy shipped > perfect copy in your head
- Rough design shipped > pixel-perfect mockup behind a NDA
- Rough customer answer shipped > careful answer never sent

## Hard rules

1. **Never claim "almost done" twice in a session.** First time you say it, you commit. If you say it a second time, the timer fires.
2. **Never wait for a perfect transition / segue / wording.** Write the rough one, ship, fix later if needed.
3. **Never block a ship on "what if" worries that haven't materialized.** Fix when broken, not when imagined.
4. **Never refactor right before a ship.** Refactor next sprint with a test in place.

## How to invoke

The timer is mostly a self-policing skill — invoke against your own
behavior when working. Specifically:

- At the start of a work session, mentally start a 25-min countdown
- Check halfway (12-13 min in) — am I building or polishing?
- At 25 min — ship something, even rough

For agents: when an agent's own response to a user is taking >5
back-and-forths to refine a single artifact, fire the timer. Ship
the current version with a "iterating from here" note.

## Logging

Append to MASTER_LOG when triggered:
`[YYYY-MM-DD HH:MM ET] stop-and-ship-timer FIRED → shipped: {what}, deferred: {what to next session}`

Quarterly: how often did the 25-min rule produce something Jack
later regretted shipping rough? If <10%, the rule is calibrated
right. If >25%, raise to 35 min.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('stop-and-ship-timer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'stop-and-ship-timer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
