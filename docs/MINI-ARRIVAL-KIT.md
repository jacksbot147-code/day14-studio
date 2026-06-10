# MINI ARRIVAL KIT — 2026-06-10

> **The only doc you need tonight.** Every command is inline. Follow top to
> bottom; stop at the first failure. Supersedes the May runbook + day-1
> playbook where they conflict (handover doc wins — and this kit already
> reconciles those conflicts).
>
> **The one rule:** exactly one machine runs the Day14 runtime at a time.
> The laptop hands over (Phase 3); the mini takes over (Phase 4). Never run
> `com.day14.*` pollers on both.
>
> Total budget: ~3.5 hours. ☐ = check off as you go.

---

## Phase 0 — Unbox + connect (15 min)

- ☐ Place the mini: power outlet (into the **UPS**), Ethernet jack, open airflow, no direct sun. Not inside a closed cabinet.
- ☐ Connect: monitor (HDMI), USB keyboard, **Ethernet** (not WiFi), UPS-powered outlet.
- ☐ Power on.

---

## Phase 1 — macOS setup (~45 min, mostly waiting on updates)

- ☐ macOS setup assistant: Region **United States** → Network **Ethernet** → sign in with your **existing Apple ID** (iCloud Keychain brings your passwords — saves an hour) → skip Touch ID → Siri **off**, Analytics **off**.
- ☐ System Settings → General → **Software Update** → install everything pending → restart.
- ☐ System Settings → **Sharing** → enable **Screen Sharing** AND **Remote Login** (SSH). Both are required — rsync in Phase 3 needs Remote Login.
- ☐ System Settings → Network → Ethernet → Details → TCP/IP → **note the IPv4 address** on a sticky: `mac-mini-day14: 192.168.x.x`. Needed in Phase 3.
- ☐ After installing Terminal usage begins (Phase 2): System Settings → Privacy & Security → **Full Disk Access** → grant to Terminal.

---

## Phase 2 — Dev environment on the mini (~30 min)

In Terminal (⌘Space → "Terminal"):

```bash
# 1. Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Essentials
brew install git node@20 gh

# 3. Git identity
git config --global user.name "Jack Boppington"
git config --global user.email "jacksbot147@gmail.com"
git config --global credential.helper osxkeychain

# 4. gh auth (opens browser)
gh auth login

# 5. Verify
node --version && npm --version
```

- ☐ All five blocks ran clean.

> **⚠️ DO NOT `gh repo clone` the studio repo.** The May runbook says to —
> that's stale. The laptop has **unpushed local commits** (HEAD `29885fe`)
> and a gitignored `.env.local`; a fresh clone would silently miss both.
> Everything arrives via **rsync from the laptop** in Phase 3.
>
> **⚠️ SKIP `bootstrap-day14-os.sh`** (the day-1 playbook's Step 2) —
> unnecessary now: `~/Documents/businesses/` arrives fully populated via
> rsync. Only run it if you're ever standing up a *fresh* machine with no
> rsync source.

---

## Phase 3 — Laptop: env keys → preflight → handover → rsync (~30 min + transfer time)

**All steps in this phase run ON THE LAPTOP.**

### 3a. Env keys first (jack-tap todo-95)

`.env.local` currently has only `VERCEL_OIDC_TOKEN` + `GEMINI_API_KEY` —
all webhooks 500 without the rest. Add the missing keys to
`~/Documents/studio/.env.local` **on the laptop now**, so the rsync carries
them and `mini-verify.sh` goes green. Key names (values from your password
manager / each service's dashboard — never stored in docs):

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
ANTHROPIC_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
```

- ☐ All 8 lines present in laptop `.env.local`.

### 3b. Preflight (read-only)

```bash
MINI_IP=<mini-ip-from-sticky> bash ~/Documents/studio/scripts/mini-preflight.sh
```

- ☐ All 8 env keys show ✓ (if any ✗, go back to 3a).
- ☐ Note the loaded-agents count and the printed rsync commands.

### 3c. Handover (laptop goes passive)

```bash
MINI_IP=<mini-ip> bash ~/Documents/studio/scripts/mini-preflight.sh --handover
```

Stops every loaded `com.day14.*` agent and appends a HANDOVER marker to
`businesses/_shared/HANDOVER.md`. From this moment the laptop is passive.

- ☐ Handover ran; marker written.

### 3d. The three rsyncs

Preflight printed these with your IP filled in; they are:

```bash
rsync -az --info=progress2 --exclude node_modules --exclude .next \
  ~/Documents/studio/ jcboppington@<mini-ip>:Documents/studio/

rsync -az --info=progress2 \
  ~/Documents/businesses/ jcboppington@<mini-ip>:Documents/businesses/

rsync -az --info=progress2 --exclude node_modules --exclude .next \
  ~/Documents/alignmd/ jcboppington@<mini-ip>:Documents/alignmd/
```

- ☐ All three completed without errors.

> LaunchAgent plists are **not** copied — they hardcode `$HOME` paths.
> `boot-day14.sh` reinstalls them on the mini in Phase 4.

---

## Phase 4 — Mini: boot + verify (~20 min)

**ON THE MINI:**

```bash
bash ~/Documents/studio/scripts/boot-day14.sh
```

Idempotent: installs deps, regenerates registry + graph, installs + loads
LaunchAgents, starts the dev server detached, runs the E2E pipeline test.

- ☐ boot-day14.sh completed.

```bash
bash ~/Documents/studio/scripts/mini-verify.sh
```

- ☐ **ALL GREEN.** If red, fix ✗ lines top to bottom; common causes: env key missing (Phase 3a), heartbeats need ~60s after boot to appear (re-run after a minute), dev server still starting.

> Known going in (don't debug at 11pm): telegram-poller had been down since
> ~May 22 and events-poller was never installed on the laptop — boot on the
> mini fixes both *once keys exist*. E2E previously failed 3/7 purely on
> missing env keys. day14.us prod still serves old main until todo-94.

---

## Phase 5 — Claude desktop + always-on (~20 min)

**ON THE MINI:**

- ☐ Download Claude desktop from https://claude.ai/download → install → sign in.
- ☐ Enable **Cowork mode** → mount `/Users/jcboppington/Documents` as the working folder.
- ☐ Sanity prompt in Cowork: `Read ~/Documents/studio/docs/day14-os-vision.md and tell me what the 5 components are.` Correct answer = wired in.
- ☐ Always-on power settings:

```bash
sudo pmset -a sleep 0
sudo pmset -a disksleep 0
sudo pmset -a displaysleep 30
sudo pmset -a powernap 0
sudo pmset -a tcpkeepalive 1
sudo pmset -a autorestart 1
```

- ☐ System Settings → Lock Screen → "Require password after screen saver" → **Off** (auto-reboot returns to desktop, not login screen).
- ☐ System Settings → Login Items & Extensions → add **Claude desktop** as a Login Item.

> **⚠️ Cowork dedup rule:** don't run scheduled tasks in the mini's Cowork
> while the laptop's Cowork still has today's tasks running. Let the
> laptop's finish today; recreate recurring ones on the mini this weekend.

---

## Phase 6 — Smoke test + go headless (~20 min)

- ☐ In Cowork **on the mini**: create a one-shot scheduled task firing in 2 minutes with prompt: `Write the current ISO timestamp to /tmp/mini-smoke-test.txt`.
- ☐ Wait 3 minutes, then on the mini:

```bash
cat /tmp/mini-smoke-test.txt   # fresh timestamp = scheduled-task pipeline works
```

- ☐ From the laptop, confirm remote access works:

```bash
ssh jcboppington@<mini-ip> 'ls ~/Documents/businesses/_shared/ && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000'
```

Expect a directory listing + `200`.

- ☐ Screen Sharing from laptop: Finder → Go → Connect to Server → `vnc://<mini-ip>` → you see the mini's desktop.
- ☐ Unplug monitor + keyboard. **The mini is now the Day14 runtime.**

---

## Rollback (if the mini misbehaves)

```bash
# ON THE MINI — stop its agents:
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.day14.*.plist

# ON THE LAPTOP — pull state back and resume:
rsync -az --info=progress2 jcboppington@<mini-ip>:Documents/businesses/ ~/Documents/businesses/
bash ~/Documents/studio/scripts/boot-day14.sh
```

The HANDOVER marker in `businesses/_shared/HANDOVER.md` records who owned
the runtime when.

---

## Source reconciliation (why this doc, not the other three)

| Source | Status | What this kit changed |
|---|---|---|
| `docs/mac-mini-handover-2026-06-10.md` | **Authoritative** | Cutover sequence adopted verbatim |
| `docs/day14-mac-mini-runbook.md` (May) | Mostly valid | Hours 1–3 condensed inline; **`gh repo clone` replaced with rsync**; obsolete `mkdir ~/Documents/customers` scaffolding dropped (rsync brings real state) |
| `docs/day14-mac-mini-day1-playbook.md` (May) | Partially stale | `bootstrap-day14-os.sh` marked **skip-unless-fresh**; smoke test kept; council/symlink steps deferred — not arrival-night blocking |

All script paths referenced above verified present in repo at `29885fe`:
`scripts/mini-preflight.sh`, `scripts/mini-verify.sh`, `scripts/boot-day14.sh`,
`scripts/bootstrap-day14-os.sh`. No missing paths.

*Day-2 (not tonight): Time Machine, Tailscale, healthcheck ping, todo-94 (prod deploy).*
