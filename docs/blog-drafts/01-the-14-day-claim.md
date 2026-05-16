# How a one-person shop ships a full business platform in 14 days

A pool service in Naples now runs its entire back office — marketing site, customer portal, billing, photo-proof, admin app, AI chatbot — on software we shipped in 14 calendar days. One operator. Fixed price. Live URL, paying customers, the whole thing.

That's the claim. Here's how the cadence actually works, because the second anyone hears "14 days for a full platform" the next sentence is "you must be cutting corners." We're not. We're cutting *agencies*.

## The cadence, day by day

The intro call is day 0. Thirty minutes. I walk you through splashjackspools.com live — the marketing site, the customer portal, the admin app, the photo-proof flow that watermarks every job with GPS and a timestamp. You pick a SKU. You sign the order form. You pay a 50% deposit. Total elapsed time from "first call" to "deposit cleared": typically under an hour.

Day 1 is intake. One page. Business name, services, pricing, brand colors, five photos, your service area. That's the entire input. No 40-page discovery doc. No three weeks of "stakeholder workshops." If you can fill out a Google Form you can hand me everything I need.

Day 2 your preview URL is live. Marketing site on a `*.day14.dev` subdomain, your brand, your copy, your photos, the AI chatbot already trained on your services. You can send the link to your spouse the same day. Most agencies are still scheduling the kickoff meeting.

Days 3 through 12 are heads-down build. One operator, one Cowork session, one feature area per weekday. Day 3 is auth — magic-link sign-in, no passwords. Day 4 is Stripe billing wired end-to-end. Day 5 is the customer dashboard. Day 6 is the service-specific data model. Day 7 is self-service flows: reschedule, pause, request a quote. Day 8 is email. Day 9 is SMS. Day 10 is data migration from whatever you're escaping. Day 11 is mobile, PWA, performance. Day 12 is QA — every link, every form, every flow.

You get a one-paragraph email at end of day, every weekday. You also get a public build-log at day14.us/builds/{your-slug} where every commit lands within the hour. If you want to know what I shipped on day 6 you don't have to email me — you can scroll the timeline.

Day 13 is the QA gate and a 5-minute Loom walkthrough. Day 14 is launch. Domain pointed, Stripe in live mode, training call done. Or the deposit refunds in full and you keep everything we shipped.

## "You must be cutting corners"

I'll save you the suspense: of course we're optimizing. The whole business is built around things you do once and never repeat. There are three template repos — one per SKU. Brand swap, content swap, deploy, preview URL in under four hours. The auth code is the same auth code that's running on Splash Jacks Pools. The Stripe webhook handlers are the same handlers. The photo-proof pipeline with sharp + exifr + GPS watermarking is the same one that's been running in production for months.

What's *not* templated: your brand, your services, your data model, your integrations, your domain. Every customer ships on their own Vercel project, their own Supabase database, their own Stripe account, their own repo. You own the code from commit zero.

If "cutting corners" means "not rebuilding magic-link auth from scratch on every project," guilty. If it means "skipping QA, shipping bugs, leaving you to find out on day 30," that's the part the deposit-back guarantee covers. Splash Jacks Pools went live on day 14 with a Lighthouse score above 90 on every page, end-to-end Stripe tested in test mode, OG images rendering per route, no `console.log` left in production. The QA gate is a 12-item checklist. None of it is optional.

## The leverage is real

One operator + AI agents is not the same as "one developer." Claude-based agents do the heavy lifting on the parts of the build that are well-defined: the schema, the boilerplate, the tests, the documentation, the daily build-log post. I do the architecture, the customer relationship, the judgment calls, and every line review.

Agencies that ship in 9 months at $50,000 have project managers, designers, frontend engineers, backend engineers, DevOps, QA, account managers, and a salesperson who needs to hit a quarterly number. The math of carrying that overhead is how you get to a $50,000 quote. We don't have that overhead. We pass that savings on. $2,500 for a Site, $5,000 for a Portal, $10,000 for a Platform — and you launch in 7, 14, or 21 days. The savings aren't margin. They're a structural advantage you get because you didn't have to fund seven other salaries.

## The guarantee, in writing

Every Day14 SOW carries this clause: if launch doesn't happen by end of day 14, your deposit refunds in full and you keep everything we've shipped. The repo, the preview deployment, the work in progress. We carry the timeline risk. You can't sue an agency that misses a deadline by 4 months — your only leverage is to stop paying them and walk away with nothing. With Day14 you walk away with the deposit *and* the half-finished platform if it comes to that.

This sounds reckless. It's not. The reason we can offer it is that the cadence above isn't aspirational — it's the cadence we've already shipped on three live builds. Splash Jacks Pools (Platform, 14 days, live in Naples). Casamoré on houseoflove.co (Site, 7 days, rebrand-and-relaunch). Buildbridge (Platform, the most complex thing in our portfolio, multi-county permit integrations and Storm Mode regional moat).

If you've been quoted $25,000 and 4 months for what amounts to a website with a customer login, we should talk. The intro call is 30 minutes. The demo is live software running real customers. Book at day14.us.
