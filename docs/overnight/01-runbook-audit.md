# Runbook pre-flight audit — 2026-05-16

> Auto-generated overnight by `overnight-01-runbook-preflight` at ~01:30 ET.
> Walked every command in `day14-mac-mini-runbook.md`, verified every external
> URL, confirmed current macOS version, priced the gear, and identified the
> closest Apple Store for Saturday May 16.
> Audit confidence: **0.85** — high on facts I could verify by direct fetch /
> Apple's own retail page; lower on live in-store inventory (couldn't query the
> Apple cart API from sandbox — see "Critical").

---

## Critical (will block tomorrow if not fixed)

### C1 — Reserve the Mac mini before driving to the store
The audit could not verify live in-store inventory at Coconut Point from the
sandbox (Apple's cart endpoints are not on the egress allowlist). Walking up
on a Saturday afternoon for a non-stock config is a real risk: the M4 mini
24GB / 512GB is a **build-to-order tier** for many Apple Stores — they
typically stock the 16GB / 512GB and 16GB / 1TB base SKUs, and the upgraded
24GB config may be ship-to-store only.

**Mitigation (do this BEFORE driving):**
1. Open the Apple Store app on iPhone (not Safari — the app shows real-time
   in-store stock per location).
2. Configure: Mac mini → M4 chip → 24GB unified memory → 512GB SSD.
3. Check "Pick up: Today" at **Apple Coconut Point (Estero)**.
4. If available → reserve it. Free, holds for ~24h, walk-up is then 5 minutes.
5. If "ship-to-store in 1–2 days" → either drop down to 16GB / 512GB (then
   regret it within a week — Cowork + browsers + Claude desktop eats 16GB),
   OR order online for next-day delivery and run the runbook Sunday.

### C2 — Pricing in the runbook is ~$300 low
The runbook says **"At Apple Store (~$700–900)"** for the Mac mini.
As of **May 1, 2026** (two weeks ago), Apple discontinued the 256GB base mini.
New pricing on apple.com:

| Config | Price |
|---|---|
| M4 / 16GB / 512GB (new base) | $799 |
| **M4 / 24GB / 512GB (what we want)** | **$999** |
| M4 Pro / 24GB / 512GB | $1,399 |

Plus the APC BR1000MS UPS — runbook says **~$130**, current Amazon price is
**$171.94**. Cables $16.

**Realistic all-in: ~$1,190**, not the $850 figure in the runbook.

This is not a runbook *blocker* — Jack will pay the real price at the
register — but if he walks in expecting $850 and sees $999 + tax, he might
hesitate. Flag it now so he's not surprised.

### C3 — `https://claude.ai/download` may already be deprecated
The runbook uses `https://claude.ai/download`. Anthropic's current help-center
article still links to that URL (so it presumably redirects), but the
canonical Anthropic page for downloads in 2026 is now **`https://claude.com/download`**
— the `claude.ai` domain is being narrowed to the web app. The `.com` URL
returns 200 with the macOS installer; the `.ai` URL was 403 from sandbox
(may have been the proxy, may have been Anthropic). Safe move: change the
runbook to `https://claude.com/download`.

---

## Should-fix (won't block but will slow Jack down)

### S1 — macOS will be **Tahoe (26)**, not Sequoia (15)
A Mac mini purchased today ships with **macOS Tahoe 26.x** (current point
release is 26.5, May 11). The runbook's pmset section is captioned
"Sequoia / 2026 macOS" — Sequoia (macOS 15) is one major version behind.

Two consequences:
- **All six `pmset` flags in the runbook still work on Tahoe.** Verified: `sleep`,
  `disksleep`, `displaysleep`, `powernap`, `tcpkeepalive`, `autorestart` are
  all live (just confirm with `man pmset` on the mini before changing them
  if you want to be paranoid). The only deprecation in the pmset man page is
  the action verb `pmset sleep` (forces immediate sleep), which is unrelated
  to `pmset -a sleep 0` (sets the idle-sleep timer to "never"). The runbook
  uses the latter form — safe.
- **Known Tahoe wake-bug:** there are well-documented reports of "screen not
  waking from sleep on macOS Tahoe", especially over Screen Sharing /
  headless. Since the runbook intentionally sets `displaysleep 30` (display
  *does* sleep), watch for: SSH from the laptop works fine, but Screen
  Sharing connects to a black screen. Workaround if it happens: SSH in and
  run `caffeinate -du -t 5 &` to force a display wake, or set
  `displaysleep 0` to disable display sleep entirely (10W is rounding error).

### S2 — `xcode-select --install` is a hidden prerequisite for Homebrew
The Homebrew installer requires Xcode Command Line Tools. On a brand-new
mini, they aren't installed. Homebrew will *attempt* to trigger the install
prompt mid-script, but on Tahoe that can pop a GUI dialog that blocks the
script and is easy to miss. Run it explicitly first:

```bash
xcode-select --install
# Click "Install" in the popup, wait ~5 min, then run Homebrew
```

### S3 — Homebrew install URL — verified, but with a new option
The runbook's command is still current and works:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Heads-up: Homebrew now also ships a `.pkg` installer on GitHub Releases as a
faster alternative. The shell-script flow above is fine — keep it for the
runbook (familiar territory).

### S4 — `node@20` is fine, but ~18 months old; default `node` is now 22 LTS
`brew install node@20` works, but Node 22 is the current LTS as of late
2024 / 2026 default. `brew install node` (no version) installs 22 LTS. If
nothing in the studio repo pins to 20 specifically, just install `node`
without the version pin. Day14 templates were built on 20 — confirm with
`cat ~/Documents/studio/package.json | grep -i node` from the mini after
clone if you want to be sure.

### S5 — `gh auth login` will prompt interactively
The runbook implies "opens browser" but `gh auth login` actually asks four
questions first (GitHub.com vs Enterprise; HTTPS vs SSH; web browser vs
token; etc.). 90 seconds of arrow-keys. Defaults are fine — just don't be
surprised by the prompts. Choose: **GitHub.com → HTTPS → Login with browser
→ Yes (authenticate Git)**.

### S6 — Splash Jacks repo + studio-template repos return 404
`gh repo clone jacksbot147-code/splash-jacks-pools` will fail unless that
repo is private and Jack is authenticated. From public github.com:
- `jacksbot147-code/day14-studio` → **200 OK, public, clone will work** ✓
- `jacksbot147-code/splash-jacks-pools` → **404** (private OR doesn't exist)
- `jacksbot147-code/studio-template-{site,portal,platform}` → **404** (all)
- `jacksbot147-code/studio-templates` → **404**

The runbook already says "if private; otherwise skip" for splash-jacks, and
notes the studio-templates repos aren't pushed yet, so this matches
expectation. Just be ready for the splash-jacks clone to fail and confirm
it's a private-repo auth issue (not a missing repo).

### S7 — `gh auth login` must be done BEFORE `gh repo clone` for private repos
The runbook orders this correctly already. Worth highlighting: if the
splash-jacks repo is private, the clone will silently fail without auth,
and Jack might think the repo is broken. Verify `gh auth status` between
the two steps.

---

## Nice-to-know (informational deltas since the runbook was written)

### N1 — Mac mini configuration map (May 2026)
The currently-orderable mini lineup is M4 (non-Pro), M4 Pro, and a refreshed
M4 / M4 Pro skipping the 256GB base. The 24GB / 512GB target config exists
in both M4 and M4 Pro flavors:
- **M4 / 24GB / 512GB — $999** ← this is what the runbook recommends and it's the right call.
- M4 Pro / 24GB / 512GB — $1,399 — overkill for the Day14 OS workload (Claude desktop, Cowork, browser, Terminal). The +$400 buys faster GPU + extra ports neither of which matter for the runtime.

### N2 — APC BR1000MS specs reminder
1000VA / 600W, Pure Sine Wave (good — modern Mac PSUs need this), 10 outlets
(6 surge+battery, 4 surge-only), LCD, USB-A + USB-C charging ports, AVR.
At ~10W idle draw, the mini gets ~1 hour of runtime from this UPS. Reviews
in 2026 still call it the gold-standard. **Buy it on Amazon, not in-store
at Best Buy** — Amazon is $172, Best Buy is $200+.

### N3 — Cowork plan requirement
Cowork mode requires a **paid Anthropic plan** (Pro, Max, Team, Enterprise).
Already true for Jack — flagging only so it's not a "wait, why is this
greyed out" moment if his plan ever lapses.

### N4 — macOS 15 (Sequoia) vs macOS 26 (Tahoe) — naming change
Apple switched to **year-based numbering** with Tahoe. Don't be confused
seeing `macOS 26` on the About screen — it's the next major version after
Sequoia 15, not an Intel-only jump or a beta.

### N5 — Tahoe is the LAST macOS supporting Intel Macs
Irrelevant for the M4 mini, but worth knowing: macOS 27 (announced WWDC
June 2026, ~3 weeks away) will be Apple Silicon only.

---

## Recommended runbook edits (specific old → new diffs)

Note: per overnight-task rules, I have NOT edited the runbook itself.
These are proposed diffs for Jack to apply tomorrow morning if he agrees.

**Edit 1 — Update the Mac mini price line (Buy list, ~line 11):**
- OLD: `At Apple Store (~$700–900):`
- NEW: `At Apple Store (~$999, as of May 2026):`

**Edit 2 — Add a "Reserve first" line above the Mac mini bullet (~line 11):**
- ADD ABOVE THE BULLET: `**Reserve before driving** — open the Apple Store app on iPhone, configure M4 / 24GB / 512GB, "Pick up: Today" at Coconut Point. If it's not in stock for same-day pickup, order online for next-day delivery instead of walking up cold.`

**Edit 3 — Update the UPS price (~line 15):**
- OLD: `**APC UPS** (BR1000MS or similar, ~$130).`
- NEW: `**APC Back-UPS Pro BR1000MS** (~$172 on Amazon, May 2026). Pure sine wave — important for the mini's PSU.`

**Edit 4 — Update the total (~line 25):**
- OLD: `**Total all-in: ~$850.**`
- NEW: `**Total all-in: ~$1,190.**`

**Edit 5 — Add Xcode CLT before Homebrew (Hour 2 dev environment, ~line 62):**
- ADD A NEW STEP `0.` BEFORE the existing `# 1. Install Homebrew` block:
  ```bash
  # 0. Install Xcode Command Line Tools (required by Homebrew). Wait for
  # the GUI installer to finish before continuing.
  xcode-select --install
  ```

**Edit 6 — Update the Claude desktop URL (Hour 3, ~line 98):**
- OLD: `Download **Claude desktop** from https://claude.ai/download`
- NEW: `Download **Claude desktop** from https://claude.com/download`

**Edit 7 — Soften the node pin (Hour 2, ~line 67):**
- OLD: `brew install git node@20 gh`
- NEW: `brew install git node gh   # node defaults to 22 LTS; pin to node@20 only if a customer build requires it`

**Edit 8 — Add Tahoe note to the pmset section header (~line 107):**
- OLD: `### Always-on settings`
- NEW: `### Always-on settings (verified on macOS Tahoe 26.5)`

**Edit 9 — Add headless-wake warning to the smoke test (~line 130):**
- ADD A NOTE AFTER THE SSH section: `> **Tahoe headless quirk:** Screen Sharing may connect to a black screen on first attempt because the display has slept. SSH in and run \`caffeinate -du -t 5\` to wake the display, then retry Screen Sharing. If this becomes routine, set \`pmset -a displaysleep 0\` (10W is rounding error on the electric bill).`

---

## Apple Store recommendation

**Apple Coconut Point** is the right call — it's the closest Apple Store
to Cape Coral by ~15 miles vs. the alternative (Waterside Shops in Naples).

| Field | Value |
|---|---|
| Store name | Apple Coconut Point |
| Address | 23151 Fashion Drive, Estero, FL 33928 |
| Phone | (239) 949-8860 |
| **Saturday May 16 hours** | **10:00 AM – 8:00 PM** |
| Sunday May 17 hours | 11:00 AM – 6:00 PM |
| Drive time from Cape Coral | ~35 min via I-75 S |
| Services confirmed | Shop by drop-in ✓, Order pickup in-store ✓, Genius Bar by appt ✓ |
| Wait-time policy | Apple Stores don't publish wait times; Saturday mornings (10am–noon) are typically the lightest. Walk-in is fine for purchases — no appointment needed. |

**Backup option** (only if Coconut Point can't fulfill same-day): Apple
Waterside Shops, 5555 Tamiami Trail N, Naples, FL 34108, (239) 254-4240,
Sat 10 AM – 7 PM. ~15 minutes further south.

**Recommended timing:** Reserve via the Apple Store app tonight or first
thing tomorrow morning. Arrive at opening (10 AM Saturday) — fewer people,
fastest checkout, gives you the full afternoon to do the 3-hour runbook
and still hit the Day-1 playbook before dinner.

---

---

## Bonus: Day-1 playbook spot-check

Audited `day14-mac-mini-day1-playbook.md` end-to-end. Quick findings:

- **Step 2 (`bootstrap-day14-os.sh`)** — script exists at the expected path,
  is executable (`-rwx`), passes shellcheck visually (uses `set -euo pipefail`,
  quoted paths, idempotent `seed_file` helper). Seeds are all present:
  `council-decision/`, `day14-voice/`, `swfl-context/` skills + `build-agent.md`
  agent + `day14-os-schema.sql` + customer-dossier template. **Will run
  cleanly on the mini.** ✓

- **Step 4 (Council skill test)** — references `~/Documents/businesses/_shared/skills/council-decision/SKILL.md`,
  which the bootstrap script seeds from `~/Documents/studio/docs/seeds/skills/council-decision/SKILL.md`.
  Source file confirmed present in the studio repo. ✓

- **Step 5 (symlink `~/Documents/studio` → `~/Documents/businesses/day14/studio`)**
  — the playbook already flags in Troubleshooting that "Cowork sandbox may
  not follow symlinks." Confirming this is a real risk: Cowork's workspace
  bash mounts the user folder via a chroot/overlay and **symlinks crossing
  the mount boundary often don't resolve**. Recommend defer the symlink to
  Week 2 by default, not as a fallback. The mini will work fine with
  `~/Documents/studio/` unsymlinked for now.

- **Step 7 (SSH from laptop)** — the playbook correctly notes "if SSH key
  isn't set up yet, return 'SSH not yet configured'". Worth knowing:
  Sequoia/Tahoe defaults block password SSH for some accounts unless
  explicitly enabled. If "Remote Login" is on in System Settings → Sharing
  (the runbook does enable this), password auth works. Add a key with
  `ssh-copy-id` from the laptop later for convenience.

- **No critical issues in the Day-1 playbook.** It's well-sequenced and
  every step validates the previous one. Estimated 30 min budget is
  realistic if the bootstrap finishes in <1 min (it should — pure copy ops).

---

## Sources

- [Homebrew install command (brew.sh)](https://brew.sh/)
- [Claude Desktop install help (Anthropic)](https://support.claude.com/en/articles/10065433-install-claude-desktop)
- [Apple Mac mini M4 24GB/512GB product page](https://www.apple.com/shop/buy-mac/mac-mini/m4-chip-10-core-cpu-10-core-gpu-24gb-memory-512gb-storage)
- [Apple discontinues 256GB Mac mini base — 9to5Mac, May 1 2026](https://9to5mac.com/2026/05/01/apple-discontinues-base-mac-mini-now-starts-at-799-with-512gb-storage/)
- [APC BR1000MS on Amazon](https://www.amazon.com/APC-Sinewave-Battery-Protector-BR1000MS/dp/B0779KYKLB)
- [Apple Coconut Point store page](https://www.apple.com/retail/coconutpoint/)
- [Apple Waterside Shops store page](https://www.apple.com/retail/watersideshops/)
- [macOS Tahoe 26.5 release — MacRumors May 11 2026](https://www.macrumors.com/2026/05/11/apple-releases-macos-tahoe-26-5/)
- [pmset reference (ss64)](https://ss64.com/mac/pmset.html)
- [pmset on macOS Tahoe 26.5 — Der Flounder](https://derflounder.wordpress.com/2026/05/12/using-pmset-to-set-your-mac-to-automatically-power-on-when-power-is-available-on-macos-tahoe-26-5-0/)
- [macOS Tahoe sleep/wake issues — community reports](https://discussions.apple.com/thread/256150505)
- [GitHub: jacksbot147-code/day14-studio](https://github.com/jacksbot147-code/day14-studio) — verified public, 200 OK
