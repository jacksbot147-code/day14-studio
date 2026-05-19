# Customer dossier template

> The working notebook for every customer build. Copied into
> `~/Documents/businesses/day14/customers/{slug}/` when a customer's
> deposit clears. The Supabase `customers` table is the system of
> record; this folder is the agent's notebook.

## Contents

| File | Purpose | Written by |
|---|---|---|
| `00-intake.md` | Customer's filled intake form (27 questions) + initial discovery notes | Intake webhook + Jack on kickoff call |
| `01-brand.json` | Name, logos, colors, fonts, contact info — the brand-swap input | Intake webhook (auto) + Jack (review) |
| `02-build-log.md` | Running daily log of what was built, in plain English | Build Agent |
| `03-approvals.md` | Every approval card decision: pending / approved / rejected | Build Agent + Jack (decisions) |
| `04-feedback.md` | Every customer reply email + classifier output | Inbound webhook |
| `05-launch.md` | Pre-launch checklist + cutover notes + post-launch issues | Build Agent + Jack |

## Lifecycle

1. **Deposit clears** (Stripe webhook fires) → row inserted into
   `customers` with status `awaiting-intake`. Dossier folder created
   by webhook. Empty placeholder files staged.
2. **Intake form submitted** → 00-intake.md filled; 01-brand.json
   generated from intake answers; status moves to `building`.
3. **Build Agent picks it up** → starts logging to 02-build-log.md
   and queueing approvals into 03-approvals.md.
4. **Customer replies** → email lands in Resend → inbound webhook
   classifies it → appended to 04-feedback.md.
5. **Launch day** → 05-launch.md filled, status moves to `launched`.
6. **Post-launch** → 05-launch.md continues to log any issues for
   30 days. After 30 days, dossier moves to `archived/`.

## Sample files

The empty templates for each of 00–05 live alongside this README:

- `00-intake.md` — empty form with all 27 intake questions
- `01-brand.json` — empty brand object with required keys
- `02-build-log.md` — header + first entry template
- `03-approvals.md` — header + table template
- `04-feedback.md` — header + entry template
- `05-launch.md` — empty checklist

The Build Agent fills these in; nothing is hand-typed by Jack
except on the kickoff call (he updates 00-intake.md with anything
the form missed).

## Why the dossier exists

If Day14 ever has to hand off a customer to someone else, or rebuild
the relationship from scratch after a Supabase outage, the dossier
folder is the single source of truth — git-tracked, plain-text,
human-readable. The database is fast; the dossier is durable.
