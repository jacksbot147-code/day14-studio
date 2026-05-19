---
name: skill-fire-wrapper
description: A standard TypeScript wrapper every skill invocation flows through. Auto-logs to work-register on fire, on miss, and on failure. Eliminates the manual logSkillInvocation/logAdHoc calls in every agent path.
triggers:
  - "fire skill"
  - "wrap skill invocation"
  - "auto-log skill"
---

# skill-fire-wrapper

> Without this skill, every agent has to remember to call
> `logSkillInvocation` AND `logAdHoc` AND `logAction` at the right
> moments. With it: one call wraps everything.

## The wrapper

```ts
import { logAction, logSkillInvocation, logAdHoc } from "@/lib/work-register";

export async function fireSkill<T>(
  skillName: string,
  context: string,
  handler: () => Promise<T>,
  options?: {
    customer_slug?: string;
    expected_match?: boolean; // false = ad-hoc fallback path
    on_failure_notes?: string;
  }
): Promise<{ result: T; fired: boolean; latency_ms: number }> {
  const t0 = Date.now();
  let result: T | undefined;
  let fired = false;
  let error: Error | undefined;

  try {
    result = await handler();
    fired = true;

    if (options?.expected_match === false) {
      // The skill was "fired" but was an ad-hoc fallback
      await logAdHoc(
        `${skillName} (ad-hoc fallback)`,
        context,
        options?.on_failure_notes
      );
    } else {
      await logSkillInvocation(skillName, context, options?.customer_slug);
    }

    return { result, fired, latency_ms: Date.now() - t0 };
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err));

    await logAction({
      action_phrase: `${skillName} failed: ${error.message.slice(0, 80)}`,
      context,
      invoked_skill: skillName,
      customer_slug: options?.customer_slug,
      notes: `failure_mode | ${options?.on_failure_notes ?? "no notes"}`,
    });

    throw error;
  }
}
```

## Usage pattern

Every place a skill gets invoked, wrap it:

```ts
// Before (manual logging — easy to forget):
const result = await runSomeSkill(input);

// After (auto-logged):
const { result, fired, latency_ms } = await fireSkill(
  'some-skill',
  `customer-${slug}`,
  () => runSomeSkill(input),
  { customer_slug: slug }
);
```

## Why this matters

- **No-forgetting**: agents can't skip logging — it's the wrapper
- **Latency tracking**: every fire records ms; feeds `skill-coverage-auditor`'s performance audit
- **Failure routing**: errors auto-log with `failure_mode` note → fed to `postmortem-writer`
- **Ad-hoc fallback flag**: when a skill's spec doesn't quite fit and the handler does a fallback, the wrapper flags it for growth-watcher

## Hard rules

1. **Never invoke a skill directly without the wrapper** in production code. Local dev / one-offs OK.
2. **Always pass a meaningful context string** — not just "default" or "test".
3. **Always re-throw errors** after logging. The wrapper logs; doesn't swallow.
4. **Never wrap a wrapper.** Skill A calling skill B = wrap B, not A.

## Failure modes

- **logAction itself fails** (disk full, etc.): wrapper proceeds; logging failures are non-blocking
- **Skill name typo**: surfaces in skill-coverage-auditor as "skill never fired" anomaly
- **Long-running skills (>30s)**: latency_ms grows; no upper bound but flagged in audit

## When invoked
- Inside any agent code that calls a skill
- Inside webhook handlers when invoking skill-functions-as-code
- Inside scheduled task prompts when calling the skill protocol

## Logging

The wrapper handles logging. Per invocation, expect:
- One `logSkillInvocation` line (or `logAdHoc` if fallback)
- One `logAction` line if error

The wrapper itself doesn't add a separate log — that would be double-counting.

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('skill-fire-wrapper', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'skill-fire-wrapper', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
