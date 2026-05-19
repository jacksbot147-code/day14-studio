---
name: review-sentiment-scorer
description: Score an inbound review's sentiment + fairness without needing GPT/Anthropic API calls. Uses rating + length + keyword patterns for cheap, fast classification. Supporting skill for review-response.
triggers:
  - "review sentiment"
  - "fair or unfair review"
  - "score this review"
---

# review-sentiment-scorer

> Calling Anthropic API for every review classification is overkill.
> Rating + length + simple patterns get 90% accuracy at zero cost.

## Input
- Review object (rating, text, author, timestamp, platform)
- Customer context (`01-brand.json.voice`, recent service history)

## Classification heuristics

### Step 1 — rating-based first cut
| Rating | Initial classification |
|---|---|
| 5 | `glowing-positive` |
| 4 | `standard-positive` |
| 3 | `mixed` |
| 2 | `negative` |
| 1 | `very-negative` |

### Step 2 — text length signal
| Length (chars) | Modifier |
|---|---|
| < 30 | "minimal-text" — likely emoji-only or 1-line; lower confidence |
| 30-200 | "standard" — normal review |
| 200-800 | "detailed" — high signal value; read carefully |
| 800+ | "essay" — often signals strong emotion; weight 2x |

### Step 3 — keyword signals

For each review text, search for:

**Positive boosters:**
- "amazing", "best", "blown away", "exceeded", "recommend" → bias upward
- "specific praise" (mentions specific person, specific service) → adds 1 to score-confidence

**Negative escalators:**
- "horrible", "scam", "rude", "unprofessional", "lawyer" → critical sub-flag
- "never coming back", "tell everyone", "wish I could give 0 stars" → severity-flag
- ALL CAPS sentences → severity-flag

**Unfair signals (warrants the "negative-unfair" tag from `review-response`):**
- Reference to events not under business's control ("weather was bad")
- Statements that contradict service records (e.g., claims missed visit when records show visit happened)
- Confusion with a different business (uses competitor's name)
- "Bait and switch" / scam language without specifics

### Step 4 — pattern + record check

Cross-reference with customer's service records:
- Did this reviewer get service from this business? (match author name to customer list)
- If not, the review may be misdirected — surface as "out-of-customer review"
- If yes, what was their last visit? Any complaint logged?

## Output

```json
{
  "rating": 2,
  "classification": "negative-unfair",
  "confidence": 0.78,
  "severity": "high",
  "is_customer_of_record": true,
  "tags": ["unfair-claim", "all-caps", "specific-event-reference"],
  "recommended_response_type": "negative-1-2-star-unfair",
  "operator_attention_required": "yes — surface to Jack within 2h"
}
```

## When classification is low-confidence

If confidence < 0.5:
- Surface as "needs manual classification"
- Don't auto-draft a reply

## Hard rules

1. **Never blame the reviewer** in the classification or downstream draft.
2. **Never escalate to "very-negative" based on rating alone** — text matters more than star count.
3. **Never auto-tag as "unfair"** without specific evidence (cross-reference to records).
4. **Always include "operator attention" recommendation** — defaults to "no" for standard positive reviews, "within 4h" for negatives.

## Failure modes

- **Review in language other than English**: flag for manual; don't classify
- **Review text is mostly emoji**: classify by rating + emoji sentiment (✓ = positive, etc.) but lower confidence
- **Reviewer is anonymous**: can't cross-reference to records; rely on text + rating only

## When invoked
- Inside `review-monitoring-poller` for every new review detected
- Inside `review-response` before drafting any reply
- Manually when Jack pastes a review for triage

## Logging

`[YYYY-MM-DD HH:MM ET] review-sentiment-scorer → review_id: {id}, classification: {tag}, confidence: <0.0-1.0>, severity: {low|medium|high}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('review-sentiment-scorer', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'review-sentiment-scorer', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
