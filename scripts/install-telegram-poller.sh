#!/usr/bin/env bash
# RETIRED. Unloads the Telegram poller LaunchAgent.
set -euo pipefail
PLIST="$HOME/Library/LaunchAgents/com.day14.telegram-poller.plist"
if launchctl list 2>/dev/null | grep -q "com.day14.telegram-poller"; then
  launchctl unload "$PLIST" 2>/dev/null || true
  echo "unloaded com.day14.telegram-poller"
else
  echo "com.day14.telegram-poller is not loaded on this machine"
fi
echo "Telegram polling is retired. TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID can be removed from Vercel and .env.local."
