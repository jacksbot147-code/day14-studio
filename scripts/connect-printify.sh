#!/usr/bin/env bash
# connect-printify.sh
# Save PRINTIFY_API_KEY to .env.local. Verifies the key works + lists shops.

set -euo pipefail

ENV="$HOME/Documents/studio/.env.local"

GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"
ok()   { printf "${GREEN}✓${RESET} %s\n" "$1"; }
warn() { printf "${YELLOW}!${RESET} %s\n" "$1"; }
fail() { printf "${RED}✗${RESET} %s\n" "$1"; }

echo
echo "Day14 OS — Printify API key setup"
echo "==================================="
echo
echo "First, get your Printify API key:"
echo
echo "  1. Sign up (free) at https://printify.com"
echo "  2. Go to: https://printify.com/app/account/api"
echo "     (or: Account → Connections → 'Generate token')"
echo "  3. Give the token a name (e.g. 'day14-os')"
echo "  4. Check ALL scopes (shops:read, products:read, products:write,"
echo "     uploads:read, uploads:write, catalog:read)"
echo "  5. Click 'Generate token' and COPY the long string"
echo
echo "If you don't have a shop yet:"
echo "  → Printify dashboard → 'My new store' →"
echo "    pick 'Printify Pop-Up Store' (free, hosted by Printify, no Shopify needed)"
echo "    OR connect to your Etsy/Shopify if you have one"
echo
echo "Paste your API token below. Press Enter, then Ctrl-D."
echo

RAW_KEY="$(cat)"
KEY="$(echo "$RAW_KEY" | tr -d ' \r\n\t')"

if [ ${#KEY} -lt 30 ]; then
  fail "Token too short (${#KEY} chars). Expected ~200+ char JWT."
  exit 1
fi

ok "Token format OK (${#KEY} chars)"

echo
echo "Verifying with Printify API..."
RESP=$(curl -s -w '\nHTTP_STATUS:%{http_code}' \
  "https://api.printify.com/v1/shops.json" \
  -H "Authorization: Bearer ${KEY}")

HTTP_CODE=$(echo "$RESP" | grep -oE 'HTTP_STATUS:[0-9]+' | cut -d: -f2)

if [ "$HTTP_CODE" != "200" ]; then
  fail "API rejected token (HTTP $HTTP_CODE)"
  echo "$RESP" | sed 's/HTTP_STATUS:[0-9]*$//' | head -c 300
  echo
  exit 1
fi

# Strip HTTP_STATUS line and parse JSON for shop info
BODY=$(echo "$RESP" | sed 's/HTTP_STATUS:[0-9]*$//')
SHOP_COUNT=$(echo "$BODY" | python3 -c "import sys, json; data = json.load(sys.stdin); print(len(data) if isinstance(data, list) else 0)" 2>/dev/null || echo 0)

if [ "$SHOP_COUNT" = "0" ]; then
  warn "Token works but you have NO shops connected yet."
  echo "    → Open printify.com → 'My new store' → pick Printify Pop-Up Store"
  echo "    → Re-run this script (will work fine once a shop exists)"
else
  ok "Found $SHOP_COUNT shop(s):"
  echo "$BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for s in data:
    print(f\"    [{s.get('id')}] {s.get('title')} ({s.get('sales_channel', 'unknown')})\")
"
fi

# Save / replace
if grep -q "^PRINTIFY_API_KEY=" "$ENV"; then
  sed -i '' "s|^PRINTIFY_API_KEY=.*|PRINTIFY_API_KEY=${KEY}|" "$ENV"
else
  echo "PRINTIFY_API_KEY=${KEY}" >> "$ENV"
fi
ok "Saved to .env.local"

echo
echo "Next steps:"
echo "  1. Generate a design (any product) via the bot:"
echo
echo "     Text @Day14_OS_bot:"
echo "     'Generate a perimenopause humor mug design — \"She is perimenopausal, not crazy\"'"
echo
echo "  2. The bot will:"
echo "     • Generate the image via Gemini Imagen"
echo "     • Upload it to Printify"
echo "     • Create the product (draft) on a 11oz mug"
echo "     • Telegram you the Printify product URL to review + publish"
echo
echo "  3. In Printify, just press 'Publish' → the product is live"
echo
if [ "$SHOP_COUNT" = "0" ]; then
  echo "  → BUT first: create at least one shop. printify.com → Pop-Up Store is fastest."
fi
