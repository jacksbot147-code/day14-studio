---
name: growth-always-on
description: The default posture for Day14 OS — growth is continuously running. Every agent action is logged. Every 2-occurrence ad-hoc pattern auto-drafts a SKILL.md. Jack's only friction is the one-tap approval. Override of skill-promotion-criteria's 3-occurrence rule.
triggers:
  - "growth always on"
  - "self-expanding default"
  - "auto-draft skills"
---

# growth-always-on

> Default: the empire keeps growing. No manual "check for gaps."
> No "should we make this a skill" deliberation. The system watches,
> drafts, surfaces. Jack approves. Empire compounds.

## The always-on contract

Three components run continuously:

1. **work-register** (`src/lib/work-register.ts`)
   Every agent action logs to `~/Documents/businesses/_shared/growth/work-register.jsonl`.
   Especially: ad-hoc actions where no skill matched.

2. **growth-watcher daemon** (`scripts/growth-watcher.mjs`)
   Polls work-register every 5 min.
   Detects 2+ ad-hoc patterns across distinct contexts.
   Auto-drafts SKILL.md to `seeds/skills/_drafts/{name}/`.
   Queues Telegram approval card (P3 — no buzz, just digest entry).

3. **Jack's approval loop**
   Reviews `_drafts/` periodically (or via Telegram).
   For each draft: refine + promote OR archive.

## The relaxed promotion threshold

`skill-promotion-criteria` defines the 3-occurrence rule for FULL promotion.
`growth-always-on` overrides at the DRAFT stage:

- **2+ occurrences across 2+ distinct contexts** → auto-draft (no approval needed for draft)
- **3+ occurrences with Jack's tap-approval** → promotion to `_shared/skills/`
- **<2 occurrences** → just log; no draft

The draft is cheap (text in a file). Promotion is the real commitment.

## Why "always-on" beats "occasional harvest"

- **Forgetting**: occasional harvests miss patterns that fade between runs
- **Coupling**: doing this manually creates a "skill harvest day" that competes with customer work
- **Compounding**: continuous wins compound; weekly wins don't
- **Cheap drafts**: a draft SKILL.md is ~1 min of inference; the marginal cost is zero
- **Removes the deliberation step**: agents stop wondering "should I log this?" — they always do

## What changes for every agent

Every agent now:

1. **Imports work-register** at the top of any code path
2. **Calls `logAction()`** for every substantive operation
3. **Calls `logAdHoc()`** explicitly when no skill matched
4. **Calls `logSkillInvocation()`** when a skill DID match (for skill-coverage-auditor)

Like this:

```ts
import { logAdHoc, logSkillInvocation } from "@/lib/work-register";

// When an agent did something with no skill backing:
await logAdHoc(
  "watermark visit photo with brand mark in bottom-right",
  `customer-${slug}`,
  "tech uploaded 4 photos; no auto-watermark step in current pipeline"
);

// When a skill DID handle the work:
await logSkillInvocation("day14-voice", `customer-${slug}-eod-email`, slug);
```

## How Jack interacts

Three touchpoints, all low-friction:

1. **Daily**: growth-watcher's P3 messages batch into the morning digest. Jack glances; ignores or taps.
2. **Weekly**: `~/Documents/studio/docs/growth-log.md` review during Sunday council.
3. **On-demand**: Jack can browse `~/Documents/studio/docs/seeds/skills/_drafts/` anytime to see pending growth candidates.

## What Jack does NOT have to do

- Manually scan for patterns
- Decide each gap is "worth a skill"
- Write SKILL.md from scratch
- Track skill-naming collisions
- Update bootstrap.sh

All those = handled by growth-watcher + skill-spec-generator + skill-naming-validator + skill-registrar.

## Hard rules

1. **Never promote a draft to _shared/ without Jack's explicit approval.** Drafts ≠ deployed.
2. **Always log ad-hoc actions** — silent skipping defeats the system.
3. **Always batch Telegram approvals as P3** — never interrupt Jack for a growth proposal.
4. **Never lower threshold below 2 occurrences**. 1 = false signal.
5. **Always preserve the work-register** — never delete; the audit trail compounds.

## Failure modes

- **Work-register grows huge**: archive monthly to `work-register-{YYYY-MM}.jsonl`; keep current month hot
- **growth-watcher generates bad drafts** (vague phrases → vague skills): tighten the normalizePhrase logic; surface failure pattern to operator
- **Drafts pile up without Jack reviewing**: weekly council pass cleans them
- **Same pattern keeps drafting because Jack archives without promoting**: add to `seen.proposed_phrases` so it doesn't re-fire

## When invoked

This is THE default posture. Every Day14 OS agent runs in this mode unless explicitly opted out.

## Logging

Continuous via the work-register itself. Growth-watcher logs each draft to:
`~/Documents/businesses/_shared/growth/growth-log.md`

Each entry includes:
- Timestamp
- Drafted skill name
- Phrase observed
- Occurrence count + contexts
- Status (pending review / promoted / archived)

## Cross-skill flow (always-on mode)

```
Agent doing work
       ↓
logAction() / logAdHoc() / logSkillInvocation() → work-register.jsonl
       ↓
(every 5 min)
       ↓
growth-watcher.mjs scans
       ↓
2+ occurrences across 2+ contexts?
       ↓ yes
auto-draft SKILL.md → seeds/skills/_drafts/{name}/
       ↓
P3 Telegram notification (batched into digest)
       ↓
Jack reviews when convenient
       ↓
Approves → skill-registrar promotes to _shared/skills/
       ↓
Re-run bootstrap (or auto-deploy via Phase 4 webhooks)
```
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('growth-always-on', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'growth-always-on', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
