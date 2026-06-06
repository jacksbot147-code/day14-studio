# Drag Removal — Exact Commands (Block 1, 6:30 PM)
**Date:** 2026-06-04
**Purpose:** Paste-ready bash. No hunting for plist names.

---

## Hot Flash Co — 3 plists

```bash
launchctl unload ~/Library/LaunchAgents/com.day14.hot-flash-co.daily-engine.plist 2>/dev/null
launchctl unload ~/Library/LaunchAgents/com.day14.hot-flash-co.marketing-engine.plist 2>/dev/null
launchctl unload ~/Library/LaunchAgents/com.day14.hot-flash-co.orders-watcher.plist 2>/dev/null
```

Verify they're gone:

```bash
launchctl list | grep hot-flash
# Should return nothing.
```

---

## Day14 Realty — runtime kill

```bash
launchctl unload ~/Library/LaunchAgents/com.day14.realty-scout-day14-realty.plist 2>/dev/null
```

Check for any sibling realty plists you might want to also kill:

```bash
ls ~/Library/LaunchAgents/ | grep -i realty
```

Unload anything that comes back if it's a realty cron you don't want running.

Verify:

```bash
launchctl list | grep realty
# Should return nothing.
```

---

## Mark in tenants.json (if it exists)

Optional but tidy — keep the OS-level state in sync:

```bash
# Find the tenants config
ls ~/Documents/studio/scripts/*tenants* ~/Documents/businesses/_shared/*.json 2>/dev/null | head
```

If `tenants.json` exists, mark both as paused:

```json
{
  "hot-flash-co": { "status": "archived", "runtime": "off" },
  "day14-realty": { "status": "paused", "runtime": "off" }
}
```

---

## Sanity check — what's still bleeding

```bash
launchctl list | grep com.day14
```

Read the list. Anything you don't recognize as actively wanted, unload the same way.

---

## Total time

~5 minutes if everything works first try. ~15 if you hunt for one stray plist.

**Exit:** No Gemini tokens spent overnight on realty or hot-flash. ~$14/day saved.
