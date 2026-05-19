---
name: council-question-quality-check
description: Before running council-decision, verify the question is well-formed enough to produce useful advisor takes. Catches vague questions, leading questions, and unclear decision criteria. Supporting skill for council-decision.
triggers:
  - "council on"
  - "decision class"
  - "should I question"
  - "council prep"
---

# council-question-quality-check

> A Council run on a vague question produces vague advice. This
> skill is the question-tightener that runs before the protocol.

## Input
The question the user wants the Council to answer.

## The 5 quality gates (all must pass)

### 1. Concrete options on the table
A good question has 2-5 named alternatives. "How should we grow?" fails. "Should we focus on cold DMs, paid ads, or warm intros for customer #1?" passes.

If options aren't named → ask user to enumerate 2-5 specific options before proceeding.

### 2. Time horizon stated
"This week" / "next quarter" / "by Q1 2027". Without a horizon, advisors give mismatched-timeline takes.

If horizon missing → infer or ask. Default to "next 30 days" if unclear.

### 3. Decision class identified
One of:
- **Revenue/cost** — $1k+ at stake
- **Reversibility** — 4+ hours of work to undo
- **Strategic fork** — affects multiple future decisions
- **Hire/fire** — people decisions

If question doesn't fit any → it's probably not Council-worthy; use `action-bias-coach` instead.

### 4. Not leading
"Should we obviously do X?" / "Why is X the best option?" → advisors will herd toward X.

Rewrite to neutral framing: "What are the strongest takes on X vs Y vs Z?"

### 5. Clear criteria for "good answer"
What does a useful Chairman recommendation look like for this question? If it's "build the case study video Sunday" — concrete. If it's "consider improvements" — too vague to evaluate ageing.

## Output

If all 5 pass:
```
QUESTION READY FOR COUNCIL

Refined: "{refined question, possibly with tightened phrasing}"
Decision class: {revenue|reversibility|strategic|hire}
Horizon: {time}
Options on the table: {numbered list, 2-5}
Success criteria: {one sentence: "A useful Chairman recommendation will name a specific action and a deadline."}
```

If any gate fails:
```
QUESTION NOT YET READY

Failing gates: {list}
Needed before Council: {specific edits}
```

## Hard rules

1. **Never run Council on a question that fails gates.** Surfaces the gaps to the user instead.
2. **Never silently rewrite the question.** Always show the proposed refinement and ask for confirmation.
3. **Never invent options.** If the user named 2, don't pad to 5 with fakes. 2-option Council is fine.
4. **Never bypass this skill for "obvious" Council questions.** The 30-second check prevents bad output later.

## Logging

`[YYYY-MM-DD HH:MM ET] council-question-quality-check → result: {ready|N gates failing}, refined: {one-line}`

## When invoked
- ALWAYS before `council-decision` fires, automatically
- Manually when Jack drafts a Council question and wants a sanity check before running
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('council-question-quality-check', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'council-question-quality-check', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
