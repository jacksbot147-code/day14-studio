---
name: scheduled-task-prompt-author
description: Use whenever Jack (or another agent) needs to author a new scheduled-task prompt that will run in a fresh Cowork session with no operator present. Returns a self-contained prompt that follows the Day14 OS contract — reads SCHEDULED_TASK_CONTEXT.md first, logs to MASTER_LOG, writes a numbered status report, never asks questions, never deploys. The pattern is empirical: refined across 11+ overnight runs in `docs/overnight/`. Invoke before scheduling any cron-style or one-shot autonomous task — including via `mcp__scheduled-tasks__create_scheduled_task`.
triggers:
  - "schedule a task"
  - "overnight task"
  - "cron"
  - "fires at"
  - "scheduled task"
  - "while I'm asleep"
  - "while I'm at work"
  - "morning briefing"
  - "EOD report"
  - "nightly"
  - "create_scheduled_task"
---

# scheduled-task-prompt-author

> Every scheduled task is an agent without an operator. The prompt has
> to do four things at once: orient the agent, name the scope, name
> the contract, and name where to write the result. Get any one of
> those wrong and you wake up to either silence or noise. This skill
> exists because we've now run 11+ overnight tasks and the pattern
> that works is consistent.

## When to invoke

Invoke automatically when ANY of:

- Jack is about to call `mcp__scheduled-tasks__create_scheduled_task`
- A user message contains "every morning / every day / nightly / each
  Monday / overnight / at 9am / in two hours"
- An agent prompt under `docs/overnight/AGENDA-*.md` is being drafted
- A Cowork session is queueing >1 future-fire task in a batch

Do NOT invoke for:

- A task Jack is going to run synchronously in the current session
- A one-line reminder ("ping me at 3pm") — Apple Reminders is the
  right tool, not Cowork
- A task whose output Jack needs to confirm interactively before the
  next step (those are operator workflows, not scheduled tasks)

## The 5-section shape

Every scheduled-task prompt has five sections, in this order. Skip
none. Order matters — the agent reads top-to-bottom.

### 1. Identity + scope (1 line)

What this task is and why it exists. ≤25 words. Example:

> You are running the Day14 overnight runbook pre-flight audit. Your
> job is to verify every command in `day14-mac-mini-runbook.md` will
> work tomorrow.

### 2. Orientation (1 line)

Always:

> Read `~/Documents/studio/docs/SCHEDULED_TASK_CONTEXT.md` first.
> Everything you need to know about Day14, the empire, the voice, and
> the file layout is in there.

This is non-negotiable. The scheduled-task agent has no memory; this
file is the orientation. If you skip this line, the agent produces
generic output that doesn't match Day14's conventions.

### 3. The actual task (5–15 bullets)

Numbered or bulleted, plain English, one action per line. Reference
files by absolute path under `~/Documents/`. Example from
`overnight-01-runbook-preflight`:

> 1. Walk every shell command in
>    `~/Documents/studio/docs/day14-mac-mini-runbook.md` and verify
>    each one's tool / URL still resolves.
> 2. Fetch the current Mac mini M4 24GB/512GB pricing from apple.com.
> 3. Identify the closest SWFL Apple Store with same-day pickup
>    inventory.
> 4. Surface any runbook edit needed before Jack walks into the store
>    tomorrow.

Be specific about WHAT, not HOW. Don't tell the agent which tools
to invoke unless ordering matters. Trust it to pick.

### 4. Output contract (3–5 lines)

The agent must write a single status report to a known path. The
convention:

> When done, write your report to
> `~/Documents/studio/docs/overnight/{NN}-{kebab-task-name}.md`.
> Use the standard report shape (headline / what landed / what didn't
> / decisions worth surfacing / recommended next actions / files
> touched). Include a confidence rating 0.0–1.0 in the headline.
>
> After writing the report, append one line to
> `~/Documents/studio/docs/overnight/MASTER_LOG.md`:
>
>   `[YYYY-MM-DD HH:MM ET] {task-id} COMPLETE → {report-filename}, confidence: 0.85`

`{NN}` is the next 2-digit sequence in `docs/overnight/`. The
end-of-day report uses `00-end-of-day-status.md` (prefix `00` sorts
first); the morning briefing uses `00-wakeup-status.md` for the same
reason.

### 5. Operating contract (4–6 lines, copy verbatim)

These rules are not optional. Paste them verbatim into every prompt:

> - You are running autonomously. Jack is not present. Do not ask
>   questions — make reasonable choices and note them in your output.
> - Drafts only. Do NOT run `npm install`, `npm run build`, `npm run
>   dev`, `git push`, `vercel deploy`, or any command that mutates a
>   remote system.
> - If you cannot complete the task, write your partial findings to
>   the report path above AND append a blocker line to
>   `~/Documents/studio/docs/overnight/QUESTIONS_FOR_MORNING.md`.
>   Then exit. Do not retry.
> - Do not modify `~/Documents/splash-jacks-pools/` — it's read-only
>   reference.
> - You may Read/Write/Edit files under `~/Documents/studio/` and
>   `~/Documents/studio-templates/`. You may run `ls`, `find`, `grep`,
>   `cat` via bash. Anything outside those bounds: log + skip.

## The standard report shape (Section 4's contract)

Every overnight report follows this structure. Authoring this is
what every scheduled task is REALLY doing:

```markdown
# {Task title} — {YYYY-MM-DD}

**Date:** {date}, {time-of-day}
**Scope:** {one-line scope}
**Confidence:** {0.0–1.0}

## Headline
{2–4 sentences. What's the headline finding. Lead with the verdict.}

## What landed (or: What shipped today)
{Concrete bullets. Files written, commands run, decisions made. Each
bullet starts with a verb.}

## What didn't land
{What was in scope but didn't get done, and why. No excuses, just
facts. If everything landed, write "Nothing — all scope completed."}

## Decisions worth surfacing
{Numbered list. Anything Jack needs to know about WHY you did
something a particular way. Especially: trade-offs, abnormal choices,
new patterns introduced.}

## Recommended next actions
{Prioritized. Top of list is the highest-leverage next move. Include
estimated time + whether it gates on Jack's credentials/approval.}

## Files touched
{Bullets. Absolute paths. Include "modified" / "created" / "deleted"
tag if not obvious.}
```

Reference exemplars: `docs/overnight/01-runbook-audit.md`,
`docs/overnight/03-customer-comms-pack.md`,
`docs/overnight/07-content-polish.md`. All three follow this shape.

## File numbering convention

Per `docs/overnight/`:

- `00-end-of-day-status.md` — written by the final task of a daytime
  batch (sorts first under default `ls`)
- `00-wakeup-status.md` — written by the final overnight task /
  morning briefing
- `0{N}-{kebab-task-name}.md` — per-task reports, N = sequence in the
  batch
- `MASTER_LOG.md` — append-only timestamped completion lines
- `MORNING_BRIEFING.md` — phone-friendly digest from
  `00-wakeup-status.md`
- `QUESTIONS_FOR_MORNING.md` — blockers; only created if a task
  hit one
- `AGENDA-{YYYY-MM-DD}.md` — the operator's plan for the batch (Jack
  writes this; agents read it for cross-task context)

If you're writing a one-off task (not part of a daily batch), pick a
descriptive kebab name and skip the numbered prefix — e.g.
`harvest-findings.md`, `chem-inventory.md`.

## Confidence rating discipline

Every report's headline includes a confidence number, 0.0–1.0:

- **0.95+** — I verified each claim by direct evidence (read the file,
  ran the command, got the response). Use sparingly.
- **0.85–0.94** — I verified the structure but couldn't ground every
  fact (e.g. couldn't reach an external URL from sandbox).
- **0.70–0.84** — I made reasonable inferences from partial evidence.
  Jack should sanity-check before acting.
- **<0.70** — I'm not confident. Treat as exploratory.

Example: `01-runbook-audit.md` is **0.85** (high on facts I could
verify by direct fetch; lower on live in-store inventory I couldn't
query). `03-customer-comms-pack.md` is **0.90** (all drafts checked
against the canonical voice rules; minor uncertainty on edge-case
character counts). Both numbers are calibrated, not vibes.

## Common failures (and the fix)

- **Agent asks Jack a clarifying question.** Cause: the prompt didn't
  cover the edge case AND didn't include the "make reasonable choices
  and note them" clause. Fix: always include section 5's clauses
  verbatim.
- **Agent writes report to the wrong path.** Cause: the path in
  section 4 was relative, not absolute, OR the agent was running in a
  different cwd than expected. Fix: always use absolute
  `~/Documents/...` paths and never assume cwd.
- **Agent hardcodes a session-specific path** (`/sessions/{adj}-{adj}-
  {adj}/mnt/...`). Cause: agent confused the workspace bash sandbox
  mount with the host path. Fix: use the host `~/Documents/...` form
  everywhere in the prompt. See sibling skill
  `session-path-hardcode-detector` (when built).
- **Multiple tasks fire on a sleeping laptop and stack at wake.**
  Cause: Cowork only fires scheduled tasks while running. Fix: the
  task-author can't prevent this — but the morning briefing task
  should always include "if other tasks fired in the last 12 hours,
  check their `lastRunAt` and surface any that show null."
- **Agent runs `npm install`, hits the registry block, aborts.**
  Cause: forgot to include the "drafts only" clause. Fix: section 5
  verbatim.
- **No report at all.** Cause: Cowork wasn't open, OR the agent
  errored without writing. Fix: the morning briefing task is
  responsible for detecting empty slots and naming them.

## Reference exemplars

When in doubt, copy the structure from a recent overnight run that
worked:

- `~/Documents/studio/docs/overnight/AGENDA-2026-05-16.md` — agenda
  builder (the 4-task batch for the night before the Mac mini arrival)
- `~/Documents/studio/docs/overnight/01-runbook-audit.md` —
  research-heavy verification task
- `~/Documents/studio/docs/overnight/03-customer-comms-pack.md` —
  content-generation task
- `~/Documents/studio/docs/overnight/07-content-polish.md` —
  editing/QA task
- `~/Documents/studio/docs/overnight/00-end-of-day-status.md` —
  consolidator / EOD task

## What this skill returns

When invoked, return three blocks:

```
TASK ID:        {kebab-name}
FIRES:          {ISO timestamp or cron expression}
TIME BUDGET:    {~N min}
OUTPUT PATH:    ~/Documents/studio/docs/overnight/{NN}-{kebab}.md
```

Followed by the full prompt text, ready to paste into the
`mcp__scheduled-tasks__create_scheduled_task` `prompt` argument.

## Why this skill exists

11+ overnight runs converged on the shape above. Earlier runs (before
the shape was named) produced reports in three different formats,
some skipped the orientation step, one wrote to the wrong directory
and was almost missed. Encoding the pattern as a skill means every
future scheduled task starts from the converged-on shape, not from
the author's best guess.

The pattern compounds. By task 50 the cumulative time saved on
"figuring out what shape the report should be" pays for the skill
many times over. Worth the 60 minutes to build.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('scheduled-task-prompt-author', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'scheduled-task-prompt-author', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
