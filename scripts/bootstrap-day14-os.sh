#!/usr/bin/env bash
# bootstrap-day14-os.sh
# One-shot scaffold of the Day14 empire at ~/Documents/businesses/.
# Idempotent. Safe to re-run — only seeds files that don't yet exist.
#
# Run on the Mac mini AFTER the runbook is complete and Cowork mounts
# ~/Documents. Run once, then forget.

set -euo pipefail

# ---- paths ----
HOME_DIR="$HOME"
STUDIO_DIR="$HOME_DIR/Documents/studio"
SEEDS_DIR="$STUDIO_DIR/docs/seeds"
BUSINESSES_DIR="$HOME_DIR/Documents/businesses"
SHARED_DIR="$BUSINESSES_DIR/_shared"

# ---- pretty output ----
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
DIM="\033[2m"
RESET="\033[0m"
log()  { printf "${GREEN}✓${RESET} %s\n" "$1"; }
skip() { printf "${DIM}·${RESET} %s\n" "$1"; }
warn() { printf "${YELLOW}!${RESET} %s\n" "$1"; }

echo
echo "Day14 OS — empire bootstrap"
echo "================================================================"
echo

# ---- preflight ----
if [ ! -d "$SEEDS_DIR" ]; then
  echo "ERROR: seeds directory not found at $SEEDS_DIR"
  echo "Make sure ~/Documents/studio is cloned and up to date."
  exit 1
fi

# ---- directory tree ----
echo "Creating directory tree..."
mkdir -p "$SHARED_DIR"/{agents,skills,templates,sql,council-log}
mkdir -p "$SHARED_DIR/templates/customer-dossier"
mkdir -p "$BUSINESSES_DIR"/{day14,splash-jacks-pools,casamore,buildbridge,research-agent}
mkdir -p "$BUSINESSES_DIR/day14/customers"
log "directory tree at $BUSINESSES_DIR"

# ---- helper: copy file if not present ----
seed_file() {
  local src="$1"
  local dst="$2"
  local label="$3"
  if [ ! -f "$dst" ]; then
    cp "$src" "$dst"
    log "seeded $label"
  else
    skip "exists, kept: $label"
  fi
}

# ---- seed: skills ----
echo
echo "Seeding skills..."
for skill in council-decision day14-voice swfl-context pricing-decision-helper eod-update-writer copy-writer leaked-secret-cleanup scheduled-task-prompt-author customer-build-day-1-bootstrap daily-kickoff daily-eod nightly-polish weekly-council-review inbound-classifier approval-card-builder browser-driven-vendor-setup customer-readiness-check template-forker launch-day-cutover action-bias-coach next-app-router-conventions idempotent-bash-script session-path-hardcode-detector warm-dm-personalizer review-response storm-week-comms postmortem-writer stop-and-ship-timer session-recovery outreach-trigger customer-visit-note-writer lead-first-touch-personalizer og-image-generator stripe-payment-link-creator template-vs-product-decision blog-draft-writer intake-parser brand-extractor vercel-deployer dns-records-writer ssl-provisioning-verifier launch-day-customer-email complaint-escalation customer-history-lookup auto-archive-spam lighthouse-runner broken-link-finder ssl-expiry-watcher council-question-quality-check council-advisor-tuner council-decision-followup-tracker agent-handoff agent-disagreement-resolver agent-self-debug discount-floor-enforcer walk-away-detector upsell-detection short-link-router approval-expiry-sweeper approval-revisit-detector voice-drift-detector read-aloud-checker customer-voice-mapper event-rollup-summarizer tomorrow-plan-extractor warmth-calibrator kickoff-call-scheduler intake-nudge-writer dossier-folder-initializer git-fork-utility repo-rename-after-fork template-version-tracker hurricane-watch-poller local-event-detector swfl-vertical-deep-dives lead-source-tracker dm-reply-classifier dm-follow-up-detector topic-idea-generator seo-keyword-fetcher internal-link-suggester stripe-webhook-verifier payment-receipt-customizer stripe-test-mode-validator evacuation-zone-mapper power-outage-detector post-storm-damage-assessor pattern-recurrence-detector root-cause-categorizer prevention-skill-suggester priority-ranker calendar-context-pull yesterday-wins-extractor chemistry-reading-parser visit-photo-attacher followup-action-creator review-monitoring-poller review-sentiment-scorer review-followup-tracker telegram-bridge telegram-inbound-parser telegram-outbound-formatter telegram-command-router telegram-approval-card telegram-conversation-state urgency-classifier jack-asleep-detector batching-quiet-hours telegram-status-pusher event-to-telegram-mapper daily-kickoff-telegram-formatter eod-telegram-formatter nightly-polish-alert vercel-route-stripe-webhook vercel-route-intake-webhook vercel-route-resend-inbound vercel-route-cal-com-webhook supabase-event-listener pipeline-end-to-end-test jack-language-decoder scheduled-task-portability-audit morning-headline-format pre-flight-verification-pass confidence-and-gate-statement incremental-scope-commit error-recovery-resume agent-self-time-budget view-link-handoff numbered-decision-rationale phase-numbered-cross-reference parallel-task-fanout-author auto-approve-low-risk auto-approval-audit escalation-pattern-detector risk-scoring voice-message-transcriber voice-tts-out multi-command-parser shortcuts-bridge apple-watch-complication email-fallback-channel always-on-poller launch-agent-setup watchdog-self-restarter pipeline-stuckness-detector autonomous-health-check mrr-calculator skill-invocation-monitor chatbot-prompt-builder photo-watermarker seo-city-page-builder case-study-writer feedback-classifier no-string-prefix-encoding no-edge-in-memory-state no-hardcoded-tz-offset skill-tree-grower skill-gap-detector skill-spec-generator skill-registrar emergent-skill-graduator skill-naming-validator skill-coverage-auditor skill-promotion-criteria growth-always-on skill-fire-wrapper gap-moment-logger draft-promoter skill-deprecation-flagger skill-merge-suggester skill-version-bumper growth-metrics-dashboard meta-growth-watcher growth-cluster-gap-detector growth-skill-spec-generator recursive-growth-throttle refund-handler dunning-email-sequencer failed-payment-retry chargeback-disputer subscription-pause-handler customer-ltv-calculator cohort-retention-tracker churn-risk-scorer win-back-campaign-trigger upgrade-nudge-detector decision-fatigue-detector defer-vs-do-decider focus-block-protector weekly-priorities-flush energy-state-tracker blog-post-generator seo-keyword-cluster-builder social-cross-post email-newsletter-composer case-study-from-customer linkedin-thought-leadership-post youtube-script-from-blog content-calendar-orchestrator uptime-monitor backup-verifier log-anomaly-detector dns-drift-watcher performance-regression-detector deploy-smoke-tester gdpr-data-export data-retention-pruner audit-log-generator customer-data-deletion-handler privacy-policy-keeper morning-briefing-generator zero-friction-handoff product-catalog-manager inventory-tracker order-fulfillment-orchestrator shipping-label-generator returns-handler abandoned-cart-recovery product-photo-organizer pricing-margin-calculator review-request-sender ecom-stripe-payment-link-setup video-clipper-ffmpeg whisper-transcription-captioner vertical-9-16-edit-pipeline thumbnail-generator tiktok-caption-writer instagram-reel-caption-writer youtube-shorts-caption-writer twitter-video-poster batch-post-scheduler viral-hook-rewriter comment-engagement-tracker social-analytics-rollup per-tenant-daily-rollup cross-business-prioritizer tenant-context-switcher multi-tenant-mrr-aggregator cross-business-content-calendar project-milestone-tracker project-photo-stream project-change-order-handler project-gantt-renderer project-completion-walkthrough project-deposit-balance-billing appointment-booking-engine appointment-reminder-sequencer appointment-no-show-recovery appointment-availability-publisher appointment-recurring-rebooker dispatch-route-optimizer dispatch-tech-tracker dispatch-eta-publisher dispatch-day-of-reshuffler photo-proof-uploader photo-proof-customer-portal photo-proof-watermarker photo-proof-archive; do
  mkdir -p "$SHARED_DIR/skills/$skill"
  seed_file \
    "$SEEDS_DIR/skills/$skill/SKILL.md" \
    "$SHARED_DIR/skills/$skill/SKILL.md" \
    "skill: $skill"
done

# ---- seed: agent prompts ----
echo
echo "Seeding agent prompts..."
for agent in build-agent pm-agent qa-agent; do
  if [ -f "$SEEDS_DIR/agents/$agent.md" ]; then
    seed_file \
      "$SEEDS_DIR/agents/$agent.md" \
      "$SHARED_DIR/agents/$agent.md" \
      "agent: $agent"
  fi
done

# ---- seed: SQL schema ----
echo
echo "Seeding SQL schema..."
seed_file \
  "$SEEDS_DIR/sql/day14-os-schema.sql" \
  "$SHARED_DIR/sql/day14-os-schema.sql" \
  "Supabase schema"

# ---- seed: customer dossier template ----
echo
echo "Seeding customer dossier template..."
for f in README.md 00-intake.md 01-brand.json 02-build-log.md 03-approvals.md 04-feedback.md 05-launch.md; do
  if [ -f "$SEEDS_DIR/templates/customer-dossier/$f" ]; then
    seed_file \
      "$SEEDS_DIR/templates/customer-dossier/$f" \
      "$SHARED_DIR/templates/customer-dossier/$f" \
      "customer-dossier: $f"
  fi
done

# ---- seed: council-log starter ----
echo
echo "Seeding council-log..."
if [ ! -f "$SHARED_DIR/council-log/0001-first-customer-acquisition.md" ]; then
  if [ -f "$STUDIO_DIR/docs/council-log/0001-first-customer-acquisition.md" ]; then
    cp "$STUDIO_DIR/docs/council-log/0001-first-customer-acquisition.md" \
       "$SHARED_DIR/council-log/0001-first-customer-acquisition.md"
    log "seeded council-log entry 0001"
  fi
else
  skip "exists, kept: council-log entry 0001"
fi

# ---- README at the top of _shared ----
if [ ! -f "$SHARED_DIR/README.md" ]; then
  cat > "$SHARED_DIR/README.md" <<'EOF'
# _shared — Day14 empire shared library

The cross-tenant library. Every business under `~/Documents/businesses/`
reads from here. Skills, agent prompts, SQL schema, customer dossier
template, and the Council decision log all live here.

## Layout

- `agents/` — system prompts for each agent role
- `skills/` — Claude Skills (one folder per skill, each with SKILL.md)
- `templates/customer-dossier/` — the working-notebook scaffold copied per customer
- `sql/` — schemas + migrations
- `council-log/` — every LLM Council decision, numbered

## To re-seed from `~/Documents/studio/docs/seeds/`

Run:

    bash ~/Documents/studio/scripts/bootstrap-day14-os.sh

It's idempotent — existing files are preserved.
EOF
  log "wrote _shared/README.md"
else
  skip "exists, kept: _shared/README.md"
fi

# ---- init git for _shared if needed ----
echo
echo "Initializing git in _shared..."
cd "$SHARED_DIR"
if [ ! -d .git ]; then
  git init -q
  git add -A
  git -c user.name="Jack Boppington" \
      -c user.email="jacksbot147@gmail.com" \
      commit -q -m "initial scaffold from bootstrap-day14-os.sh"
  log "git initialized in $SHARED_DIR"
else
  skip "git already initialized in $SHARED_DIR"
fi

# ---- summary ----
echo
echo "================================================================"
echo "Empire scaffolded."
echo
echo "  ~/Documents/businesses/"
echo "  ├── _shared/         ← shared agents, skills, templates"
echo "  ├── day14/           ← main business (link studio repo here)"
echo "  ├── splash-jacks-pools/"
echo "  ├── casamore/"
echo "  ├── buildbridge/"
echo "  └── research-agent/  ← read-only analyst tenant"
echo
echo "Next steps:"
echo "  1. Open Cowork, mount ~/Documents."
echo "  2. Read $SHARED_DIR/README.md"
echo "  3. Read $SHARED_DIR/agents/build-agent.md to verify the contract."
echo "  4. Paste $SHARED_DIR/sql/day14-os-schema.sql into Supabase."
echo "  5. First Council run: $SHARED_DIR/council-log/0001-*.md (already logged tonight)"
echo
echo "Re-run this script anytime new seeds are added. Idempotent."
echo
