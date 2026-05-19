---
name: council-decision
description: Run the LLM Council protocol on a Day14 business decision — five named advisors with distinct lenses, anonymized peer review, Chairman recommendation. Use whenever a decision involves $1k+ revenue, 4+ hours of irreversible work, or a fork-in-the-road call between strategies. Logs every run to ~/Documents/businesses/_shared/council-log/NNNN-short-name.md.
triggers:
  - "should I"
  - "decision"
  - "vs"
  - "or should we"
  - "fork in the road"
  - "council"
  - "second opinion"
---

# council-decision

> The decision-quality skill. When Jack faces a real fork, this skill
> forces five fully-committed lenses, then anonymizes them so the
> answer doesn't carry the bias of who said it.

## When to invoke

Invoke automatically when the prompt is a decision that meets ANY of:
- **$1k+** revenue or cost impact
- **4+ hours** of work that's hard to undo
- **Strategic** (pricing, positioning, channel, hire, pivot)
- User says "should I", "council", "second opinion", "decision"

Do NOT invoke for:
- Tactical choices under 30 minutes of work
- Pure factual questions ("what time is X")
- Style/voice edits (use `day14-voice` skill instead)

## Protocol — exactly five stages, no skipping

### Stage 1 — Five advisors

Write the question once at the top. Then answer it five separate
times, fully in character, no hedging, no "on the other hand":

1. **The Contrarian** — find what fails. Most likely failure mode.
   What is the user not seeing? Be blunt.
2. **The Reframer** — strip every assumption from the question.
   Rebuild from scratch. Often the question itself is wrong.
3. **The Expansionist** — find the upside the user is missing. The
   bigger version. The opportunity hiding inside the framing.
4. **The Outsider** — zero context about this industry or role. Smart
   generalist seeing it for the first time. What looks weird?
5. **The Executor** — Monday morning only. Skip theory. Single
   concrete first action. Smallest version that ships this week.

Each advisor: ~100-150 words. Stay in character. No advisor knows what
the others said.

### Stage 2 — Anonymize + peer review

Relabel the five as Response A, B, C, D, E with a shuffled mapping
(do NOT reveal which advisor is which). Then as a neutral reviewer:

1. Which response is strongest, and why?
2. Which has the biggest blind spot, and what is it?
3. What did all five miss?

### Stage 3 — Chairman

Three things, kept short:
- Final recommendation in plain language
- The single most important reason behind it
- One concrete next step Jack can take today

## Logging contract

Every Council run is logged to:

  `~/Documents/businesses/_shared/council-log/NNNN-short-name.md`

Where `NNNN` is the next 4-digit sequence and `short-name` is a
3-5 word kebab-case slug. The file uses the format shown in entry 0001
(first-customer-acquisition). Quarterly: re-read the log and note
which Chairman calls aged well.

## Failure modes

- **Advisors collapse into each other.** Each advisor must stay
  committed to their lens. If the Contrarian starts hedging, you've
  drifted. Restart that advisor.
- **The shuffle is fake.** If A is always Advisor 1, the anonymization
  did nothing. Genuinely shuffle the mapping.
- **Chairman just averages.** The Chairman's job is to pick, not to
  average the five takes into mush. A real recommendation has a winner.

## Why this works

Five lenses surface what one lens misses. Anonymization strips out
"the Executor always wins" bias. The Chairman forces a call. The log
builds Jack's institutional decision history — by run 50, you can
re-read 1-50 and see whose lens has been most often right for Day14.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('council-decision', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'council-decision', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
