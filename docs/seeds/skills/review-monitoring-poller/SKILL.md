---
name: review-monitoring-poller
description: Poll Google Business Profile, Yelp, and Facebook for new reviews on Day14 customers (and on Day14 itself). Surfaces new reviews within 4 hours of posting. Supporting skill for review-response.
triggers:
  - "new review"
  - "review monitoring"
  - "google business"
  - "yelp review"
---

# review-monitoring-poller

> The longer a negative review sits without a reply, the more it
> compounds. 24h response = standard. 4h response = signal of care.
> This skill ensures every Day14 customer hits the 4h window.

## Data sources

### Google Business Profile
- API: Google Business Profile API (requires OAuth per customer's Google account)
- Polling cadence: every 4h during business hours
- Returns: review_id, rating, text, author, timestamp

### Yelp
- API: Yelp Fusion (limited; review polling requires Yelp business owner authentication)
- Polling cadence: every 8h
- Fallback: HTML scrape if API access not granted

### Facebook Pages
- API: Meta Graph API (requires Page Access Token per customer)
- Polling cadence: every 6h
- Returns: review_id, rating, recommendation, author, timestamp

For each customer with `01-brand.json.social.*` fields populated, the skill polls the configured platforms.

## Per-review processing

For each new review detected:

1. Cross-reference with `reviews` table in customer's tenant (or central Day14 OS table)
2. If review_id is new:
   - Insert row
   - Classify via `review-sentiment-scorer`
   - File approval card "New {platform} review for {customer} — {rating}-star — needs reply"
3. If review_id is known but text changed:
   - Update row + flag for re-review (edits are rare but possible)

## Output table

In Supabase (Day14 OS shared schema, or tenant-specific):

```sql
create table reviews (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     text not null,
  platform      text check (platform in ('google','yelp','facebook')),
  external_id   text unique,
  rating        int,
  text          text,
  author_name   text,
  posted_at     timestamptz,
  detected_at   timestamptz default now(),
  classification text,
  reply_status  text default 'pending'
);
```

## Hard rules

1. **Never auto-reply.** Drafts only (via `review-response` skill); operator sends.
2. **Never include customer reviewer's personal data** in any non-internal output.
3. **Never poll faster than platform's published rate limits.** Bans get costly.
4. **Always include the review's URL** so operator can click through to reply.
5. **Never store more than 100 most recent reviews per tenant.** Older reviews → archive.

## Failure modes

- **Customer's GBP not connected to Day14**: surface to Jack to add the integration during kickoff
- **Customer's Yelp page has no API access**: fall back to scrape; mark confidence lower
- **Review platform rate-limits**: backoff exponentially; resume next window
- **Platform shows review but content is blank**: flag for manual review (usually customer's spam-flagged review pending platform review)

## When invoked
- Scheduled task per cadence above
- Manually when Jack thinks "did we get any new reviews?"
- After every major customer launch (post-launch, watch for first-week reviews)

## Logging

`[YYYY-MM-DD HH:MM ET] review-monitoring-poller → platform: {google|yelp|fb}, tenants_polled: N, new_reviews: N, requires_reply: N`

When negative review:
`[YYYY-MM-DD HH:MM ET] ⚠️ review-monitoring-poller {N}-star review for {customer} on {platform} — see card #{N}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('review-monitoring-poller', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'review-monitoring-poller', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
