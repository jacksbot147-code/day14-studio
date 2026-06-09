---
name: goal
description: Execute a multi-step goal autonomously without confirmations. Use when Jack types `/goal <description>` or says "the goal is X" or "knock out X" or any framing where he wants a single instruction to trigger end-to-end execution against a multi-step outcome. The skill decomposes the goal, executes each step, commits work, and reports — no checkpoints, no clarifying questions unless a real blocker is hit.
---

# /goal — Autonomous Multi-Step Execution

## When to invoke this

Jack uses this skill when he wants to fire-and-forget a goal that involves multiple steps. Examples:

- `/goal merge the redesign branch and ship Vercel Analytics`
- `/goal close out tonight's overnight queue and write the summary`
- `/goal get Angela's site live — text her, swap inputs when she replies, commit, push, merge`
- `/goal find the highest-leverage 3 UI improvements and ship them`

The verb-noun shape doesn't matter. What matters: the goal implies multiple steps and Jack wants you to execute them without checking in.

## Operating rules — don't violate these

1. **No clarifying questions unless a real blocker** (e.g., missing credentials, ambiguity that would produce the wrong outcome, a destructive action that's not in standard playbook). Asking "should I also do X" is a violation. Pick the smart default and report after.

2. **Decompose the goal into 3-7 concrete tasks** using the TaskCreate tool so Jack can see status. Mark each as `in_progress` when starting, `completed` when done. If a step fails, mark `failed` and continue with what's still possible.

3. **Default to action.** When in doubt between "ask Jack" and "make the best call and proceed," pick the call. Document the call in the final summary so he can override if needed.

4. **Honor standing constraints** loaded from Jack's Day14 context:
   - Never push to `main` — always to `redesign/apple-base44-2026-06-03` or whatever feature branch is currently checked out
   - Never delete files (per overwriting empire-state etc. constraint)
   - Never reinstall `node_modules`
   - No new dependencies in `package.json` without explicit approval
   - `hot-flash-co` and `kennum-lawn-care` excluded from new product work
   - Realty killswitch honored — drafters exit early on the flag

5. **Commit and push at logical checkpoints.** Don't accumulate 50 changes in one commit. Each logical chunk gets its own commit with a clear message. Push when the chunk is ready for review.

6. **Run typecheck + lint before every commit.** If either fails, fix the smallest delta to make them pass before committing. Don't commit broken code.

7. **Report once at the end.** Single message with: what shipped, the commit hashes, the Vercel preview URL (use the standing `https://day14-studio-git-redesign-app-b13829-jacksbot147-codes-projects.vercel.app`), and the one-liner Jack runs to push (if not already pushed) or merge.

8. **If the goal is impossible from the sandbox** (e.g., requires real network calls to Gemini/cal.com/GitHub from the restricted sandbox), stage the work + write a one-shot orchestrator script Jack runs from his Mac terminal. Follow the proven pattern from `scripts/_internal/banana-refire-2026-05-28.mjs`.

## Standard execution shape

```
1. Read the goal. Restate it in one sentence as confirmation (in chat, no question).
2. Create a TaskCreate list with 3-7 concrete tasks.
3. For each task in order:
   a. Mark in_progress
   b. Execute (file edits, bash commands, scheduled tasks, whatever)
   c. Run typecheck + lint if code changed
   d. Commit + push if the task produced a discrete shippable unit
   e. Mark completed (or failed with reason)
4. Generate a single final summary message with:
   - One-line outcome ("Goal shipped: <restated goal>" or "Partially shipped: <what landed, what blocked>")
   - Commit hashes from this session
   - Vercel preview URL
   - Push command if commits sit local-only
   - Merge-to-main one-liner if Jack chooses to promote
   - Any decisions you made unilaterally that Jack can override
```

## Examples of well-executed goals

### Goal: "ship the inline Calendly embed + tier comparison table + one testimonial slot"

Tasks:
1. Read current Pricing section in `src/app/page.tsx` to understand structure
2. Add `CalendlyEmbed` component (iframe with Cal.com URL from `SITE.bookingUrl`)
3. Wire CalendlyEmbed into the `#book` section in place of the form
4. Add `TierComparisonTable` component below the 4-tier cards (checkmark matrix)
5. Add `TestimonialCard` component with placeholder content + a TODO for Jack to swap quote
6. typecheck + lint
7. Commit "feat: inline Calendly + tier comparison + testimonial slot"
8. Push branch
9. Report

### Goal: "find and fix the 3 highest-impact buyer-conversion issues on day14.us"

Tasks:
1. Audit all CTAs across the homepage — verify they route to working destinations
2. Audit metadata + OG cards — verify titles/descriptions match new positioning
3. Audit mobile responsive — check hero, pricing, footer at 375px / 768px viewports
4. Fix the top 3 issues found
5. typecheck + lint + commit + push
6. Report what was found + what was fixed

## What to do if the goal is too vague

Bias toward execution. If the goal says "make the site better," pick the highest-leverage 3 improvements based on prior session context (or the brand-animator skill if available) and ship them. Don't ask "what kind of better?" Just decide and report.

The only acceptable clarifying-question scenario: the goal could plausibly destroy Jack's work (e.g., "delete everything we built tonight" — verify intent before executing a destructive operation).

## Failure modes to refuse

- A goal that requires force-pushing main or rewriting shared history → refuse, ask for a non-destructive variant
- A goal that requires entering Jack's password / API key / payment info → refuse, ask Jack to do that step
- A goal that requires actions on platforms Jack hasn't authorized (publishing to social media accounts he doesn't have connected, etc.) → refuse, ask Jack to do that step

## Output format

Plain prose for the final summary. No fluffy intros. Lead with outcome, then commits, then URLs, then any open questions.
