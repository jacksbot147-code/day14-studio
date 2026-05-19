# Day14 OS — Skills, Agent Crew, Empire, and the Build Order

> The canonical spec for everything past v1 of the Day14 marketing site.
> Captures the Skills library, the multi-agent crew, the LLM Council
> integration, the empire pattern (multiple businesses on one Mac mini),
> and the week-by-week build sequence.
>
> Pair this with `day14-os-vision.md` (the architecture) and
> `day14-mac-mini-runbook.md` (the tomorrow setup).
>
> Written 2026-05-15 night, before the Mac mini lands.

---

## TL;DR

- The Mac mini is a multi-tenant runtime. Day14 is the first tenant.
- Day14 OS runs an agent crew (PM + Builder + QA to start, more later) that ships customer platforms end-to-end with operator approval only at decision points.
- Skills are the unit of reusable judgment — small SKILL.md files that agents load on-demand. Build them as patterns repeat, not preemptively.
- LLM Council is a skill, invoked for strategic decisions worth >15 min of human thought.
- Other businesses (Etsy stores, research agents, future side bets) live as separate tenants under `~/Documents/businesses/`. Same runtime, separate state.
- Trading is research-only. The agent never clicks "submit order." Revisit after 6 months of paper observation.
- Build order: Mac mini → Day14 OS foundation → agents → skills → empire generalization. ~6 weeks to the full stack; ~2 weeks to a working autonomous build pipeline.

---

## 1. The Empire Architecture

The Mac mini is not "the Day14 server" — it's "Jack's operator runtime." Day14 is the first and most-elaborated tenant. Other businesses get the same treatment.

### Folder structure on the Mac mini

```
~/Documents/businesses/
├── day14/                          ← productized agency
│   ├── customers/                  (per-customer dossiers)
│   │   ├── acme-pool-co/
│   │   │   ├── intake.json
│   │   │   ├── brand.json
│   │   │   ├── sow.pdf
│   │   │   ├── credentials.md      (gitignored)
│   │   │   ├── daily-log.md
│   │   │   ├── postmortem.md
│   │   │   └── repo/               (the customer's forked repo)
│   │   └── ...
│   ├── agents/                     (Day14-specific crew prompts)
│   ├── skills/                     (Day14-specific skills)
│   ├── scheduled-tasks/            (cron prompts)
│   ├── public/                     (the live day14.us repo, deployed to Vercel)
│   └── README.md
│
├── splash-jacks-pools/             ← customer #0 / case study
├── casamore/                       ← events brand
├── buildbridge/                    ← contractor marketplace
├── brush-buddies/                  ← Naples kids art camp
│
├── research-agent/                 ← personal R&D analyst (NOT trader)
│   ├── watchlists/
│   ├── briefings/
│   └── README.md
│
└── _shared/                        ← cross-tenant infrastructure
    ├── skills/                     (skills used by 2+ businesses)
    ├── voice-tone/                 (Jack's operator voice profile)
    ├── runtime/                    (the agent-crew dispatcher)
    ├── secrets/                    (vendor API keys, gitignored)
    └── council/                    (LLM Council skill)
```

### What's shared vs separate

| Shared | Separate |
|---|---|
| Runtime (Claude desktop + Cowork + cron) | Customer/business state |
| Cross-business skills (copy-writing, image processing) | Brand identity per tenant |
| Operator voice profile (Jack's tone) | Vendor accounts (each tenant = own Stripe / Resend / etc) |
| Council skill | Decision history per tenant |
| Scheduled-task system | Each tenant's individual schedule |

### Tenant lifecycle

1. **Spawn.** New tenant = new folder. Run `_shared/runtime/spawn-tenant.mjs --name etsy-pool-prints` (to build later) — creates folder structure, copies README template, registers in tenant index.
2. **Brief.** Operator writes `tenant/README.md` with: what the business is, who it serves, success criteria, scale goal. This is the strategic brief only a human can write.
3. **Crew.** Default crew (PM + Builder + QA) attaches to the new tenant. Specialty crew members spawn on first need (Brand Designer attaches when first brand asset is needed).
4. **Operate.** Tenant runs scheduled tasks on its own cadence. Operator gets a daily summary across all tenants.
5. **Sunset / Archive.** When a tenant dies, mv to `~/Documents/businesses/_archive/`. Crew is recycled. Domain stays alive if revenue exists.

---

## 2. The Agent Crew

Seven roles, each a specialist with its own system prompt + tool set + model tier. Start with 3, add as patterns demand.

### Phase 1 — the starter crew (3 agents, weeks 1–3)

**PM (the orchestrator) · model: Sonnet**
- Reads intake, breaks customer build into ordered tasks
- Posts task claims to the message bus, watches who's done what
- Invokes the Council skill when a real decision arises
- Does not write code — assigns it

System prompt outline:
- You are the project manager for a Day14 customer build.
- Your job is to orchestrate, never to execute.
- Read the customer dossier at `customers/{slug}/`.
- For each task in PLAN.md, post a claim message to the bus.
- Watch for completion messages.
- On disagreement between specialists, invoke `council-decision` skill.
- Surface only operator-decisions to Jack — never daily noise.

**Builder · model: Sonnet**
- Forks the right studio-template
- Runs brand-swap
- Pushes commits
- Pings PM with `done` messages
- Subscribes to topic: `claim:fork-template`, `claim:brand-swap`, `claim:code-change`

**QA · model: Sonnet + Playwright**
- Visits every preview URL after a Builder commit
- Runs route smoke test (click all CTAs, fill all forms, check console errors)
- Runs Lighthouse audit
- Runs accessibility scan
- Posts ✓ or ✗ with details

### Phase 2 — content/design crew (add by week 4)

**Brand Designer · model: Haiku**
- Takes intake photos + customer notes, generates color palette + typography
- Writes `brand.json` for the tenant
- Subscribes to: `claim:brand-design`

**Copy Writer · model: Sonnet**
- Hero, services, FAQ, blog posts, EOD updates, customer reply drafts
- Loaded with `day14-voice` skill so output matches Jack's tone
- Subscribes to: `claim:copy-*`

### Phase 3 — ops + customer (add by week 6)

**Photo Stylist · model: Haiku + sharp**
- Processes uploaded photos (crop, watermark, generate thumbs, generate OG image)
- Subscribes to: `claim:photo-*`

**Customer Success · model: Sonnet**
- Drafts EOD update emails
- Classifies inbound customer email
- Builds approval cards for Jack
- Subscribes to: `claim:customer-*`

### Communication model

Every agent reads and writes to a Supabase `events` table — the message bus. Each row is:

```ts
{ id, customer_id, agent, kind, payload, created_at }
```

`kind` is one of:
- `claim:{task-type}` — agent claiming work
- `done:{task-type}` — work complete with result payload
- `blocked:{task-type}` — agent stuck, needs help
- `disagree:{topic}` — agent disagrees with another's output (triggers Council)
- `propose:{action}` — agent suggests a change that needs operator approval
- `note:{anything}` — non-actionable log entry for the build-log

The bridge UI subscribes via Supabase Realtime and renders a live terminal-style feed.

---

## 3. The Skills Library

8 packs, 30 skills total. Build in priority order — don't pre-build, extract from repeated patterns.

### Pack 1 — brand-dna (build FIRST — uniquely yours, feeds everything else)

| Skill | What it knows |
|---|---|
| `day14-voice` | Jack's tone: plain, confident, slightly cocky, builder-y, never consultant-y. With ~30 example phrases. |
| `swfl-context` | Naples zip codes, hurricane season cadence, county permit systems, local pricing norms, peak season timing. |
| `pricing-decision-helper` | Given a customer ask, decide: fits an existing SKU / quote at $200/hr / decline / route to Council. |

### Pack 2 — integrations

| Skill | What it does |
|---|---|
| `stripe-payment-link-creator` | Programmatically create the 3 deposit payment links per customer + wire callbacks to `/thanks` |
| `cal-com-setup` | Provision a Cal.com event type for a new customer, return the booking URL |
| `domain-dns-helper` | Generate exact DNS records (A, CNAME) for the customer's registrar — Cloudflare, Namecheap, GoDaddy, etc. |
| `supabase-project-provisioner` | Create a new Supabase project via API, generate connection strings, write to credentials.md |
| `resend-domain-setup` | Add a customer domain, generate DNS records to verify, wire transactional templates |
| `twilio-number-provisioner` | Acquire a number in the customer's area code, wire SMS templates |
| `vercel-deployer` | Create Vercel project, attach GitHub repo, set env vars, deploy, return preview URL |

### Pack 3 — build

| Skill | What it does |
|---|---|
| `intake-parser` | Normalize a Typeform/Notion intake into `intake.json` |
| `brand-extractor` | Pick palette + typography + voice notes from photos + logo |
| `service-type-mapper` | Given vertical + customer notes, fill in SERVICE_TYPE |
| `template-forker` | Execute the build runbook end-to-end |

### Pack 4 — content

| Skill | What it does |
|---|---|
| `copy-writer` | Writes hero, services, FAQ in customer voice (uses day14-voice for tone) |
| `seo-city-page-builder` | Generate 5 city LPs with proper meta + headline variation |
| `chatbot-prompt-builder` | Assemble the customer's chatbot system prompt from intake + services |
| `eod-update-writer` | Generates the daily customer-facing email |
| `blog-post-writer` | Long-form posts in Day14 voice |
| `case-study-writer` | Turns a completed build into a case study page |
| `newsletter-issue-builder` | Weekly Builder Log issue |

### Pack 5 — media

| Skill | What it does |
|---|---|
| `photo-watermarker` | sharp + EXIF + GPS + timestamp watermark pipeline |
| `og-image-generator` | Dynamic OG image per route with brand tokens |
| `logo-svg-cleaner` | Normalize a customer logo (vectorize raster, simplify, color-adjust) |
| `screenshot-diff-checker` | Nightly visual regression across every live customer site |

### Pack 6 — ops

| Skill | What it does |
|---|---|
| `qa-smoke-tester` | Playwright pass over every route, fill every form |
| `lighthouse-auditor` | Performance + a11y scan with thresholds |
| `link-health-checker` | Broken-link sweep, image 404 detection |
| `dependency-auditor` | Security advisories + version drift for every customer project |

### Pack 7 — customer

| Skill | What it does |
|---|---|
| `feedback-classifier` | Sorts inbound email: scope-question / change-request / complaint / general |
| `change-request-implementer` | Drafts a code patch from a customer's natural-language ask + posts approval card |
| `approval-card-builder` | Packages a proposed change as a phone-friendly approval card with preview screenshot + diff |
| `complaint-triager` | P0 flag handler — pages Jack via SMS, drafts apology + proposed fix |
| `morning-briefing-builder` | Compiles Jack's 9am SMS: pending approvals + active customer status across all tenants |

### Pack 8 — sales

| Skill | What it does |
|---|---|
| `swfl-business-scraper` | Google Maps scrape with vertical filter + ranking signal |
| `lead-qualifier` | Score a lead 0–10 against the ICP |
| `cold-dm-drafter` | Personalized Instagram/email DM drafts |
| `intro-call-prep-doc-builder` | 1-pager research on a prospect for Jack to read pre-call |

### Special — `council-decision`

The LLM Council pattern as a skill. Invoked when:

- Decision affects $1k+ revenue or 4+ hours of work
- Two agents disagree on a path (PM triggers it)
- Operator manually requests (SMS `council: should I take Acme at half price?`)

The skill runs the 5-advisor pass (Contrarian, Reframer, Expansionist, Outsider, Executor) → anonymized peer review → Chairman recommendation. Logs all decisions to Supabase `council_log` table for after-the-fact accuracy review.

### Build priority for skills

Week 2: `day14-voice`, `swfl-context`, `pricing-decision-helper`, `copy-writer`, `eod-update-writer`

Week 3: `template-forker`, `vercel-deployer`, `qa-smoke-tester`, `council-decision`

Week 4: `feedback-classifier`, `change-request-implementer`, `approval-card-builder`, `morning-briefing-builder`

Week 5: `brand-extractor`, `photo-watermarker`, `chatbot-prompt-builder`, `stripe-payment-link-creator`

Week 6+: Everything else, on demand.

---

## 4. The "Agent Never Clicks Submit" Boundary

Agents NEVER do the following without explicit Jack approval:

- Push to `main` on the Day14 site repo (preview deploys are fine; prod is gated)
- Flip a customer's Stripe from test mode to live mode
- Move money (transfers, payouts, refunds)
- Send broadcast SMS to >5 recipients
- Send marketing email to >50 recipients
- Reply on Jack's personal social accounts
- Submit anything to a regulator or government portal
- Sign a contract or order form
- Trade securities (research only, see §6)
- Spawn a new business tenant without a Jack-written brief

Everything else is fair game with the standard preview-first pattern: agent makes a change → posts a preview URL + diff → Jack approves with one tap → it ships.

---

## 5. The Build Sequence

### Tomorrow (the Mac mini lands)

Follow `day14-mac-mini-runbook.md`. Get the mini operational. Don't try to layer Day14 OS on it the same day. Run the smoke-test scheduled task that writes `/tmp/ping.txt`. Eat dinner. Sleep. That's the whole tomorrow.

### Week 1 — Day14 OS Foundation

- Spin up a Supabase project for Day14 OS itself (not for customers — for the orchestration layer)
- Create the `customers`, `approvals`, `events`, `council_log` tables (schema in `day14-os-vision.md`)
- Wire 3 webhook routes at `day14.us/api/webhooks/{stripe,intake,inbound}` — they write to Supabase
- Write the build-agent prompt: one well-prompted Cowork agent that takes a customer row and runs the build runbook end-to-end
- Test against a FAKE customer (`test-pool-co`) with intake JSON you make up
- Goal: deposit-paid webhook → 90 seconds later there's a preview URL emailed to a test address

### Week 2 — Agent crew v1 + skills v1

- Stand up the message bus pattern (3 agents — PM, Builder, QA — reading/writing to `events` table)
- Build the bridge UI at `day14.us/builds/[slug]` with Supabase Realtime — terminal-aesthetic, 7 agent cards (most show "idle" until those crew members exist)
- Extract the first 5 skills: `day14-voice`, `swfl-context`, `pricing-decision-helper`, `copy-writer`, `eod-update-writer`
- Plug skills into the agents
- Test again against the fake customer — same outcome but now with 3 agents collaborating + live bridge view
- Customer #1 in the funnel should land this week

### Week 3 — Phone-first operator UX

- Build approval-by-URL system: a tiny web UI at `day14.us/approve/{token}` showing diff + screenshot + Approve/Reject buttons
- Twilio SMS integration — agents text Jack approval cards, Jack replies "approve" / "reject" / voice-note feedback
- Build the `council-decision` skill
- Wire `morning-briefing-builder` to a 9am cron
- One-page operator console at `day14.us/bridge` (auth-gated) showing all active builds + pending approvals

### Week 4 — Customer feedback loop + content/design crew

- Resend inbound webhook → `feedback-classifier` skill → routes to `change-request-implementer` or `complaint-triager`
- Add Brand Designer + Copy Writer agents to the crew
- Extract `brand-extractor`, `chatbot-prompt-builder`, `case-study-writer` skills

### Week 5 — Empire-pattern generalization

- Build the `~/Documents/businesses/` folder structure for real
- Move Day14 / Splash Jacks / Casamoré / Buildbridge into proper tenants
- Write the `_shared/runtime/spawn-tenant.mjs` helper
- Stand up the research-agent tenant (analyst, not trader — see §6)
- Define which skills are `_shared/skills/` vs `day14/skills/`

### Week 6+

- Add remaining agents (Photo Stylist, Customer Success)
- Build remaining skills as patterns demand
- Add more vertical templates (mobile-service expansion, membership, food)
- Scale to 5 active customers

By end of week 6 the stack is operational. By end of month 3 you're at 5–8 customers and the system runs itself with ~2 hours/day of Jack's time on operator approvals + intro calls.

---

## 6. The Research-Agent Tenant (NOT a trader)

The trading question gets parked. Build a research agent instead. Its job:

- Daily 7am scrape: top stories from Bloomberg, FT, Hacker News, IndieHackers, the SaaS subreddits
- Watch a Jack-curated list of companies/topics (Anthropic, Vercel, Stripe, productized agency landscape)
- Summarize overnight news into a phone-friendly briefing in your 9am SMS
- Surface earnings, M&A, regulatory changes, competitor launches
- Flags interesting tactical info ("Designjoy just raised prices to $7,995")
- **NEVER buys, sells, or recommends trades**

Why this is the right shape: LLMs are excellent at reading + summarizing + pattern-matching across many documents. They're terrible at predicting noisy market outcomes. Get the upside (smart input) without the downside (account-blowing autonomous trading).

Cost: ~$10/mo in Anthropic tokens. Time saved: 30 min/day of you doom-scrolling news = 180 hours/yr.

After 6 months of watching its judgment, if you want to give it READ permissions on a brokerage API (look but don't touch), that's the safer next step. Skip the temptation to give it write permissions until you've seen it consistently right.

---

## 7. What's NOT in scope for the next 6 weeks

Easy to overbuild. Park these:

- Cold-outreach sales agent (build after customer #3)
- Stripe Connect automation (regulatory complexity, defer)
- Multi-vertical templates beyond mobile-service / membership / food
- Customer-facing dashboard beyond the build-log
- Mobile native app for the operator console
- Voice interface (cool but not load-bearing)
- Stocks (parked indefinitely per §6)
- Browser extension for in-context agent invocation
- Slack integration (operator stays on phone/SMS)

When in doubt: **does it move customer #1 closer? Or move customers #1–5 from $0 to $40k/mo run-rate?** If yes, build it. If no, park it.

---

## 8. The compounding moat

By customer #20, you have:

- A Skills library that encodes your operator taste, refined across 20 builds
- An agent crew whose system prompts contain 20 builds of judgment
- A Council decision log with the actual outcomes of 100+ strategic calls
- A bridge UI that prospects can watch live during their own builds
- A customer dossier folder with 20 real cases of "this is what we did when X happened"

Anyone can clone the architecture in a weekend. Nobody can clone the trained-in operator taste — that's 20 customers of refinement that took you 6 months to accumulate. That's the moat. The Mac mini is just where it lives.

---

## 9. Tonight's actual close-out

You shipped Day14, deployed it, designed Day14 OS, picked the Mac mini up tomorrow, designed the agent crew + skills library + empire pattern + Council integration. Three docs are written:

- `day14-os-vision.md` — architecture
- `day14-mac-mini-runbook.md` — tomorrow's setup
- `day14-os-skills-and-empire.md` (this file) — the full spec for the next 6 weeks

**Tomorrow's only job:** pick up the Mac mini, follow the runbook, get to the smoke test. Don't touch this doc tomorrow. Come back to it week 1 when the mini is operational.

Sleep.
