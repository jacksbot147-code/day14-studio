#!/usr/bin/env bash
# connect-gemini.sh
# Save GEMINI_API_KEY to .env.local. Verifies the key works.
# Free tier: 1,500 requests/day on gemini-2.5-flash. Get key at:
#   https://aistudio.google.com/apikey

set -euo pipefail

ENV="$HOME/Documents/studio/.env.local"

GREEN="\033[0;32m"
RED="\033[0;31m"
RESET="\033[0m"
ok()   { printf "${GREEN}✓${RESET} %s\n" "$1"; }
fail() { printf "${RED}✗${RESET} %s\n" "$1"; }

echo
echo "Day14 OS — Gemini API key setup (FREE TIER)"
echo "============================================"
echo
echo "Get your free key at: https://aistudio.google.com/apikey"
echo "  (No credit card needed for free tier — 1,500 requests/day)"
echo
echo "Paste your key below. When done, press Enter, then Ctrl-D."
echo

RAW_KEY="$(cat)"
KEY="$(echo "$RAW_KEY" | tr -d ' \r\n\t')"

if [ ${#KEY} -lt 30 ]; then
  fail "Key too short (${#KEY} chars)."
  exit 1
fi

if [[ ! "$KEY" =~ ^AIza ]]; then
  fail "Key doesn't start with 'AIza' (Google API keys start with this)."
  echo "What you pasted starts with: ${KEY:0:10}..."
  exit 1
fi

ok "Key format OK (${#KEY} chars)"

echo
echo "Verifying with Gemini API..."
RESP=$(curl -s -w '\nHTTP_STATUS:%{http_code}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"ping"}]}]}')

HTTP_CODE=$(echo "$RESP" | grep -oE 'HTTP_STATUS:[0-9]+' | cut -d: -f2)

if [ "$HTTP_CODE" != "200" ]; then
  fail "API rejected key (HTTP $HTTP_CODE)"
  echo "$RESP" | sed 's/HTTP_STATUS:[0-9]*$//' | head -c 300
  echo
  exit 1
fi
ok "Key works"

# Save / replace
if grep -q "^GEMINI_API_KEY=" "$ENV"; then
  sed -i '' "s|^GEMINI_API_KEY=.*|GEMINI_API_KEY=${KEY}|" "$ENV"
else
  echo "GEMINI_API_KEY=${KEY}" >> "$ENV"
fi
ok "Saved to .env.local"

echo
echo "Now restart the telegram poller:"
echo "  launchctl unload ~/Library/LaunchAgents/com.day14.telegram-poller.plist 2>/dev/null"
echo "  launchctl load ~/Library/LaunchAgents/com.day14.telegram-poller.plist"
echo
echo "Then text your bot anything (NOT a /command) and the worker will run."
