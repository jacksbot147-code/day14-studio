---
name: capture-monitor
description: Monthly Capture delivery loop for one client — pull call/booking data, score sampled transcripts against the 10-point rubric, draft tuning tasks, assemble the one-page report, and write the vault report note. Use when running monthly Capture delivery, reviewing transcripts, or preparing a client Capture report.
---

# capture-monitor

Runs the SOP monthly loop (Monitor → Tune → Report → Sync) for a named Capture client.

## Inputs
- Client id + month
- GHL export or webhook-fed metrics (calls missed/caught, response times, bookings, attributed revenue)
- Transcript sample: every `urgent`-flagged + 10 random
- The client's tuning log for the month

## Steps
1. Score transcripts (rubric in capture-sop): any <8 or repeated failure → open tuning task with transcript link. Never edit configs here (Tuner's job, T2).
2. Fill the report template from data only — a number with no source doesn't ship; "unknown" beats invented. "What we tuned" comes exclusively from the tuning log; if empty, STOP and raise a tuning-gap card (never send an empty-work report).
3. Verify report prints to one page; queue the send as a T2 card (What/Why/Risk/If-ignored).
4. Write the vault report note (frontmatter: jobs_booked, revenue_attributed, rubric, hours_spent) and update client health.

## Guardrails
Log invocation via work-register; audit-log the queued card. No customer sends, no config changes, no pricing other than pricing.ts values.
