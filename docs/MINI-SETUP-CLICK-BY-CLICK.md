# Mac mini cutover — every click, every keystroke

> 2026-06-10. Follow top to bottom. ☐ = your action. Skip any step
> already done. `code blocks` = type exactly. "quotes" = click that label.
> If a screen doesn't match exactly (macOS versions drift), pick the
> closest option and keep moving — nothing here is irreversible except
> where marked ⚠️.

---

## PHASE 0 — Keys scavenger hunt (laptop, browser, ~20 min)

Open a text note. Collect all 8 values into it first, paste once at the end.

### 0.1 Stripe (2 keys)
- ☐ Go to dashboard.stripe.com → log in
- ☐ Top-right: make sure you're in the LIVE account (toggle says "Test mode" OFF — the toggle should NOT be purple)
- ☐ Left sidebar: "Developers" → "API keys"
- ☐ Row "Secret key" → "Reveal live key" → click the key to copy → note as `STRIPE_SECRET_KEY`
- ☐ Left sidebar: "Developers" → "Webhooks"
- ☐ If an endpoint for `day14.us/api/webhooks/stripe` exists: click it → "Signing secret" → "Reveal" → copy (`whsec_...`) → note as `STRIPE_WEBHOOK_SECRET`
- ☐ If NO endpoint exists: "Add endpoint" → Endpoint URL: `https://day14.us/api/webhooks/stripe` → "Select events" → check `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed` → "Add events" → "Add endpoint" → then copy the Signing secret as above

### 0.2 Resend
- ☐ resend.com → log in → left sidebar "API Keys" → "Create API Key"
- ☐ Name: `day14-os` → Permission: "Full access" → "Create"
- ☐ Copy the `re_...` value NOW (it's shown once) → note as `RESEND_API_KEY`

### 0.3 Anthropic
- ☐ console.anthropic.com → log in → gear icon / "Settings" → "API Keys" → "Create Key"
- ☐ Name: `day14-os` → "Create" → copy `sk-ant-...` → note as `ANTHROPIC_API_KEY`
- ☐ If it complains about billing: "Settings" → "Billing" → add a card first

### 0.4 Telegram (2 values)
- ☐ Open Telegram → search `@BotFather` → open chat → send `/mybots`
- ☐ Tap your Day14 bot → "API Token" → copy `123456789:AAxxxx...` → note as `TELEGRAM_BOT_TOKEN`
- ☐ Open your chat with the bot itself → send it any message ("hi")
- ☐ In a browser: `https://api.telegram.org/bot<PASTE-TOKEN-HERE>/getUpdates`
- ☐ In the JSON, find `"chat":{"id":` → that number → note as `TELEGRAM_CHAT_ID`

### 0.5 Supabase
- ☐ supabase.com → log in → open the Day14 project
- ☐ Left sidebar gear "Project Settings" → "API"
- ☐ Section "Project API keys" → row `service_role` → "Reveal" → copy → note as `SUPABASE_SERVICE_ROLE_KEY`
- ⚠️ This key bypasses row-level security. It only ever goes in .env.local and Vercel env — nowhere else, never in git.

### 0.6 Admin password
- ☐ Invent a strong password (or let your password manager generate one)
- ☐ Save it in the password manager as "day14.us admin" → note as `ADMIN_PASSWORD`

### 0.7 Paste into .env.local (laptop)
- ☐ Open Terminal on the LAPTOP
- ☐ Type: `open -e ~/Documents/studio/.env.local` → Enter (opens TextEdit)
- ☐ At the bottom of the file, add these 8 lines, replacing everything after each `=` with your noted value (no spaces around `=`, no quotes):
```
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
RESEND_API_KEY=re_xxx
ANTHROPIC_API_KEY=sk-ant-xxx
TELEGRAM_BOT_TOKEN=123456789:AAxxx
TELEGRAM_CHAT_ID=123456789
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
ADMIN_PASSWORD=your-invented-password
```
- ☐ Cmd+S → close TextEdit

---

## PHASE 1 — Mini: macOS first boot (~20 min, skip done steps)

- ☐ Plug in: power (into the UPS if you have it), Ethernet, HDMI to a monitor, any USB keyboard + mouse
- ☐ Press the power button (back-left corner)
- ☐ "Select Your Country or Region" → United States → "Continue"
- ☐ Accessibility → "Not Now"
- ☐ Network: if Ethernet is plugged it skips this — good. If it asks for Wi-Fi anyway, "Other Network Options" → "Local network (Ethernet)" → Continue
- ☐ "Migration Assistant" / "Transfer Your Data" → **"Not Now" / "Set up as new"** (we rsync instead — do NOT migrate)
- ☐ "Sign in with your Apple ID" → use YOUR existing Apple ID (syncs Keychain passwords) → password → 2FA code from your other device
- ☐ Terms and Conditions → "Agree" → "Agree"
- ☐ "Create a Computer Account":
  - Full name: `Jack Boppington`
  - Account name: `jcboppington`  ← ⚠️ EXACTLY this, lowercase. The rsync paths and scripts assume `/Users/jcboppington`.
  - Password: your usual → "Continue"
- ☐ "Enable Location Services" → your call → Continue
- ☐ "Analytics" → uncheck "Share Mac Analytics with Apple" → Continue
- ☐ "Screen Time" → "Set Up Later"
- ☐ "Siri" → uncheck "Enable Ask Siri" → Continue
- ☐ Appearance → whatever → Continue → desktop appears
- ☐  → System Settings → "General" → "Software Update" → install anything pending → let it restart → log back in

## PHASE 2 — Mini: remote access (5 clicks, do BEFORE anything else)

- ☐ System Settings → "General" → "Sharing"
- ☐ Toggle ON "Screen Sharing"
- ☐ Toggle ON "Remote Login" → click the ⓘ next to it → make sure your user is allowed ("All users" is fine)
- ☐ System Settings → "Network" → "Ethernet" → "Details..." → read the IP address (e.g. `192.168.1.47`)
- ☐ Write it down: `MINI IP = ______________`

## PHASE 3 — Mini: Terminal installs (~15 min, mostly waiting)

- ☐ Cmd+Space → type `terminal` → Enter
- ☐ Paste, Enter:
```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
- ☐ It asks for your Mac password (invisible while typing) → Enter → "Press RETURN to continue" → Enter → wait ~5 min
- ☐ When done it prints "Next steps" with two `echo ... eval` commands — copy-paste BOTH exactly as printed, Enter (this puts brew on your PATH)
- ☐ Verify: `brew --version` → prints a version, not "command not found"
- ☐ Paste, Enter, wait ~5 min:
```
brew install git node@20 gh
```
- ☐ Paste each line, Enter after each:
```
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile
git config --global user.name "Jack Boppington"
git config --global user.email "jacksbot147@gmail.com"
node --version
```
- ☐ `node --version` must print `v20.x.x`. If "command not found": close Terminal, reopen, try again.
- ☐ Leave this Terminal window open. The mini now waits for the rsync.

## PHASE 4 — Laptop: handover + transfer (~10 min)

⚠️ Point of commitment: this stops the laptop's runtime. Everything before this is reversible by walking away.

- ☐ On the LAPTOP, open Terminal
- ☐ Type (replace with your noted IP), Enter:
```
MINI_IP=192.168.1.47 bash ~/Documents/studio/scripts/mini-preflight.sh
```
- ☐ Read the output: all 8 env keys should show ✓. If any show ✗ missing → go back to Phase 0.7. Do not continue.
- ☐ Now the real one, Enter:
```
MINI_IP=192.168.1.47 bash ~/Documents/studio/scripts/mini-preflight.sh --handover
```
- ☐ Confirm it prints "stopped N agents" and "HANDOVER marker appended"
- ☐ It printed 3 rsync commands. Copy-paste rsync #1, Enter
  - First time it asks `Are you sure you want to continue connecting (yes/no...)` → type `yes` → Enter
  - Then `Password:` → the MINI's login password → Enter
  - Wait for the progress bar to finish
- ☐ Same for rsync #2 (the businesses folder — this is the big one)
- ☐ Same for rsync #3 (alignmd)
- ☐ Laptop is done for now. Leave Claude desktop OPEN here (this session's remaining scheduled tasks still live here).

## PHASE 5 — Mini: boot + verify (~10 min)

- ☐ Back on the mini's Terminal:
```
bash ~/Documents/studio/scripts/boot-day14.sh
```
- ☐ Wait. npm install takes a few minutes. Watch for ✓ lines: deps, registry, LaunchAgents, dev server, E2E.
- ☐ Then:
```
bash ~/Documents/studio/scripts/mini-verify.sh
```
- ☐ Goal: "ALL GREEN". If red lines:
  - `env: X missing` → the studio rsync didn't carry .env.local → re-run rsync #1 from the laptop
  - `heartbeat: X stale/no file` → wait 2 minutes, re-run verify (pollers need a beat to start)
  - `dev server not responding` → `tail -20 ~/Library/Logs/day14-dev.log` and read the error
  - anything else → screenshot it, ask me on the laptop

## PHASE 6 — Mini: Claude + always-on (~10 min)

- ☐ If Claude desktop isn't installed yet: browser → claude.ai/download → download → open the .dmg → drag Claude to Applications
- ☐ Open Claude → sign in (same account as the laptop)
- ☐ Enable Cowork mode → when it asks for a folder, choose "Documents" (the whole `~/Documents` folder)
- ☐ Terminal, paste both lines, password when asked:
```
sudo pmset -a sleep 0 disksleep 0 powernap 0 autorestart 1 tcpkeepalive 1
pmset -g | grep -E "sleep|autorestart"
```
  → `sleep 0`, `autorestart 1` confirmed
- ☐ System Settings → "General" → "Login Items & Extensions" → under "Open at Login" click "+" → Applications → Claude → "Open"
- ☐ System Settings → "Lock Screen" → "Require password after screen saver begins..." → "Never"  (⚠️ fine for a home office; skip if the mini lives somewhere public)

## PHASE 7 — Mini: wake the brain (2 min)

- ☐ In Finder: Documents → studio → docs → `MINI-FIRST-PROMPT.md` → open it
- ☐ Select everything BELOW the `---` line → Cmd+C
- ☐ New Cowork chat in Claude on the mini → Cmd+V → Enter
- ☐ It will verify itself, recreate the recurring schedule on the mini, and file a jack-tap when it's live. Approve any tool permission prompts it raises (this pre-approves them for future runs).

## PHASE 8 — Launch (mini Terminal + browser, ~10 min)

### 8.1 The merge (todo-94)
```
cd ~/Documents/studio
git checkout main
git merge redesign/apple-base44-2026-06-03
git push origin main
git checkout redesign/apple-base44-2026-06-03
```
- ☐ If the merge stops with conflicts: `git merge --abort` and ask me — don't force anything.
- ☐ The push triggers Vercel. Watch: vercel.com → day14-studio → "Deployments" → top row goes Building → Ready (~2 min)

### 8.2 Vercel env keys (todo-95b)
- ☐ vercel.com → log in → "day14-studio" project → "Settings" → "Environment Variables"
- ☐ For EACH of the 8 keys: paste Key name → paste Value → environments: check "Production", "Preview", "Development" → "Save"
- ☐ After all 8: "Deployments" tab → top deployment → "..." menu → "Redeploy" → confirm (env changes need a redeploy)

### 8.3 Repo private (todo-96)
- ☐ github.com/jacksbot147-code/day14-studio → "Settings" tab
- ☐ Scroll to bottom "Danger Zone" → "Change repository visibility" → "Change visibility" → "Make private"
- ☐ Type `jacksbot147-code/day14-studio` to confirm → confirm

### 8.4 Eyes-on check
- ☐ Phone (cellular, not your Wi-Fi): open day14.us → should show "I build websites and apps in days, not months." with hello@day14.us under the buttons
- ☐ Phone: day14.us/dashboard → should bounce to a login page, NOT show the Empire dashboard
- ☐ Laptop: tell Claude (me) "check it" → I run the full verification from here

---

Done = mini humming headless, day14.us live, admin locked, repo private,
and both brains know who owns what. Unplug the monitor whenever —
Screen Sharing from the laptop: Finder → Go → Connect to Server →
`vnc://<MINI-IP>`.
