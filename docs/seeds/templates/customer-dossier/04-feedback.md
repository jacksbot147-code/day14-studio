# Feedback — {{company_name}}

> Every customer message that touches Day14 lands here. Routed by the
> Resend inbound webhook + classifier. The Build Agent appends a
> "drafted reply" under each message; Jack reviews + sends from his
> own inbox.

---

## How entries land here

Inbound email → Resend → webhook at `day14.us/api/webhooks/inbound`
→ classifier tags it as one of:

- `scope-question` — customer is asking for clarification
- `change-request` — customer wants something different
- `complaint` — customer is unhappy
- `general` — small talk / acknowledgment
- `payment` — about billing
- `launch-question` — about going live

Each tagged message gets appended below with timestamp + the agent's
draft reply.

---

## Entry — {{timestamp}}

**From:** {{sender_email}}
**Subject:** {{subject}}
**Classification:** {{tag}}
**Confidence:** {{0.0-1.0}}

### The message
> (quoted verbatim, never paraphrased)

### Build Agent's draft reply (for Jack to send)

*To: {{sender_email}}*
*Subject: Re: {{subject}}*

(draft body in day14-voice — short, specific, no buzzwords)

— Jack
Day14

### Any action this triggers
- (e.g., "draft an approval card to change hero photo")
- (e.g., "no action — pure acknowledgment")
- (e.g., "flag P0 — operator SMS sent")

### Jack's actual reply (after he sends)
> (paste what he actually sent — agent learns voice over time)

---

## Entry — {{next timestamp}}

(repeat structure)
