#!/usr/bin/env bash
# Day14 — one-shot deploy script for the marketing site.
# Run from ~/Documents/studio. Re-runnable: skips steps that already finished.

set -euo pipefail

echo "==> Day14 deploy"
echo "==> $(date)"
echo

cd "$(dirname "$0")"

# 1. Verify the local build is green before we touch GitHub or Vercel.
echo "==> Step 1: local build"
npm run build
echo "==> build OK"
echo

# 2. Git init + first commit if needed.
echo "==> Step 2: git"
if [ ! -d .git ]; then
  git init
  git add -A
  git commit -m "feat: initial Day14 marketing site"
  echo "==> git initialized + initial commit"
else
  git add -A
  git diff --cached --quiet || git commit -m "chore: pre-deploy snapshot"
  echo "==> git already initialized; staged any new work"
fi
echo

# 3. GitHub repo create + push if not already wired up.
echo "==> Step 3: GitHub"
if ! gh auth status >/dev/null 2>&1; then
  echo "!! Not logged into gh. Run: gh auth login"
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  GH_USER="$(gh api user --jq .login)"
  echo "==> creating private repo ${GH_USER}/day14-studio"
  gh repo create day14-studio --private --source=. --remote=origin --push
else
  echo "==> origin already set; pushing"
  git push origin HEAD
fi
echo

cat <<'EOF'
==> Step 4: Vercel + day14.us (manual, browser)

  1. https://vercel.com/new
  2. Import the day14-studio repo
  3. Environment variables:
       NEXT_PUBLIC_SITE_URL = https://day14.us
       (optional) ANTHROPIC_API_KEY = sk-ant-...   (turns chat widget on)
  4. Deploy. ~90s. Smoke-test on the *.vercel.app URL.
  5. Project Settings -> Domains -> add day14.us and www.day14.us.
  6. At your registrar for day14.us, add the DNS records Vercel shows.
  7. Watch: https://dnschecker.org/#A/day14.us

==> Step 5: Cal.com

  1. https://cal.com/signup (free tier)
  2. Username: day14
  3. Event type: 30-min Intro call, Mon-Fri, 24h buffer
  4. Custom questions: business name | vertical | what you use today
  5. Paste the URL back in chat -- I will wire it into src/lib/site.ts.

==> Step 6: Stripe Payment Links

  https://dashboard.stripe.com/payment-links
  - Site Deposit:     $1,250 redirect: https://day14.us/thanks?sku=site
  - Portal Deposit:   $2,500 redirect: https://day14.us/thanks?sku=portal
  - Platform Deposit: $5,000 redirect: https://day14.us/thanks?sku=platform

  Paste the 3 URLs back -- I will wire them into the SKU cards.

==> Step 7: smoke test

  Open day14.us in incognito. Walk through every page:
    /, /about, /compare, /verticals/{mobile-service,membership,food},
    /case-studies/{splash-jacks-pools,casamore,buildbridge},
    /builds, /thanks?sku=portal
  Click every "Book intro call" button.
  Open the chat widget bottom-right.

EOF
echo "==> done."
