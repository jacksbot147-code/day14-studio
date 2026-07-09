---
name: cadence-sentinel
description: Output-freshness watchdog — sweeps the cadence contract table (scripts/_generic/cadence-contracts.mjs) comparing each agent's newest output-file mtime against its declared max age, and Telegrams Jack one card per run on state change only. The missing half of fleet observability - heartbeats say a process is alive; this says the work is actually landing.
triggers:
  - "cadence"
  - "output freshness"
  - "stale output"
  - "silent death"
  - "is the cfo alive"
  - "agent stopped producing"
---

# cadence-sentinel

> The June/July failure class: cfo-agent silent 32 days, product-strategist
> 27, investor-relations missed a month-wide update, admin-sync's push leg
> dead 5 weeks — all with green dashboards, because fleet health watches
> heartbeats and none of these agents emit one. Their failure surface is
> output staleness. This skill watches the outputs.

## Inputs
- `scripts/_generic/cadence-contracts.mjs` — the contract table. Each
  entry: `agent`, `file` (exact path) OR `dir`+`pattern` (newest match
  wins), `maxAgeHours` (nominal cadence + deliberate slack), `severity`
  (P1/P2/P3), `enabled`.
- Filesystem mtimes only. No log parsing, no LLM.

## What it does
1. Evaluate every enabled contract → `ok` / `breach` (older than max age)
   / `missing` (no output exists at all).
2. Diff against `_shared/founder-ops/cadence-sentinel-state.json`.
3. On state change ONLY (new breach or recovery), queue one Telegram card
   to `_shared/telegram/outbox/` — P1 if any new P1 breach, else P2;
   recoveries alone are P3. Repeat breaches stay silent (no spam —
   proactive-monitor's philosophy).
4. Persist the new state atomically (temp-then-rename).

## Output
- `_shared/founder-ops/cadence-sentinel-state.json` — per-agent status +
  age; its mtime IS this agent's own health signal.
- `_shared/poller/cadence-sentinel.log` — one line per run.
- Telegram cards on transitions only.

## Hard rules
1. **Alert on state change only.** A breach alerts once and once on
   recovery — never per-run nagging.
2. **Never touch the watched outputs.** Read-only on everything except
   its own state/log/outbox files.
3. **No heartbeat, deliberately.** As a 30-min one-shot it would trip the
   watchdog's 12-min stale rule. Health = state-file mtime.
4. **Missing output = breach.** "Never ran" and "died" are
   indistinguishable from mtimes; both deserve a card.
5. **Contract edits are code review, not runtime config.** The table
   lives in the repo so changes are versioned and Jack-visible.

## Failure modes
- **Contract path typo** → that agent reads as `missing` forever; the
  card text includes "no output found" so Jack can spot config vs death.
- **Corrupt state file** → treated as first run; one re-alert for
  standing breaches (acceptable — better than silence).
- **No TELEGRAM_CHAT_ID** → state still updates, card skipped, logged.
- **Agent intentionally retired** → set `enabled: false` in the table;
  don't delete the entry (history stays interpretable).

## When invoked
- Every 30 min via `com.day14.cadence-sentinel` (launchd one-shot,
  installed by `scripts/install-reliability-agents.sh`).
- Manually: `node scripts/cadence-sentinel.mjs --dry-run` (no card) or
  `--selftest` (fixtures only, no fleet paths).

## Logging
`[YYYY-MM-DD HH:MM ET] cadence-sentinel → contracts: N, green: G, breaches: B, changes: C`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('cadence-sentinel', context)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'cadence-sentinel', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
