---
name: review-followup-tracker
description: After a review reply is posted, track whether the reviewer engages (edits review, posts second review, complains further). Closes the loop on the review-response cycle. Supporting skill for review-response.
triggers:
  - "review followup"
  - "did they respond"
  - "review engagement"
  - "reviewer reply"
---

# review-followup-tracker

> A review reply that goes unread isn't closure — it's just text.
> A reply that prompts the reviewer to revise their rating IS
> closure. This skill tracks the difference.

## What gets tracked per replied review

After `review-response` posts a reply, this skill watches for:

| Event | Detection method | Action |
|---|---|---|
| Reviewer edits original review | poll `external_id` for content change | re-classify; if better → log win; if worse → escalate |
| Reviewer posts second review | poll by author_name for new entries | log; classify per `review-sentiment-scorer` |
| Reviewer leaves comment on the business's reply | platform-specific; usually visible in API | log; may warrant further reply |
| Reviewer raises rating | rating change in API | log as "review-recovered" |
| Reviewer lowers rating after reply | rating change in API | escalate hard — our reply somehow made it worse |
| Reviewer messages business directly | DM detection (manual via Jack) | shift to dossier 04-feedback.md |

## Polling cadence

- **First 48h after reply**: every 4h (most reviewer engagement happens here)
- **48h-7 days**: daily
- **>7 days**: weekly until next month
- **Eventually**: stop tracking (most reviews never get another response after a week)

## Output

Per replied review, an event log:

```
# Review followup tracker — {review_id}

## Reply posted: {date}, reply text: "{first 100 chars}..."

## Engagement timeline
- {date+4h}: no change
- {date+1d}: no change
- {date+3d}: reviewer edited original — rating raised 2 → 4 ✓
- {date+5d}: reviewer left a comment on our reply: "appreciate the response"
- {date+7d}: tracking closed; review-recovered

## Final status: recovered
```

## What "recovered" means

A negative review is considered recovered if ANY of:
- Rating increased after reply
- Reviewer's edit removed the most-damaging claim
- Reviewer commented positively on the reply

If none of these in 7 days → "no engagement" — neutral outcome.

If rating dropped or reviewer escalated → "worsened" — flag for postmortem on the reply.

## Hard rules

1. **Never modify the original review** in any way. We track, we don't tamper.
2. **Never reply to a reviewer's edit** without operator approval. New reply = new approval card.
3. **Never publicly thank a reviewer for raising their rating.** Looks transactional. Just let the recovery stand.
4. **Always log "worsened" as a postmortem candidate.** Our reply made it worse → we need to know why.

## Failure modes

- **Platform API doesn't expose review-edit history**: detect by content fingerprint (hash + compare on each poll)
- **Customer can't access their business's review API**: tracking degrades to "manual check; surface to Jack monthly"
- **Reviewer deletes the original review**: rare; treat as "review-resolved" but flag as suspicious (sometimes reviewers delete after legal threat — Jack should know)

## When invoked
- Automatically after `review-response` posts a reply (kicks off the polling)
- Manually when Jack asks "did the reviewer ever respond to our reply?"
- Inside `weekly-council-review` to surface recover-rate trends

## Logging

`[YYYY-MM-DD HH:MM ET] review-followup-tracker → review_id: {id}, days_since_reply: N, status: {tracking|recovered|no-engagement|worsened}`

Quarterly review:
- What % of negative reviews end as "recovered"? Target: >40% over time
- What % end as "worsened"? Target: <5%
- If "worsened" exceeds target → tune `review-response` reply templates
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('review-followup-tracker', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'review-followup-tracker', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
