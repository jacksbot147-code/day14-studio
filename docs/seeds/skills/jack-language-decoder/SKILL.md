---
name: jack-language-decoder
description: Translate Jack's distinctive operating vocabulary into agent actions. He says "going" (start work), "do whatever helps" (act with judgment), "start it at 340" (specific time anchor). Prerequisite for telegram-command-router. Phase 1 prereq.
triggers:
  - "what does jack mean"
  - "jack said"
  - "operator vocabulary"
  - "decode operator"
---

# jack-language-decoder

> Jack's phrases are short and consistent. Different from typical
> developer-talk. Without this skill, an agent overthinks
> ambiguous-seeming text. With this skill, "going" reliably means
> "start the work now."

## The vocabulary table

| Phrase / pattern | Means | Default action |
|---|---|---|
| `going` / `let's go` / `let's go go go` | start the work now | begin immediately, don't ask |
| `yes yes yes` | full speed ahead, no hesitation | proceed without checkpointing |
| `keep going` / `keep on cranking` / `keep grinding` | continue current track | do not pause to summarize |
| `lets crank` | same as above; full speed | continue |
| `do it for me` | handle autonomously where safe | act; stop only at boundary rules |
| `do whatever helps` | act with judgment | pick reasonable defaults; report briefly |
| `take care of everything` | handle the whole loop | execute end-to-end; surface only blockers |
| `fix this` | identify error then fix | diagnose; if fixable cleanly, fix; surface if not |
| `ok` (alone, mid-task) | acknowledgment, continue | proceed |
| `ok lets go to bed` | session winding down | finalize; produce closeout summary |
| `start it at {time}` | scheduling anchor | set a fireAt at that wall-clock time |
| `fire everything right now` | trigger queued items | execute pending scheduled work |
| `DONT SCHEDULE LETS JUST WORK` | stop deferring, do now | execute inline; cancel any scheduling impulse |
| `whats next` / `what should I do` | seeking direction | list 2-3 concrete next moves with stakes |
| `it costs $60` (with no question) | clarifying constraint | acknowledge + adjust without re-pitching |
| `but i already have an X` | constraint disclosure | factor X into the next recommendation |
| `also` (leading new ask) | tack-on, not pivot | answer current thread; queue the new ask after |
| `we need to also` | parallel additive scope | add to backlog; don't drop current work |

## Tone signals

| Cue | Reading | Response shape |
|---|---|---|
| all lowercase + no punctuation | casual / fast | match: short, low-formality, direct |
| ALL CAPS | strong preference / urgency | respect the preference; don't over-explain |
| no greeting | mid-conversation; continue | no greeting back; pick up the thread |
| "ok but" / "wait" | course correction | stop current direction; ask 1 clarifying or pivot |

## What NOT to assume

- **"sounds good" does NOT mean approve a pending card.** It means "I heard you." Require explicit `approve N` or button tap for approvals.
- **A reply with one word ("nice", "cool")** is acknowledgment, not direction. Don't escalate to action without further signal.
- **Missing reply for >10 min** is not consent. Don't auto-proceed on prior ambiguous direction.

## Integration with telegram-command-router

When `telegram-inbound-parser` flags low-confidence parse, run through this skill BEFORE routing. The skill bumps confidence scores when Jack-language patterns match.

Example flow:
1. Inbound: "ok keep going"
2. Parser: low confidence (which task?)
3. Decoder: matches `ok` (continue) + `keep going` (continue current track)
4. Decoder updates confidence to 0.95; route = continue last-active task
5. Router resumes the most-recent in-progress task

## Hard rules

1. **Never invent a Jack-phrase that isn't observed.** This table is empirical; new entries require explicit Jack confirmation or 3+ observed instances.
2. **Never override an explicit command** with a decoder interpretation. If Jack types `reject 42`, that's a literal command — don't second-guess.
3. **Update the table monthly** based on new patterns; surface proposed additions as approval cards.

## How the table grows

Each new pattern Jack uses 3+ times gets a row. Quarterly review of MASTER_LOG should surface:
- Phrases that produced confused agent responses (gap)
- Phrases the agent decoded correctly without table support (codify)

## When invoked
- Inside `telegram-inbound-parser` for confidence boost on low-match
- Inside `telegram-command-router` for ambiguous routing
- Manually when Jack's message produced wrong action (postmortem fodder)

## Logging
`[YYYY-MM-DD HH:MM ET] jack-language-decoder → input: "{first 30 chars}", matched: {pattern_name}, action: {what}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('jack-language-decoder', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'jack-language-decoder', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
