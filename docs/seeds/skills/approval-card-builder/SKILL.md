---
name: approval-card-builder
description: The format and contract for every approval card. When an agent needs Jack's sign-off on a change, deploy, customer message, or expense, build an approval card using this format. Cards land in the dossier's 03-approvals.md and (when Twilio is wired) trigger an SMS with a 6-char short link.
triggers:
  - "approval card"
  - "need approval"
  - "Jack's sign-off"
  - "ship a preview"
  - "approve to deploy"
  - "approve to send"
---

# approval-card-builder

> Every change an agent wants to make that needs Jack's eyes goes
> through this format. Consistency matters — a familiar card shape
> lets Jack triage 10 approvals in 60 seconds.

## When an approval card is required

Build a card if the action meets ANY of:

1. **Touches production** — deploy to production domain, push to main
2. **Touches the customer** — email, SMS, voice call, post on their behalf
3. **Costs money** — Stripe charge, domain purchase, paid API tier
4. **Modifies code in a customer-facing way** — UI change, copy change,
   feature add/remove
5. **Crosses a boundary in the build-agent contract** — anything the
   agent's "never" list says no to

Don't build a card for:

- Internal logging
- Drafts to the dossier (those land for review automatically)
- Reading operations (audits, polish checks, sanity checks)
- Skill invocations on internal state

## The card format

Every approval card has this exact structure. Append to the customer's
`03-approvals.md` as a new entry:

```
## Approval card {NNN} — {Title in 6-10 words}

**Drafted:** {timestamp}
**Drafted by:** {agent-name}
**Short link:** day14.us/a/{6-char-code}
**Type:** {deploy | message | code-change | expense | other}

### What this is
{1-2 sentences in plain English. Operator language, not jargon.}

### What changes
- {bullet list of concrete changes}

### Why now
{1 sentence — what triggered this approval}

### Preview / evidence
{One of:}
- Preview URL: {url}
- Diff: see commit {sha} on branch {branch}
- Drafted message body: (paste below)
- Cost estimate: ${amount}

### What happens if approved
{1 sentence — the deterministic next action}

### What happens if rejected
{1 sentence — what the agent does instead}

### What happens if no decision in 72h
{1 sentence — default action: usually "auto-rejected and surfaced
to next morning's kickoff"}

---

**Status:** pending
**Decided at:**
**Decided by:**
**Decided via:** {phone-tap | sms | voice | auto | web}
```

## Short-link generation

The 6-character short code is base32 (no ambiguous chars: no 0/O,
no I/1, no L). Generate via:

```javascript
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function shortCode() {
  return Array.from({length: 6}, () =>
    ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  ).join('');
}
```

Confirm uniqueness against existing rows in `approvals.short_code`
before writing. Retry up to 5 times on collision.

## Card numbering

Within a single customer's dossier:
- First card: `001`
- Sequential thereafter, zero-padded to 3 digits
- Never renumber. Even if a card is rejected, the next one is N+1.

## Title rules

Good titles:
- "Preview ready — initial brand-swap"
- "Hero image change requested by customer"
- "Production cutover — Acme Pool"
- "Vercel build failing on staging"

Bad titles:
- "Update" (too vague)
- "Important: please review ASAP!" (alarmist)
- "Card #5" (no content)
- Title > 10 words (too long for SMS)

## Expiry rule

Every card defaults to a 72-hour expiry. The "what happens if no
decision" field is auto-set to:

- **deploy / code-change:** auto-rejected. Card stays open in the
  dossier but the proposed change does not ship.
- **message:** auto-rejected. The draft email/SMS does not send.
- **expense:** auto-rejected. No money moved.
- **other:** auto-rejected by default; override per-card if needed.

The 72h clock resets if the card is edited (e.g., agent updates the
preview after addressing customer feedback).

## Voice

Use the **day14-voice** skill for the "What this is" / "Why now" /
"What happens if" sections. Specifically:
- Sentences, not bullet fragments
- Direct: "Ships the new hero photo to production" not "Will result in the deployment of the updated hero asset"
- No marketing language
- No "we" — say "I" or "the agent"

## The audit trail

Every approval card creates rows in two tables:

```sql
-- One row in approvals
INSERT INTO approvals (customer_id, title, agent_proposal, diff,
  preview_url, short_code, status, expires_at)
VALUES (...);

-- One row in events
INSERT INTO events (customer_id, agent, kind, payload)
VALUES (..., 'approval-card-drafted', jsonb_build_object(
  'approval_id', $1, 'title', $2, 'type', $3
));
```

When the card is decided, a second event:
```sql
INSERT INTO events (customer_id, agent, kind, payload)
VALUES (..., 'approval-decided', jsonb_build_object(
  'approval_id', $1, 'status', $2, 'decided_via', $3
));
```

## Failure modes

- **Card has no preview URL or diff:** that's a flag. A card without
  evidence is useless. Surface as a logical error, don't ship.
- **Two cards proposing contradictory changes:** dedupe before
  filing. Combine into one card with both options listed.
- **Card needs to ship in <1 hour (urgency):** add the literal phrase
  "**URGENT — needs decision by HH:MM today**" as the first line of
  the body. Don't use the short-link SMS as the urgency channel —
  Jack might not see SMS in time. Tag as P0 in MASTER_LOG.

## Logging

After filing the card, append to MASTER_LOG:
`[YYYY-MM-DD HH:MM ET] approval-card-builder COMPLETE → {customer-slug}/03-approvals.md card-{NNN}, short: {code}`
---

## Growth hook (auto-attached)

This skill participates in Day14's growth-always-on system:

- **When it fires:** call `logSkillInvocation('approval-card-builder', context, customer_slug)` from `@/lib/work-register`. Feeds `skill-coverage-auditor`.
- **When it almost fires but the situation doesn't quite fit:** call `logAdHoc('describe what you did instead', context)`. Feeds `growth-watcher` for 2+ pattern detection.
- **When it fails or returns ambiguous output:** call `logAction({ action_phrase, context, invoked_skill: 'approval-card-builder', notes: 'failure_mode' })`. Feeds `postmortem-writer` triggers.

Triggered by → `growth-always-on` skill (default-on for all Day14 OS agents).
