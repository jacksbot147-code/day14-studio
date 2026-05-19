---
name: youtube-script-from-blog
description: Convert a blog post into a 4-6 min YouTube script with hook, intro, sections, B-roll suggestions, and outro. Adapts long-form reading into spoken pacing.
triggers:
  - "youtube script"
  - "video script"
  - "video from blog"
  - "/yt"
---

# youtube-script-from-blog

> Spoken language has different rules than written.
> A blog post read aloud sounds like a robot. A script reads natural.

## Structure (4-6 min video)

```
HOOK (0:00-0:10): one line, on-camera, no music
  — "If you have a pool in SW Florida, you're probably
     making one of these 3 mistakes."
  
INTRO (0:10-0:30): who you are, what you're going to cover, why
  — "I'm Jack, I build websites for pool service companies..."
  — "Today I'll show you the 3 most common pool maintenance
     mistakes I see, and what to do instead."

CONTENT BLOCKS (0:30-4:30): the 3-5 main points
  — Each 30-60 seconds
  — Include B-roll cues: [show pool], [zoom on chemicals], etc.
  — Spoken pacing: short sentences, one idea per sentence
  
PATTERN INTERRUPT (3:00-ish): change angle, ask a question, change shot
  
OUTRO (4:30-end): summary + CTA
  — "If you want a website that brings these customers
     to you instead, link below."
  — Soft sub button mention, last
```

## Hard rules

1. **Never read the blog post verbatim.** Spoken language is shorter, simpler, contraction-heavy.
2. **Always include B-roll cues** — `[VISUAL: pool with green water]`
3. **Always include a pattern interrupt** at 60-70% mark — drops retention curves at exactly this point.
4. **Always end with a soft CTA** — never "smash that subscribe button" energy. Quiet, useful.
5. **Cap reading length per chunk: 20 seconds (~50 spoken words).** Then change shot or B-roll.
6. **Always read aloud** before recording. If a sentence trips you, rewrite.

## Output

```
✓ YouTube script: "3 Pool Maintenance Mistakes I See in SWFL"

  Duration estimate: 4:42
  Sections: 7 (hook, intro, 4 mistakes, outro)
  B-roll cues: 14
  Pattern interrupt at 3:14 (chemical test demo)

  Path: ~/Documents/businesses/day14/content/video-scripts/pool-mistakes-swfl.md
  
  Next: record + edit. Suggested tools: Loom, Descript, Riverside.
```

## Inputs

- `source_blog_post` (path or URL)
- `target_duration_min` (default 5)
- `style` (talking-head | walk-and-talk | over-shoulder)

## When invoked

- After a blog post hits 1000+ pageviews (worth video-amplification)
- `/yt {blog_path}` Telegram command
- Inside `content-calendar-orchestrator` for top-performers

## Failure modes

- **Blog post too short**: combine 2 related posts
- **Blog post is text-heavy with no visual angle**: surface as "weak fit for video; consider podcast instead"

## Logging

`[YYYY-MM-DD HH:MM ET] youtube-script-from-blog → source: "{title}", duration: {N}min, broll_cues: {N}, status: {drafted|recorded|published}`

---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('youtube-script-from-blog', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'youtube-script-from-blog', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
