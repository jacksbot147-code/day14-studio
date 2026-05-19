# Day14 OS — Telegram bridge setup (Phase 1)

> 15 min to get from zero to "Jack messages a bot, gets a reply from Day14 OS."

---

## Step 1 — Create the Telegram bot (3 min)

1. Open Telegram. Search for **@BotFather** (verified blue check).
2. Send `/newbot`
3. Bot name: `Day14 OS` (or whatever you want — visible)
4. Username: `day14_os_bot` (must end in `_bot`; must be unique)
5. BotFather replies with a token like:
   `7234567890:ABCDEFghijklmnopQRSTUVwxyz1234567`
6. **Copy that token** — it's the secret. Treat like a Supabase service key.

While you're there:
- `/setdescription` — "Day14 OS: customer pipeline + ops, by Jack."
- `/setabouttext` — "Built for the operator behind Day14."
- `/setuserpic` — upload the Day14 logo

---

## Step 2 — Find your chat ID (2 min)

1. In Telegram, search for **your bot** (e.g., @day14_os_bot)
2. Tap **Start** (or send `/start`)
3. In a browser, visit:
   `https://api.telegram.org/bot{YOUR_TOKEN}/getUpdates`
   Replace `{YOUR_TOKEN}` with what BotFather gave you.
4. You'll see JSON. Find `"chat":{"id":NNNNNNN,...}` — that number is your chat ID.

---

## Step 3 — Add credentials to .env.local (1 min)

Open `~/Documents/studio/.env.local` in your editor. Add:

```
TELEGRAM_BOT_TOKEN=7234567890:ABCDEFghijklmnopQRSTUVwxyz1234567
TELEGRAM_CHAT_ID=987654321
```

(Use YOUR token and YOUR chat ID. NEVER paste either in chat, email, Slack — keep them local.)

Save the file.

---

## Step 4 — Install the always-on poller (2 min)

Run:

```bash
bash ~/Documents/studio/scripts/install-telegram-poller.sh
```

What this does:
- Installs a macOS LaunchAgent that runs the poller at every login
- KeepAlive: if it crashes, macOS restarts it within 10 seconds
- Logs to `~/Documents/businesses/_shared/telegram/poller.{stdout,stderr}.log`

After install, the poller is running. Verify:
```bash
launchctl list | grep day14
```
You should see `com.day14.telegram-poller`.

---

## Step 5 — Smoke test (5 min)

In Telegram, send to your bot:
```
ping
```

Within 5 seconds, the poller picks it up and writes a file to:
`~/Documents/businesses/_shared/telegram/inbox/`

Then, in a fresh Cowork session, paste this prompt:

```
Read every JSON file in ~/Documents/businesses/_shared/telegram/inbox/ where processed: false.

For each one, look at the text field.
If text == "ping", write an outbound message file to ~/Documents/businesses/_shared/telegram/outbox/{timestamp}-reply.json with:
{
  "chat_id": <from inbox file's chat.id>,
  "text": "pong",
  "parse_mode": "MarkdownV2",
  "queued_at": <ISO now>,
  "sent_at": null
}

Then mark the inbox file as processed: true.
```

Within ~5 seconds of Cowork writing the file, the poller picks it up and sends "pong" to your Telegram.

If you see "pong" in Telegram → **bridge is live**.

---

## Step 6 — Verify quiet hours work

In Telegram, send:
```
/snooze 1
```

(Phase 2 — the snooze command isn't wired yet. This step is the goal for next week.)

---

## What's next

Phase 1 complete = you can send/receive text. Next phases wire:
- Phase 2: scheduled tasks push daily kickoff / EOD to Telegram
- Phase 3: approval cards arrive with inline buttons
- Phase 4: customer pipeline pings you when things happen

Each phase is incremental — Day14 OS becomes more autonomous each week.

---

## Troubleshooting

### Poller won't start
```bash
tail -50 ~/Documents/businesses/_shared/telegram/poller.stderr.log
```
Common: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID typo in .env.local.

### Bot doesn't respond
Check the inbox folder for incoming files. If empty:
- Verify TELEGRAM_BOT_TOKEN matches BotFather's token
- Verify you sent `/start` to your bot first (Telegram requires this before bot can message you back)

### Got a message from a chat that's not yours
Expected behavior — the poller logs "IGNORED" and doesn't process. Day14 OS only talks to the configured CHAT_ID.

### Want to stop the poller temporarily
```bash
launchctl unload ~/Library/LaunchAgents/com.day14.telegram-poller.plist
```

### Want to restart cleanly
```bash
launchctl unload ~/Library/LaunchAgents/com.day14.telegram-poller.plist
launchctl load ~/Library/LaunchAgents/com.day14.telegram-poller.plist
```

### Want to uninstall
```bash
launchctl unload ~/Library/LaunchAgents/com.day14.telegram-poller.plist
rm ~/Library/LaunchAgents/com.day14.telegram-poller.plist
```
