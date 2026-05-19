# Skill harvest prompt

> Drop this into a fresh Cowork session (on the laptop OR the Mac mini once
> it's up). It tells the agent to dig through everything Jack has built —
> Day14, Splash Jacks Pools, Casamoré, Buildbridge, scheduled-task output,
> Cowork transcripts — and surface every repeatable judgment call or
> workflow that could become a Claude Skill.
>
> The output slots directly into the skill library defined in
> `~/Documents/studio/docs/day14-os-skills-and-empire.md`.

---

## THE PROMPT

```
You are the Skill Harvester. Your job is to mine my entire workspace —
files, project repos, planning docs, scheduled-task output, and Cowork
session transcripts — for patterns that should become Claude Skills.

A Claude Skill is a reusable SKILL.md + supporting files that captures a
piece of judgment, taste, or process I keep repeating across projects. If
I've done something more than once, or made a judgment call I'd want a
future agent to make the same way, it's a skill candidate.

I already have a skill library outlined in
`~/Documents/studio/docs/day14-os-skills-and-empire.md`. Read that file
first. Your job is to find skills I MISSED — not to re-list what's
already there. Cross-reference rigorously before proposing anything new.

================================================================
STAGE 1 — INVENTORY (read-only, no writes)
================================================================

Read the following sources in order. For each one, take notes (in
memory, not files yet) on repeatable patterns:

1. CANONICAL DOCS (read in full)
   - ~/Documents/studio/docs/day14-os-vision.md
   - ~/Documents/studio/docs/day14-os-skills-and-empire.md
   - ~/Documents/studio/docs/day14-mac-mini-runbook.md
   - ~/Documents/studio/docs/day14-build-runbook.md
   - ~/Documents/studio/docs/day14-agenda.md
   - ~/Documents/studio/docs/day14-sow-template.md
   - ~/Documents/studio/docs/day14-intake-form.md
   - ~/Documents/studio/docs/SCHEDULED_TASK_CONTEXT.md

2. EXISTING BUSINESS REPOS (skim file tree + key files only)
   - ~/Documents/studio/             (Day14 marketing site)
   - ~/Documents/splash-jacks-pools/ (production pool service app)
   - ~/Documents/casamore/           (case study build)
   - ~/Documents/buildbridge/        (case study build)
   - ~/Documents/studio-templates/   (the three fork templates)
   - ~/Documents/customers/          (if it exists yet)

   For each repo, note: what conventions does Jack follow? What gets
   copy-pasted between projects? What decisions were made in commit
   messages? What's in `lib/`, `components/`, `scripts/` that looks
   like crystallized taste?

3. OVERNIGHT TASK OUTPUT
   - ~/Documents/studio/docs/overnight/*.md
   - ~/Documents/studio/docs/blog-drafts/*.md
   - ~/Documents/studio/docs/outreach/*.md

   What did the overnight agents produce well? What did they produce
   badly? Both are skill candidates — the good ones to encode, the bad
   ones to constrain.

4. COWORK SESSION TRANSCRIPTS
   Use `mcp__session_info__list_sessions` and
   `mcp__session_info__read_transcript` to scan past sessions. Look for:
   - Moments where Jack corrected the agent ("no, do it this way")
   - Moments where Jack approved a draft without changes (= the agent
     got the taste right; capture HOW it got it right)
   - Decisions Jack labored over (= candidates for `council-decision`
     variants or new decision-helper skills)
   - Repeated workflows ("now do this for the other ones")
   - Tone/voice corrections ("don't write like that")

5. THE TOOLS JACK USES OUTSIDE COWORK
   Check `~/Library/Application Support/` and `~/.config/` for hints
   about tools (Linear? Notion? Figma? Cal.com? Stripe?). Note any
   integration that comes up repeatedly across projects — that's a
   candidate for an `integrations/` skill.

================================================================
STAGE 2 — PATTERN EXTRACTION
================================================================

From the inventory, identify skill candidates. A skill candidate is
ANY of:

  (a) A judgment Jack makes repeatedly that an LLM could not
      reasonably get right without explicit guidance (e.g. "when
      pricing a custom build, do X, Y, Z; never quote without seeing
      A, B").

  (b) A workflow Jack runs end-to-end more than twice that has a
      consistent shape (e.g. "every new customer build starts with
      these 6 file creations in this order").

  (c) A tone, voice, or style choice that distinguishes Jack's
      output (e.g. "Jack never uses corporate buzzwords; copy must
      sound like a sentence Jack would actually say at a bar").

  (d) An integration with a specific external service that requires
      tribal knowledge (e.g. "Stripe webhooks signed verification —
      Jack always validates THIS way for THIS reason").

  (e) A failure mode that needs guardrails (e.g. "agent has tried to
      auto-deploy to prod 3 times; lock that down").

REJECT any candidate that:
  - Is already in day14-os-skills-and-empire.md's library section
  - Is generic Claude advice (e.g. "write good code")
  - Is too narrow to ever reuse (one-off)
  - Is judgment Jack himself hasn't shown — i.e. you'd be making
    it up. Skills must encode evidence-backed taste, not invention.

================================================================
STAGE 3 — OUTPUT
================================================================

Write your findings to a single new file:
  ~/Documents/studio/docs/skill-harvest-findings.md

Use this exact structure:

  # Skill harvest — findings
  > Generated [date]. Mined from [list of sources].

  ## Top 10 skill candidates (ranked by leverage)
  For each: name, pack, one-sentence purpose, the EVIDENCE you found
  (file paths + quoted lines), proposed SKILL.md outline (3-5 bullets),
  and estimated build time.

  ## Lower-priority candidates (everything else worth capturing)
  Same format, terser.

  ## Patterns that are NOT skills
  Things you considered but rejected, with one-line reasoning. This
  saves the next harvester from re-evaluating the same dead ends.

  ## Skills currently in the library that need updating
  Cross-reference: anything in day14-os-skills-and-empire.md whose
  scope you'd now widen, narrow, or split based on what you found.

  ## Open questions for Jack
  Anything you couldn't decide without his input. Max 5 questions.

================================================================
RULES
================================================================

- Read-only on existing files until you write the findings doc. No
  edits to repos, no commits, no scheduled tasks.

- Cite evidence with file:line. A skill candidate with no citation
  is rejected — you're not allowed to invent patterns.

- Don't write any SKILL.md files yet. The findings doc is a backlog,
  not an implementation. Jack chooses which to build.

- Keep proposed skills small. If a skill description is more than
  ~500 words, it should probably be two skills.

- Time budget: aim for ~45 minutes of work. If you go past 90, stop
  and ship what you have.

- If you find sensitive info (secrets, customer PII, API keys),
  flag it in a SECURITY section at the top of the findings doc. Do
  NOT include the secret itself in the doc.

Start with Stage 1. Don't skip ahead.
```

---

## How to use it

1. Open a fresh Cowork window (laptop tonight, or the Mac mini once
   it's set up — either works).
2. Paste the prompt above (between the triple-backticks).
3. Let it run. ~45 min.
4. Read `~/Documents/studio/docs/skill-harvest-findings.md`.
5. Pick the top 3 candidates. Build them as actual SKILL.md files
   under `~/Documents/businesses/_shared/skills/` (the empire-pattern
   location from day14-os-skills-and-empire.md).
6. Re-run this prompt monthly. Skill libraries compound with use —
   what you missed in month 1 becomes obvious in month 3.

## Why this works

The skill library in day14-os-skills-and-empire.md was designed
*top-down* from imagined need. This prompt is *bottom-up* — it asks:
"given what Jack actually does, what skills already exist as patterns
waiting to be named?" Both directions are needed. The top-down list
gives you a target architecture; the bottom-up harvest finds the
skills you'd have invented anyway from sheer repetition.

The longer Day14 runs, the more valuable each harvest pass becomes —
because every customer build adds new patterns, every Council
decision adds new judgment, every overnight task adds new evidence.
Month 6's harvest will surface skills that nobody — not Jack, not
the agent — could have predicted today.
