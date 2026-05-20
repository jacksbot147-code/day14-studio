---
name: move-architect
description: The Day14 playbook for turning a raw idea into a shipped move. Clarify the real fork points before building, study the existing system, expand the idea honestly (no faked capability), decompose into a tracked plan + file map, verify before shipping, and ship one clean paste-once deploy. Use whenever Jack brings a new feature, segment, agent, or expansion.
triggers:
  - "architect"
  - "plan this move"
  - "expand this idea"
  - "new feature"
  - "how should we build"
  - "lets build"
  - "make an agent"
  - "should we add"
---

# move-architect

> Every good move this empire has made followed the same seven steps.
> This skill writes them down so the next move — and every one after —
> gets the same rigor instead of a fast guess.

## The playbook

### 1. Clarify first — never assume past a real fork
A request that sounds simple is almost always underspecified. Before any
multi-step build, find the **1-3 fork points** — the decisions that actually
change what gets built — and ask them as crisp multiple-choice questions.
Examples of forks: data source, degrade-vs-require, scope of v1, where a
thing lives. Do *not* ask about decisions that don't change the build.

### 2. Study the system before touching it
Read the files the move will touch. Name the patterns it must fit:
the vertical-pack shape, `brain.mjs` imports, the bot-brain fast-path
convention, `operator-todos`, the Mac→git→Vercel one-way sync. **Build with
the grain of what exists** — extend a pattern, never bolt on a parallel one.

### 3. Expand the idea — honestly
Turn the one-line idea into its real surface area: every file, agent, route,
and wiring point. Then state plainly what is **not** possible and where the
feature must **degrade gracefully**. Faking a capability is worse than a
smaller honest one.

### 4. Decompose into tracked work
Break the move into a short phased plan and an explicit **file map**
(path · new/edit · purpose). Open a task per phase; mark them in_progress /
completed as you go. Commit each phase before expanding scope.

### 5. Name the risks
What could break a Vercel build (TypeScript, ESLint). What could regress.
What needs a daemon or the Telegram poller restarted to take effect.

### 6. Verify before claiming done
Run the concrete checks: `node --check` on new `.mjs`, a functional test,
`tsc --noEmit`, `next lint --dir src`. A test that catches a real bug is the
goal — fix it, re-run. "I wrote the file" is not "it works."

### 7. Ship clean
One **paste-once** deploy command. State what is live immediately vs. what
needs a poller/daemon restart. Be honest about what shipped.

## Day14 honesty constraints (apply in step 3, every time)

- **Data**: official public records + licensed APIs only. Never scrape
  Zillow/Redfin or county web pages.
- **Hosted dashboards can't write to the Mac.** A Vercel page that needs to
  change state routes the action through Telegram (pre-filled `t.me` link),
  the same way the operator to-do buttons do.
- **Prefer deterministic over API-quota-dependent.** If a formula can do it
  without a key, it should; the API only sharpens the result.
- **Degrade cleanly with no key** — and say so in the UI/output.
- **The sandbox cannot `git push`.** Builds ship via a command Jack pastes.

## Anti-patterns this catches

```
Idea → start coding immediately → discover the fork halfway → rework
Idea → invent a new parallel system next to the one that exists
Idea → promise a capability the data source can't actually deliver
Idea → "done" without tsc / lint / a functional test
Idea → five separate deploy pastes instead of one
```

The fix is the seven steps, in order.

## When invoked

- Jack brings any new feature, segment, agent, dashboard, or expansion
- Before opening the first task of a multi-step build
- Whenever a request is broad enough that v1's shape is genuinely unclear

## The artifact

`scripts/move-architect.mjs` runs this playbook on an idea and writes an
**expansion spec** to `businesses/_shared/move-specs/` — restated idea,
clarifying questions, honest constraints, phased plan, file map, risks,
verification checklist, ship plan. Telegram `architect <idea>` or
`plan <idea>` triggers it. Every move goes on the record.

## Hard rules

1. **Never start a multi-step build before the fork points are answered.**
2. **Never fake a capability** — degrade honestly and say so.
3. **Always verify** (tsc + lint + a functional test) before "done".
4. **Always ship in one paste** and name what needs a restart.

## Logging

`[YYYY-MM-DD HH:MM ET] move-architect → spec drafted: {title}, {N} clarifying questions, {M} files mapped`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('move-architect', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'move-architect', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
