# Git push fallback — when auth breaks
# When you see: "Password authentication is not supported for Git operations"
# Use this. ~3 minutes once, then you're good for 90 days.

---

## Why this keeps happening

GitHub disabled password auth in 2021. Your Mac's macOS Keychain was caching a Personal Access Token (PAT) that worked for a while, then expired or got cleared. Now you need to re-cache a fresh token.

The previous successful pushes in this session worked because that older cached token was still valid. Something invalidated it (could be a system update, Keychain cleanup, anything).

The fix below is good for 90 days. After 90 days, repeat.

---

## The fix (3 minutes, once)

**Step 1 — generate a new token**

Open in browser:
```
https://github.com/settings/tokens?type=beta
```

Click **Generate new token**. Fill in:
- **Token name:** `day14-mac-push-2026`
- **Expiration:** 90 days
- **Repository access:** Only select repositories → search and pick `day14-studio`
- **Permissions:** scroll to **Repository permissions** → find **Contents** → set to **Read and write**
- Scroll down, click **Generate token**

A long string starting with `github_pat_...` appears at the top. **Copy it immediately** — leaving the page wipes it.

**Step 2 — push using the token**

Back in Terminal:
```
cd ~/Documents/studio
git push origin redesign/apple-base44-2026-06-03
```

When prompted:
- **Username for 'https://github.com':** type `jacksbot147-code` ← critical: NOT `jacksbot147` (that's the wrong username — your GitHub login matches the repo URL `github.com/jacksbot147-code/...`)
- **Password:** paste the `github_pat_...` token (Cmd+V works; you won't SEE it pasted — terminal password fields hide input. That's normal.)

Should succeed. macOS Keychain caches the token. Next push won't prompt for 90 days.

---

## Long-term fix (10 minutes, optional)

Install GitHub CLI so you never deal with PATs again:

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

(That installs Homebrew. ~5 minutes — it actually compiles some things. Follow any prompts about adding brew to your PATH at the end.)

Then:
```
brew install gh
gh auth login
```

Pick: GitHub.com → HTTPS → Yes (authenticate Git with GitHub credentials) → Login with a web browser. Browser opens, you click approve, done.

After that, `git push` from terminal always works without prompting. No PAT renewal needed.

---

## If the PAT path fails too

Probably the username typo. Confirm:
- Your GitHub login: `jacksbot147-code` (matches the repo URL `github.com/jacksbot147-code/day14-studio`)
- NOT: `jacksbot147` (that's a typo and the source of every "Invalid username or token" you saw earlier)

If you used the right username and the token is fresh, push works. If still failing, check:
- Did you select the right repo when generating the token (must be `day14-studio` checked)?
- Did you give Contents = Read AND Write permission (not just Read)?
- Is the token actually copied to clipboard (paste into a Notes app first to verify it starts with `github_pat_`)?

---

## After successful push

Vercel auto-rebuilds the preview within 60-90 seconds. Stable preview URL:
```
https://day14-studio-git-redesign-app-b13829-jacksbot147-codes-projects.vercel.app
```

For production (after merging redesign → main):
```
https://day14.us
```
