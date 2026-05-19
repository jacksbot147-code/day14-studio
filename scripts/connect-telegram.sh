#!/usr/bin/env bash
# connect-telegram.sh
# Interactive: paste your bot token, send the bot a message, done.
# Writes TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID to .env.local and
# restarts the poller automatically.

set -euo pipefail

ENV="$HOME/Documents/studio/.env.local"
PLIST="$HOME/Library/LaunchAgents/com.day14.telegram-poller.plist"

GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"
ok()   { printf "${GREEN}✓${RESET} %s\n" "$1"; }
warn() { printf "${YELLOW}!${RESET} %s\n" "$1"; }
fail() { printf "${RED}✗${RESET} %s\n" "$1"; }

if [ ! -f "$ENV" ]; then
  fail ".env.local not found at $ENV"
  exit 1
fi

echo
echo "Day14 OS — Telegram setup"
echo "=========================="
echo
echo "1) Open Telegram, search @BotFather, send /newbot."
echo "   Pick a name, pick a username (must end in 'bot')."
echo "   BotFather replies with a token like 1234567890:AAEzg..."
echo
echo "Paste your bot token below."
echo "When done, press Enter, then Ctrl-D to submit."
echo "(Ctrl-D signals end-of-input; works even if your clipboard has a line break.)"
echo

# Read until EOF (Ctrl-D), then strip ALL whitespace including newlines.
# Handles clipboards that wrap tokens across multiple lines.
TOKEN_RAW="$(cat)"
TOKEN="$(echo "$TOKEN_RAW" | tr -d ' \r\n\t')"

# Validate token format
if ! echo "$TOKEN" | grep -qE '^[0-9]{6,}:[A-Za-z0-9_-]{20,}$'; then
  fail "That token doesn't look right."
  echo "Expected format: NUMBERS:LETTERS_AND_DASHES (e.g. 1234567890:AAEzgVku...)"
  echo "You pasted: ${TOKEN:0:20}..."
  echo "Try again with: bash $0"
  exit 1
fi

ok "Token format OK"
echo

# Ping the API to confirm the token is valid
echo "Verifying with Telegram API..."
BOT_INFO=$(curl -s "https://api.telegram.org/bot${TOKEN}/getMe")
if ! echo "$BOT_INFO" | grep -q '"ok":true'; then
  fail "Telegram rejected the token."
  echo "Response: $BOT_INFO"
  exit 1
fi
BOT_USERNAME=$(echo "$BOT_INFO" | python3 -c "import sys, json; print(json.load(sys.stdin)['result']['username'])")
ok "Token works — bot is @${BOT_USERNAME}"
echo

echo "2) Open Telegram on your phone or web.telegram.org"
echo "   Search for: @${BOT_USERNAME}"
echo "   Send it ANY message (just type 'hi' and press send)."
echo
echo -n "Press Enter once you've sent a message to your bot: "
read -r _

echo
echo "Fetching chat_id..."
UPDATES=$(curl -s "https://api.telegram.org/bot${TOKEN}/getUpdates")

CHAT_ID=$(echo "$UPDATES" | python3 <<'EOF'
import sys, json
data = json.load(sys.stdin)
results = data.get("result", [])
if not results:
    sys.exit("NO_MESSAGES")
# Find most recent message chat id
for update in reversed(results):
    msg = update.get("message") or update.get("edited_message") or {}
    chat = msg.get("chat", {})
    if chat.get("id"):
        print(chat["id"])
        break
EOF
) || true

if [ -z "$CHAT_ID" ] || [ "$CHAT_ID" = "NO_MESSAGES" ]; then
  fail "Couldn't find a message from you to the bot."
  echo "Make sure you actually sent a message (e.g. 'hi') in the chat with @${BOT_USERNAME}."
  echo "Then re-run: bash $0"
  exit 1
fi

ok "Found chat_id: $CHAT_ID"
echo

# Update .env.local
if grep -q "^TELEGRAM_BOT_TOKEN=" "$ENV"; then
  # macOS sed needs -i ''
  sed -i '' "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=${TOKEN}|" "$ENV"
else
  echo "TELEGRAM_BOT_TOKEN=${TOKEN}" >> "$ENV"
fi

if grep -q "^TELEGRAM_CHAT_ID=" "$ENV"; then
  sed -i '' "s|^TELEGRAM_CHAT_ID=.*|TELEGRAM_CHAT_ID=${CHAT_ID}|" "$ENV"
else
  echo "TELEGRAM_CHAT_ID=${CHAT_ID}" >> "$ENV"
fi

ok "Saved both values to .env.local"
echo

# Restart the poller
echo "Restarting telegram-poller LaunchAgent..."
if [ -f "$PLIST" ]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  sleep 1
  launchctl load "$PLIST"
  ok "Poller restarted"
else
  warn "Poller plist not at $PLIST"
  warn "If you haven't installed it yet, run: bash ~/Documents/studio/scripts/install-telegram-poller.sh"
fi

echo
echo "=========================="
ok "Telegram connected"
echo
echo "Now: on Telegram, send your bot /help"
echo "Within 30 seconds you should get the command list back."
echo
echo "If nothing happens, check:"
echo "  tail -20 ~/Documents/businesses/_shared/poller/telegram-poller.log"
