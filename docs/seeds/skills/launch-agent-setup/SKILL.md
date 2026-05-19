---
name: launch-agent-setup
description: How to install any Day14 OS poller as a macOS LaunchAgent so it auto-starts at login + restarts on crash. Pattern wrapper for install-telegram-poller.sh and future pollers. Layer 7 infrastructure.
triggers:
  - "launch agent"
  - "auto-start at login"
  - "macOS daemon"
  - "launchctl"
---

# launch-agent-setup

> Each Day14 poller (Telegram, events, health) installs as its own
> LaunchAgent. Same pattern. This skill is the template.

## The plist template

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.day14.{poller-name}</string>

    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/jcboppington/Documents/studio/scripts/{poller-name}.mjs</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
        <key>Crashed</key>
        <true/>
    </dict>

    <key>ThrottleInterval</key>
    <integer>10</integer>

    <key>StandardOutPath</key>
    <string>/Users/jcboppington/Documents/businesses/_shared/poller/{poller-name}.stdout.log</string>

    <key>StandardErrorPath</key>
    <string>/Users/jcboppington/Documents/businesses/_shared/poller/{poller-name}.stderr.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
```

## Install script pattern

For each new poller, ship an install script: `~/Documents/studio/scripts/install-{poller}.sh`.

The script:
1. Verifies the .mjs poller file exists
2. Verifies `node` is in PATH
3. Verifies env vars (e.g., `TELEGRAM_BOT_TOKEN`) are in `.env.local`
4. Writes the plist to `~/Library/LaunchAgents/com.day14.{name}.plist`
5. Loads via `launchctl load`
6. Verifies running via `launchctl list | grep day14`

The existing `install-telegram-poller.sh` is the canonical example.

## Hard rules

1. **One plist per poller.** Don't bundle pollers; if one crashes, the others stay up.
2. **Always use absolute paths.** `~` doesn't expand in plist; use `/Users/jcboppington/...`
3. **ThrottleInterval >= 10s.** Otherwise a crashing poller spams logs.
4. **Always include log paths** so crashes are debuggable.
5. **Always test the install script** with `--dry-run` first when extending the pattern.

## Failure modes

- **`node` not in PATH for launchctl**: explicitly add to `EnvironmentVariables.PATH` (we already do this)
- **plist syntax error**: `plutil -lint` the plist before loading; surface errors clearly
- **Crashing on startup repeatedly**: macOS will respect ThrottleInterval but log will grow; archive logs nightly

## Cutover to Mac mini

When the Mac mini arrives, repeat install-{poller}.sh on the mini for each poller. Disable on the laptop. State (queue files in `~/Documents/businesses/_shared/...`) syncs via iCloud or rsync.

## When invoked
- Setting up any new poller
- Manually after a Day14 OS update changes poller signatures
- Reference for crash-recovery debugging
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('launch-agent-setup', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'launch-agent-setup', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
