# Agent failure patterns — 2026-05-17

> Source: last ~200 lines of `~/Documents/businesses/_shared/poller/idea-worker.log`, covering 17:24Z → 21:02Z (≈3.5h of bot activity).
> Author: hour-2 scheduled empire-check.
> Companion to `agent-failure-patterns-*` series (none earlier — this is the first).

These three patterns account for the large majority of wasted Gemini calls, wasted Telegram sends, and orphan output files observed today. Fixing #1 alone would reclaim most of the day's wasted quota.

---

## Pattern 1 — Gemini 429 retry cascades, made worse by parallel worker spawns

**Evidence (19:57Z → 20:04Z window):**

```
19:57:42  429 rate limit — waiting 18s before retry 1/4
19:58:08  429 rate limit — waiting 52s before retry 1/4   ← second worker started
19:59:00  429 rate limit — waiting 59s before retry 2/4
20:00:00  429 rate limit — waiting 60s before retry 3/4
20:00:28  idea-worker starting: idea="Approved"            ← THIRD worker spawned
20:00:28  429 rate limit — waiting 32s before retry 1/4
20:01:00  429 rate limit — waiting 96s before retry 4/4
20:01:01  429 rate limit — waiting 59s before retry 2/4
20:02:05  429 rate limit — waiting 55s before retry 3/4
20:02:38  Gemini API error: Gemini API 429: ...quota exceeded...
20:03:00  429 rate limit — waiting 96s before retry 4/4
20:04:41  Gemini API error: Gemini API 429: ...quota exceeded...
```

**What happens:**
- The worker retries each rate-limited call up to 4 times with growing backoff (~18 → 96s).
- Jack tapping any new message during that window spawns another worker — which lands in the *same* free-tier RPM quota and immediately 429s on its first call. Now three workers are all competing for the same starved quota, each running their own 4-retry loop.
- Net effect: ~7 minutes of wall time, ~12 burned Gemini calls, **zero new useful output**. Total quota consumed: roughly 1 minute's worth of normal usage; total elapsed time wasted: ~7×.
- A 4th cascade ran again from 20:00:28 → 20:04:41 because the "Approved" reply spawned a fresh worker mid-storm.

**Why this is the priority:**
The cost is not "we wasted some retries" — it's that the worker burns the free-tier RPM allocation that the *next* legitimate run needs. The single-worker storm at 19:57 had already consumed quota; the second and third workers spawned *into* that depleted window are guaranteed-fail spawns.

**Proposed fix (cheap):**
1. Before any Gemini call in `idea-worker.mjs`, check a sidecar file like `~/Documents/businesses/_shared/poller/gemini-cooldown.json`. If the cooldown timestamp is in the future, return early with a queued P3 Telegram: "Quota cooling down until {time}. Your idea is queued and will resume automatically."
2. On any 429, write `{cooldown_until: now() + 90s, set_by: pid}` to that file.
3. Other workers landing in the cooldown window honor it without making their own call.

**Proposed fix (real):**
Switch the default model to `gemini-2.5-flash` (10 RPM × 4 = 40 RPM tier 1) or wire the worker to spend $5 to upgrade off free tier. The current free `gemini-2.5-flash-lite` (15 RPM) is fundamentally too small to support parallel runs.

---

## Pattern 2 — Single-word replies ("Go", "Approve", "Approved") spawn empty worker runs that ignore the pending Jack-tap

**Evidence (18:55Z → 19:44Z):**

```
18:55:42  idea="Let's create an Etsy store..."        → wrote draft, queued jack-tap, finished
18:58:12  idea="Go"                                   → 2 turns, queue_telegram only, no action
18:58:58  idea="Go means approved"                    → 2 turns, queue_telegram only, no action
19:34:57  idea="Go"                                   → 1 turn, queue_telegram only, no action
19:35:13  idea="On the Etsy store I wanted"           → 2 turns, queue_telegram only, no action
19:43:54  idea="Approve"                              → 1 turn, queue_telegram only, no action
19:44:34  idea="Go"                                   → wrote /studio/docs/seeds/skills/go.md ← junk artifact
```

**What happens:**
- Jack's "Go" / "Approve" / "Approved" are responses to a queued Jack-tap card from an earlier worker run.
- The worker treats each reply as a brand-new idea and either:
  (a) sends a confused "what would you like me to do?" Telegram, or
  (b) at 19:44:34, actually writes a new skill spec file named `go.md` because it interpreted "Go" as a skill request.
- Five of ~15 logged runs in this window are these throwaway/junk-output runs.

**Why it matters:**
- Each costs a Gemini call (contributing to the Pattern 1 quota burn).
- Each sends a noise Telegram to Jack (he learns to ignore the bot).
- One produced a *bad artifact* (`docs/seeds/skills/go.md`) that now lives in the skills tree and will confuse the registry.

**Proposed fix:**
- Before sending the user's text to Gemini, the idea-worker should:
  1. Check `~/Documents/businesses/_shared/telegram/outbox-archive/` and `outbox/` for the most recent file with `tap_required: true, payload.action: ...` from this `chat_id`.
  2. If the user's reply matches `/^(go|approve[d]?|yes|do it|ship it|ok)$/i` AND a pending tap exists, resolve the tap (execute the queued action or just acknowledge) instead of starting a new agent loop.
  3. If no pending tap, reply once with: "Nothing pending to approve — what would you like me to do?" and finish.

**Cleanup:**
Delete `/Users/jcboppington/Documents/studio/docs/seeds/skills/go.md` next time the sandbox can write there — it has no place in the skill registry.

---

## Pattern 3 — Successful tool call followed by 429 produces a partial artifact + orphaned context

**Evidence (19:57Z run):**

```
19:57:12  idea-worker starting: idea="Let's create an Etsy store..."
19:57:26  tool research: {"text":"Here are several unsaturated Etsy niches..."}  ← real data
19:57:39  tool write_file: /day14/content/drafts/etsy-store-plan-hyper-specific-digital-planners.md
19:57:42  429 rate limit — waiting 18s before retry 1/4
...
20:04:41  Gemini API error: Gemini API 429
```

**What happens:**
- The worker successfully ran research + wrote a first-pass draft.
- Its next planned turn would have been to *refine* the draft (the spec is suspiciously shallow — no listing title, no tags, no real prices — i.e. the model never got to a second pass).
- The 429 storm ate every retry attempt.
- The run ended with a half-baked artifact on disk and no follow-up. **There's no record that this draft is incomplete** — it looks finished to any downstream skill that picks it up.

**Why it matters:**
This is a silent quality failure. Hour 2 of this scheduled task verified the draft was shallow and had to deepen it by hand (see `~/Documents/businesses/day14/content/drafts/perimenopause-tracker-deep-spec.md`). Without that audit, the shallow draft would have become "the plan", and downstream skills would have built on it.

**Proposed fix:**
- When the worker exits via an exception path (Gemini error, network error, retry-exhausted), and at least one artifact was written this run, it should:
  1. Append a `<!-- INCOMPLETE: agent exited at turn N due to {reason} -->` footer to the most recent artifact.
  2. Queue a P3 Telegram: "Partial output — {file}. Run died at turn {N} ({reason}). Reply 'retry' to resume from the saved state."
- That way the failure is visible at the artifact level, not just in the log nobody reads.

**Bonus:**
Persist worker state per chat_id between runs (memory + last artifact path + turn number) so "retry" can pick up where the previous run died.

---

## Notes I'm NOT calling out as patterns (yet)

These showed up but only once each — too small to be a "pattern" with one data point:

- `ANTHROPIC_API_KEY missing` at 17:24:00 — worker started, immediately exited; suggests someone tried to invoke an Anthropic-backed path without the key set. Probably the LLM-fallback in `skill-runner.ts`.
- `tool run_bash: exit_code:1, stdout:"", stderr:""` twice at 19:44:36-37 — silent bash failures. Could be a sandboxing issue; worth instrumenting if it recurs.
- `tool write_file: writes restricted to: /Users/jcboppington/Documents/businesses/, /Users/jcboppington/Documents/studio/docs/` at 19:44:39 — the file-write tool has correct guardrails. Working as intended but the agent should learn to pick allowed paths first time rather than retry-and-recover.
- `Gemini API error: fetch failed` at 21:02:41 — this is the sandbox network limit noted in hour-1, not a real-host failure.

---

## Top-3 prioritized fixes (rank-ordered cost/benefit)

1. **Add cooldown sidecar to prevent multi-worker 429 thundering herd** — ~20 lines of code in `idea-worker.mjs`. Eliminates ~80% of wasted Gemini calls.
2. **Recognize approval-reply patterns and route to pending tap, not a fresh idea** — ~40 lines, plus reading the outbox archive. Eliminates ~30% of all current runs (the noise ones).
3. **Mark partial artifacts on abnormal exit + persist resumable state** — ~30 lines. Stops silent quality failures.

Hour-3 (Jack's plan: "locks niche") could absorb #1 in 15 minutes — recommend slotting it in if the niche-lock work doesn't fill the hour.
