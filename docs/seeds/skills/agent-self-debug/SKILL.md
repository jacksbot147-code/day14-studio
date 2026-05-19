---
name: agent-self-debug
description: When an agent is about to surface a failure or "I'm stuck" to Jack, this skill runs first — 5 standard checks that catch ~70% of false-alarm escalations. If the agent honestly can't unstick itself, escalation proceeds. Supporting skill for all Day14 OS agents.
triggers:
  - "I'm stuck"
  - "failed to"
  - "error"
  - "can't proceed"
  - "blocked"
---

# agent-self-debug

> Every "agent escalation" costs Jack ~5 min of attention. If the
> agent can self-resolve, that's saved. This skill is the 60-second
> sanity sweep before pinging the operator.

## The 5 standard checks (run all 5 before escalating)

### Check 1 — Did I read all required files for this skill?
Every skill lists "ORIENTATION" or "Inputs" files. Did the agent actually read them, or did it act on assumptions?

Fix: re-read the orientation files.

### Check 2 — Am I using stale state?
The state files (MASTER_LOG, customers.row, dossier files) may have updated since the agent's last read. The "blocker" may already be resolved.

Fix: re-fetch state. Specifically:
- `git pull` if a remote repo
- Re-query the relevant Supabase row
- Re-read MASTER_LOG for the last 5 entries

### Check 3 — Is there a skill for this situation I haven't invoked?
26+ skills exist. The "blocker" may have an explicit playbook.

Fix: scan `~/Documents/businesses/_shared/skills/` for skill names matching the situation. Common misses:
- API key issue → `leaked-secret-cleanup`
- Vendor flow not working → `browser-driven-vendor-setup`
- Question unclear → `council-question-quality-check`
- Want to ship rough → `action-bias-coach`

### Check 4 — Am I trying to do something on the agent's "never" list?
Each agent prompt has a "boundary list" of forbidden actions. If the blocker is "the system won't let me deploy to prod" — that's not a bug, that's the rule.

Fix: respect the rule. Surface to Jack as approval request, not as a blocker.

### Check 5 — Is this an environment issue I can route around?
- Sandbox path missing → use host path
- WebFetch blocked → ask Jack to fetch / paste
- API rate-limited → retry with backoff
- File permission denied → fix permissions, don't escalate

## The escalation triage

If all 5 checks pass and the agent is genuinely stuck:

### Yes, escalate IF:
- The blocker requires Jack's input that can't be inferred
- The blocker requires a manual action only Jack can take (payment, password, OAuth)
- The blocker is genuinely novel (no skill exists)
- The agent has already retried 2x with no progress

### No, don't escalate IF:
- The blocker is a known pattern with a skill
- The blocker is a transient error (network / API)
- The agent hasn't actually tried the obvious fix
- The blocker is "I'm not sure" (= the agent should ask itself harder questions, not Jack)

## Output

If the agent passes the 5 checks and escalates, the escalation message
to Jack must include:

```
Self-debug complete. Checks run:
- Read all required files: yes
- State fresh: yes (last fetched at {timestamp})
- Scanned skills for match: no match found for {situation}
- Within boundary rules: yes
- Routable: no (genuine blocker)

Escalation reason: {one sentence}
What I'd do if you said "decide": {one specific action}
What I'd do if you said "wait": {one specific action}
Default in 4h with no decision: {safe fallback}
```

This format forces the agent to think before escalating AND gives
Jack a one-tap path to act.

## Hard rules

1. **Never escalate without running all 5 checks.** Even when the agent "knows" the answer.
2. **Never escalate twice for the same issue without new information.** If checked + escalated + Jack didn't decide → wait, don't re-spam.
3. **Always offer a default action** if no decision in 4h. Jack might be unreachable.
4. **Never blame Jack** for the blocker. Frame as agent's own confusion.

## Failure modes

- **Agent is in an infinite self-debug loop:** rare; if it happens, fall back to surfacing the loop itself as the escalation
- **Agent fixes its own problem and forgets to log it:** every self-resolve should be logged so we learn the pattern
- **Agent skips checks because it "knows" the answer:** auditable via logging — penalize this pattern in the postmortem

## Logging

When checks fix the problem:
`[YYYY-MM-DD HH:MM ET] agent-self-debug RESOLVED → check_N matched, self-corrected, no escalation needed`

When checks pass and escalation proceeds:
`[YYYY-MM-DD HH:MM ET] agent-self-debug ESCALATED → checks_run: 5, all_passed, escalating to Jack via approval card`

Quarterly: count the resolve-vs-escalate ratio. >80% self-resolve = healthy. <50% = the checks need to be expanded.

## When invoked
- BEFORE any agent escalation
- BEFORE any "I'm stuck" output to Jack
- Automatically when an agent encounters a failure mode it doesn't know
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('agent-self-debug', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'agent-self-debug', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
