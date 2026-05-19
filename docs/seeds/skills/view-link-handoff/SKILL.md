---
name: view-link-handoff
description: Every artifact produced by an agent gets a computer:// link in the chat reply. Jack taps once, sees the file. Codifies the convention observed across daily-kickoffs and overnight reports. Tiny skill, high signal.
triggers:
  - "view link"
  - "share file with user"
  - "computer:// link"
---

# view-link-handoff

> Files Jack can't reach are files Jack doesn't read. Every artifact
> gets a tap-to-open link.

## The pattern

When an agent ships a file to `~/Documents/`, the chat reply must include:
```
[View {what}](computer:///Users/jcboppington/Documents/{path})
```

Linked text describes what they're tapping into, not the path. The path is in the URL.

## When to apply

| File type | Provide computer:// link? |
|---|---|
| Markdown docs (.md) | Yes |
| Code files (.tsx, .ts, .js, .py) | Yes |
| JSON / SQL | Yes |
| Shell scripts (.sh) | Yes |
| Plain text status reports | Yes |
| Binary files (.zip, .pdf, .docx, .pptx) | Yes |
| Image files (.png, .jpg) | Yes |
| Temp/cache files inside outputs/ | NO — Jack can't see those |

## Rules

1. **Always use the host path** (`/Users/jcboppington/Documents/...`), never the sandbox path.
2. **One link per artifact** — don't include the same file twice in one reply.
3. **Link text is what, not where** — "View today's kickoff" not "View kickoff-2026-05-16.md."
4. **Max 5 links per reply** — beyond that, batch into "see the docs/ folder."
5. **Never link a file that doesn't exist yet** — verify with `ls` first if uncertain.

## Anti-pattern

❌ "I wrote the file at /sessions/vigilant-gallant-meitner/mnt/Documents/..."  
   (sandbox path; Jack can't open)

❌ "Done — check the docs/ folder."  
   (no specific link; Jack has to navigate)

❌ "I created skill.md."  
   (no link at all; Jack has to grep)

## Pattern

✓ "Findings doc shipped: [View methods harvest findings](computer:///Users/jcboppington/Documents/studio/docs/methods-harvest-findings.md)"

✓ "Three skills landed:
- [council-decision](computer:///Users/jcboppington/Documents/studio/docs/seeds/skills/council-decision/SKILL.md)
- [day14-voice](computer:///Users/jcboppington/Documents/studio/docs/seeds/skills/day14-voice/SKILL.md)
- [swfl-context](computer:///Users/jcboppington/Documents/studio/docs/seeds/skills/swfl-context/SKILL.md)"

## When invoked
- Every chat reply that mentions a created/modified file
- Inside `morning-headline-format` (the top-3-lines need a "Files:" line with these)
- Inside `daily-eod` to link shipped artifacts

## Logging
Not logged — this is a presentation skill, not an operational one. Variance is visible in chat history.
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('view-link-handoff', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'view-link-handoff', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
