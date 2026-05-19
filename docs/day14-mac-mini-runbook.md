# Mac mini setup runbook — Day14 OS runtime

> Read top to bottom before you walk into the Apple Store. ~3 hours total
> from in-the-box to your first agent run.

---

## Buy list — Apple Store + Amazon

**At Apple Store (~$700–900):**
- Mac mini, M4, **24 GB RAM** (do NOT skimp here — Claude desktop + Cowork + browsers can eat 16 GB), **512 GB SSD**
- Don't buy AppleCare. The mini will sit on a shelf untouched.

**Amazon / B&H (~$130):**
- **APC UPS** (BR1000MS or similar, ~$130). Florida thunderstorms will kill your runtime otherwise. The mini draws ~10W at idle; even a small UPS gives you 30+ minutes of runtime.
- 6-foot **Cat-6 Ethernet cable** ($8). Don't run the mini on WiFi — wired = zero connectivity drops.
- **HDMI cable** ($8) if you don't have one. You only need it for the 30-min initial setup.

**You probably already have:**
- A monitor and USB keyboard for the first hour of setup. After that you go headless via Screen Sharing.

**Optional:**
- A small 8-port unmanaged switch ($20) if you don't have a free Ethernet port near where the mini will live.

**Total all-in: ~$850.**

---

## Where to put it

Pick a spot with:
- Power outlet (plug into the UPS)
- Ethernet jack (or run a long cable to your router)
- Cool airflow — top of a desk or a shelf works. NOT inside a closed cabinet.
- Out of direct sun

The mini runs silent and cool. It can live in an office corner forever, nobody will know it's there.

---

## Setup sequence — 3 hours, no surprises

### Hour 1: macOS + accounts

1. Connect mini to monitor, keyboard, Ethernet, UPS-powered outlet.
2. Boot. Run through macOS setup:
   - Region: United States
   - Network: choose Ethernet
   - **Apple ID**: sign in with your existing Apple ID so iCloud Keychain syncs all your passwords from your laptop. Critical — saves an hour.
   - **Touch ID**: skip (keyboard probably doesn't have it).
   - **Siri / Analytics**: turn both off.
3. Once at desktop:
   - **System Settings → General → Software Update** → install everything pending. Restart.
   - **System Settings → Privacy & Security → Full Disk Access** → grant to Terminal once you install it (deferred).
   - **System Settings → Sharing** → enable **Screen Sharing** (so you can headless-control from your laptop). Also enable **Remote Login** (SSH) — useful for emergency Terminal access.
   - **System Settings → Network → Ethernet → Details → TCP/IP** → note the IPv4 address. Write it on a sticky note: `mac-mini-day14: 192.168.x.x`. You'll need this from your laptop later.

### Hour 2: dev environment

In Terminal (Cmd+Space → "Terminal"):

```bash
# 1. Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Install essentials
brew install git node@20 gh

# 3. Tell git who you are
git config --global user.name "Jack Boppington"
git config --global user.email "jacksbot147@gmail.com"
git config --global credential.helper osxkeychain

# 4. Authenticate gh (opens browser)
gh auth login

# 5. Make sure node + npm work
node --version
npm --version

# 6. Make the directory the runtime expects
mkdir -p ~/Documents/customers
mkdir -p ~/Documents/studio-templates
mkdir -p ~/Documents/day14-os/logs
```

Clone the repos:

```bash
cd ~/Documents
gh repo clone jacksbot147-code/day14-studio studio
gh repo clone jacksbot147-code/splash-jacks-pools  # if private; otherwise skip
# (Add the studio-templates repos here once we push them.)
```

### Hour 3: Claude desktop + Cowork

1. Download **Claude desktop** from https://claude.ai/download — install.
2. Sign in with your Anthropic account.
3. Enable **Cowork mode**.
4. Open Cowork → mount `/Users/jcboppington/Documents` as the working folder.
5. **Open `~/Documents/studio/docs/SCHEDULED_TASK_CONTEXT.md`** — that's the orientation file every overnight task already reads. Now your laptop's overnight tasks and the Mac mini's overnight tasks share the same context.
6. **Test it**: in Cowork, prompt: `Read ~/Documents/studio/docs/day14-os-vision.md and tell me what the 5 components are`. If it answers correctly, the Mac mini is wired into the OS.

### Always-on settings

Last step — prevent sleep:

```bash
# Prevent the Mac from sleeping
sudo pmset -a sleep 0
sudo pmset -a disksleep 0
sudo pmset -a displaysleep 30   # OK for screen to sleep
sudo pmset -a powernap 0
sudo pmset -a tcpkeepalive 1    # keep network alive

# Auto-restart on power failure (UPS recovers)
sudo pmset -a autorestart 1
```

Then **System Settings → Lock Screen** → "Require password after starting screen saver" → **Off** (so an auto-reboot brings you back to the desktop, not the login screen — Claude desktop relaunches itself).

Also: **System Settings → Login Items & Extensions** → add Claude desktop as a Login Item so it auto-opens on reboot.

---

## Smoke test — does Day14 OS actually run?

From your laptop, on the same WiFi:

```bash
# SSH in
ssh jcboppington@<mac-mini-IP>

# Verify Claude desktop is running
ps aux | grep -i claude | grep -v grep
# (should show the Claude process)

# Trigger a one-shot scheduled task on the Mac mini side:
# (you'll create this scheduled task in Cowork on the Mac mini first;
# fire-time = now + 2 min; prompt = "Ping! Write /tmp/ping.txt with the timestamp.")

# Wait 3 min, then verify it ran:
ls -la /tmp/ping.txt
cat /tmp/ping.txt
```

If `/tmp/ping.txt` exists and has a fresh timestamp, your Mac mini is now the Day14 OS runtime.

---

## Day-2 things (not blocking, do at your leisure)

- **Time Machine backup** to an external drive (~$80 4TB drive). Daily automatic. If the mini dies, you restore everything including all customer dossiers in <2 hours.
- **Tailscale** (free) for secure remote access from anywhere, not just your home WiFi.
- **A LaunchDaemon** that pings a healthcheck URL every 5 minutes (BetterUptime free) so if the mini goes offline you get an SMS.
- **`day14` shell alias** in `~/.zshrc` for quick navigation: `alias day14='cd ~/Documents/studio'`.

---

## What you DON'T need

- A monitor permanently attached. Screen Sharing from your laptop is fine.
- A keyboard permanently attached. Same.
- An external GPU. The mini's onboard is plenty for Cowork.
- More than 512 GB SSD. Customer repos live on GitHub; you only need local clones of active builds.
- A cooling pad. The M4 mini runs cold.
- AppleCare. Mac minis basically never fail.

---

*Estimated total prep time including driving + setup: 4 hours.
Estimated total cost: $850.
Estimated time saved over the next 12 months by having it: ~600 hours.*
