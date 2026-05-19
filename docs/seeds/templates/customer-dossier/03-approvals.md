# Approvals — {{company_name}}

> Every change the Build Agent wants to make goes here as a row.
> Jack flips status to approved or rejected. Build Agent never writes
> "approved" — only "pending" or (after a rejection) the revised
> proposal in a new row.

| ID | Date | Title | Status | Decided by | Decided at | Preview URL |
|---|---|---|---|---|---|---|
| 001 | YYYY-MM-DD | Preview ready — initial brand-swap | pending | | | |

---

## Approval card 001 — Preview ready — initial brand-swap

**Drafted:** {{timestamp}}
**Short link:** day14.us/a/{{short_code}}

### What this is
The first preview deploy after the brand-swap finished. URL works,
colors applied, logos in place, basic copy populated from intake.

### What changed (vs. blank template)
- Brand colors: primary, accent
- Logo replaced in nav + hero + footer
- Company name applied everywhere
- Initial copy populated from 00-intake.md answers
- Stripe webhook stubbed but not wired (test mode)
- Cal.com booking link points to placeholder

### Preview URL
{{preview_url}}

### What I need from Jack
Approval to send this URL to the customer with the "preview ready" email.

### What happens if approved
Email goes out. Customer can click the preview link, browse, and reply
with feedback. Build moves to status `preview-sent`.

### What happens if rejected
Build Agent waits for instruction. The preview URL stays live but
nobody outside this dossier sees it.

---

## Approval card NNN — (next pending here)

(use the same structure for every subsequent approval card)
