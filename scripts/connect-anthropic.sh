#!/usr/bin/env bash
# connect-anthropic.sh
# Save ANTHROPIC_API_KEY to .env.local safely.
# Verifies the key works before saving.

set -euo pipefail

ENV="$HOME/Documents/studio/.env.local"

GREEN="\033[0;32m"
RED="\033[0;31m"
RESET="\033[0m"
ok()   { printf "${GREEN}✓${RESET} %s\n" "$1"; }
fail() { printf "${RED}✗${RESET} %s\n" "$1"; }

echo
echo "Day14 OS — Anthropic API key setup"
echo "===================================="
echo
echo "Get your key from: https://console.anthropic.com/settings/keys"
echo
echo "Paste your key below. When done, press Enter, then Ctrl-D to submit."
echo

RAW_KEY="$(cat)"
KEY="$(echo "$RAW_KEY" | tr -d ' \r\n\t')"

if [ ${#KEY} -lt 30 ]; then
  fail "Key too short (${#KEY} chars). Expected ~100+ char key starting with 'sk-ant-'"
  exit 1
fi

if [[ ! "$KEY" =~ ^sk-ant- ]]; then
  fail "Key doesn't start with 'sk-ant-'"
  echo "What you pasted starts with: ${KEY:0:10}..."
  exit 1
fi

ok "Key format OK (${#KEY} chars)"

echo
echo "Verifying with Anthropic API..."
RESP=$(curl -s -w '\nHTTP_STATUS:%{http_code}' https://api.anthropic.com/v1/messages \
  -H "x-api-key: ${KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":4,"messages":[{"role":"user","content":"ping"}]}')

HTTP_CODE=$(echo "$RESP" | grep -oE 'HTTP_STATUS:[0-9]+' | cut -d: -f2)
BODY=$(echo "$RESP" | sed 's/HTTP_STATUS:[0-9]*$//' | sed '/^$/d')

if [ "$HTTP_CODE" != "200" ]; then
  fail "API rejected key (HTTP $HTTP_CODE)"
  echo "Response: $BODY"
  exit 1
fi
ok "Key works"

# Save
sed -i '' "s|^ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=${KEY}|" "$ENV"
ok "Saved to .env.local"

echo
echo "Now restart the telegram poller so it picks up the new key:"
echo "  launchctl unload ~/Library/LaunchAgents/com.day14.telegram-poller.plist 2>/dev/null"
echo "  launchctl load ~/Library/LaunchAgents/com.day14.telegram-poller.plist"
echo
echo "Then text your bot anything and the idea-worker should run."
