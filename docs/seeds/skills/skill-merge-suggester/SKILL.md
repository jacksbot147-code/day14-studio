---
name: skill-merge-suggester
description: Detect when two skills overlap >60% in scope/triggers and propose merging them. Counterweight to growth — prevents the empire from accumulating near-duplicates.
triggers:
  - "duplicate skill"
  - "skills overlap"
  - "merge candidates"
  - "redundant skill"
---

# skill-merge-suggester

> Growth-watcher adds skills aggressively (2-occurrence rule for drafts).
> Without a merge counterweight, near-duplicates accumulate.
> This skill is the dedup pressure.

## The overlap detection

Run pairwise comparison across all installed skills. For each pair (A, B):

### 1. Trigger overlap
Compute Jaccard similarity of trigger sets:
- intersection: count of triggers present in both
- union: count of distinct triggers across both
- score = intersection / union

If score > 0.5 → overlap signal.

### 2. Description similarity
Embed (or use a simple TF-IDF) both descriptions; compute cosine.
If > 0.7 → strong overlap signal.

### 3. Section structure overlap
If both skills have the same section names + similar bullet counts:
- "When to invoke" sections share >70% concepts
- "Hard rules" share >50% rules
→ overlap signal.

### 4. Parent_anchor match
If both skills declare the same parent_anchor → flag for "should be sub-skills of each other, not siblings."

## Aggregate score

Compute a merge-likelihood score 0.0-1.0 across the 4 signals. If > 0.6 → propose merge.

## The merge proposal

Output to `~/Documents/studio/docs/skill-merges.md`:

```
# Merge proposal — {date}

## Pair: skill-A ↔ skill-B

**Overlap score:** 0.78
**Signal breakdown:**
- Triggers Jaccard: 0.65 (4 of 9 triggers shared)
- Description cosine: 0.82
- Section structure: 70%
- Parent_anchor match: both null

**Recommended action:** Merge into single skill named `{proposed-name}`.

**Migration steps:**
1. New SKILL.md taking the best of both
2. Keep skill-A's name (older / more invocations); archive skill-B
3. Update bootstrap.sh
4. Update any references in other skills + agent prompts

**Estimated effort:** 30-45 min
**Surface as approval card?** yes

OR

**Alternative:** Keep both if {reason — e.g., different audience, different urgency tier}.
```

## When NOT to merge

Two skills overlap but should stay separate when:
- They serve different agents (e.g., one for build-agent, one for QA-agent — even if logically similar)
- They have different urgency profiles
- They live in different packs (build vs ops vs customer)
- One is anti-pattern (`no-*`) and the other is positive — never merge those

## Hard rules

1. **Never auto-merge.** Always proposal + Jack approval.
2. **Always preserve archived skill** in `_archived/` — reversible.
3. **When merging: take the better name, the better description, the union of triggers, the union of hard rules.** Quality > quantity.
4. **Always update the cluster map** in day14-os-skills-and-empire.md after a merge.

## When invoked

- Monthly via scheduled task (after `skill-coverage-auditor`)
- After every 10 new skill additions (post-`growth-watcher` activity burst)
- Manually when Jack notices "these two feel like the same thing"

## Logging

`[YYYY-MM-DD HH:MM ET] skill-merge-suggester → pairs_scanned: N, proposals: N, surfaced_to_jack: N`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('skill-merge-suggester', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'skill-merge-suggester', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
