# The Builder Log — Newsletter Drafts

> Two drafts. Plain operator voice. ~500 words each. Soft pitch at the bottom.
> Cadence target: weekly. Substack or Beehiiv.

---

## Issue #1 — Shipping vs scoping

I run a build studio called Day14 out of Southwest Florida. The premise is simple and the premise is the entire pitch: a full business platform — marketing site, customer portal, billing, admin app, AI chatbot — shipped in 14 calendar days, fixed price, you own the code.

The newsletter exists because I want to write the thing I wish I'd been reading three years ago when I was getting quoted $40,000 and 6 months by agencies and wondering why every option in front of me was bad.

Most of the writing about software-for-small-businesses is written by people who don't run small businesses. The agency blogs talk about "discovery sprints" and "stakeholder alignment workshops." The SaaS blogs are thinly veiled product ads. The IndieHackers crowd is interesting but mostly talks about pure SaaS plays, not productized services. There's a missing voice that says "I am one operator, I ship real software in two weeks for paying customers, here is what I actually do and what I actually charge."

That's the voice this newsletter is in.

What you'll get from me, weekly:

- One lesson from a live build that week. Usually concrete: a Stripe webhook that bit me, an architectural call I'd make differently, a customer ask I refused. No fluff.
- Pricing transparency. I'll publish what I charged, what I shipped, how long it took, and what the customer's life looks like 30 days later.
- A defense, when warranted, of *productizing* — narrow scope, fixed price, templated builds — against the agency-and-SaaS alternatives.

What you won't get:

- "10 reasons your business needs a website." Look elsewhere.
- AI hype posts. I use AI agents every day; I don't think about them every day. They're a tool. They're not the story.
- Fake humility. I'm not "humbled to be on this journey." I am running a build studio. We ship in 14 days. The thing it does is real.

The most important post I'll write in the first month is the one that confronts the obvious objection: "How can one operator possibly ship a full business platform in 14 days without cutting corners." The answer is detailed and partly technical (template repos, parallel infrastructure provisioning, a 12-step QA gate, a deposit-back guarantee), and it's the thing I'll keep coming back to. Because *shipping vs scoping* is the whole job.

Scoping is what kills agency projects. The budget gets eaten by meetings about what to build instead of the time spent building it. The lesson I keep relearning is that the right scope for a 14-day build is the scope that exists in the template repo on day zero, plus the brand swap, plus the vertical-specific configuration. Anything else is scope creep dressed up as "discovery."

Three live builds in the portfolio so far: Splash Jacks Pools (mobile-service Platform in Naples), Casamoré (rebrand-and-relaunch Site at houseoflove.co), Buildbridge (contractor marketplace with multi-county permit integrations).

Next week: walking through the photo-proof pipeline — sharp, exifr, GPS, watermarks, why it's the most-asked-about feature in every intro call.

If you're a SWFL operator who wants a build like the ones above, intro calls are 30 minutes at day14.us.

— Jack

---

## Issue #2 — Why I'm publishing the build-log live, on purpose

Every active Day14 build has a public URL anyone can watch in real time. Day-by-day timeline, commit shas, screenshots, the daily one-paragraph customer update. day14.us/builds/{customer-slug}. Nothing hidden.

I get asked about this a lot. The question is usually some version of: "Aren't you worried a competitor will copy your work?" The short answer is no, and the long answer is the entire reason this newsletter exists.

Transparency is the strongest marketing move available to a one-person build studio. Here's the case in three points.

**Point one: every prospect who lands on day14.us is asking the same question — "is this real."** Three SKU cards and a homepage hero don't answer that. A live build-log does. You can scroll the day-3 commits on Splash Jacks Pools right now and see exactly what landed: Supabase auth, magic-link sign-in, profile scaffolding. Day 6 was the visit data model. Day 14 was launch. The cadence isn't a claim, it's a public record. That answer is worth a hundred case-study pages with stock photography.

**Point two: agencies that "show their process" don't actually show their process.** They show a deck. They show a Trello board curated to look organized. They show a discovery framework with a name like "Atlas." None of that proves the work shipped. A live commit log with a `vercel deploy --prod` log next to it does. Most agencies cannot afford this level of transparency because it would make their pace look slow. I can afford it because the pace is fast.

**Point three: the build-log doubles as content.** Every commit is a small piece of content. Every screenshot is a piece of content. Every daily one-paragraph customer update is a piece of content. Multiplied by ten builds a year, that's hundreds of small artifacts of "real work shipped" that compound in the marketing flywheel. SEO loves it. Newsletter readers love it. Prospects who are on the fence love it most of all.

The competitor-copies-my-work fear is, on inspection, overstated. The thing competitors would have to copy is not the code — most of it is generic Next.js + Supabase + Stripe — it's the *judgment*. Which features ship in week one vs week two. Which customer asks get a yes and which get a "that's a Platform-tier upgrade." Which integrations are worth specialist work and which are off-the-shelf. That judgment is the moat. The code is just code.

The infrastructure for this lives at `/builds/[slug]` in the Day14 codebase. Static scaffold is up. Per the agenda the next pieces to wire are an auto-screenshot worker and a customer-facing approve-to-publish gate. I'd rather ship the transparency-first version on day one than the slick version on day 90.

If you're an operator thinking about hiring a builder and you can't find a public build-log on their site — that's a tell. Real builders show real work.

Want a live build of your own? day14.us. 30 minutes, fixed price quote on the call.

— Jack
