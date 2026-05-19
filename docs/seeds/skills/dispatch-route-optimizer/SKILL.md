---
name: dispatch-route-optimizer
description: Given today's appointments + tech locations, compute optimal route. Saves 1-2 hours of driving per tech per day.
triggers:
  - "route optimization"
  - "optimize route"
  - "dispatch route"
pack: dispatch-routing
---

# dispatch-route-optimizer

## What it does

1. Reads today's appointment list with addresses
2. Geocodes (one-time cache)
3. Runs TSP-style optimization (greedy nearest-neighbor → 2-opt improvement)
4. Assigns appointments to techs based on:
   - Vehicle capacity (some services need bigger truck)
   - Tech skill match
   - Geographic clustering
5. Outputs optimized route + ETA per stop

## Hard rules

1. **Never violate appointment time windows** (customer-promised arrival).
2. **Always include buffer time** between stops (traffic, customer delays).
3. **Never assign last-stop > 30 min from base** (tech wants to go home).
4. **Always allow tech to override** — they know the area.

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('dispatch-route-optimizer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher`.
- **When it fails:** call `logAction({ action_phrase, context, invoked_skill: 'dispatch-route-optimizer', notes: 'failure_mode' })`. Feeds `postmortem-writer`.

Triggered by → `growth-always-on` skill.
