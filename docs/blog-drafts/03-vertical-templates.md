# Why we won't build you anything outside three verticals

If you call Day14 and you run a SaaS startup, a HIPAA-regulated clinic, a multi-state franchise, or a B2B procurement marketplace — I'm going to say no on the intro call. Not because we can't build it. Because we'd build it badly compared to someone who's done that exact thing eight times.

Day14 ships three things: mobile-service platforms, membership platforms, and food-and-hospitality sites. Pool service. Lawn care. Salons. Gyms. Yoga studios. Small restaurants. Cafés. Mobile detailers. Dog groomers. That's the catalog. If you don't see your business in that list, the honest answer is to send you somewhere else and not waste your 14 days.

This is the productized agency case, and it's the part that scares people who assume more options means more value.

## Designjoy is the obvious analogy

Brett Williams runs Designjoy. One person. Unlimited graphic design, fixed monthly price, ~$110k MRR last public number. The thing that made it work isn't that he's the best designer in the world — it's that he does *one thing*: marketing graphics in a particular style, on a particular cadence, for a particular kind of customer. He doesn't do logos from scratch. He doesn't do brand strategy. He doesn't do web design. The narrow scope is the entire business model.

Productized services compound when the surface area is small. Every customer build feeds the template. Every template improvement makes the next build faster. Designjoy's tenth client is profitable; his thousandth is more profitable still, because the workflow is the same workflow he ran on client one with a year of accumulated muscle memory layered on top.

Day14 is the same shape. Splash Jacks Pools paid us to build a recurring-visit mobile-service platform. That code now lives in `studio-template-portal` and `studio-template-platform`. The next pool service, the next lawn care, the next mobile detailer — they don't get a fork of Splash Jacks with the word "pool" search-and-replaced. They get a clean template that was *abstracted from* Splash Jacks the day after Splash Jacks shipped. Generic `visit`, generic `serviceType`, generic `metadata` JSON. The pool-specific stuff lives in their own data fields, swapped per customer.

That's why we can ship a Portal in 14 days at $5k. The customer is paying for a fork, a brand swap, a content swap, vertical-specific configuration, and integration with their existing tools. Not for a custom platform from scratch.

## The three verticals, and why

**Mobile-service.** Recurring visits to a customer's location. Pool, lawn, HVAC tune-ups, mobile detailing, mobile pet grooming, dog walking, cleaning, pest control. The data model is `Customer → Visit → PhotoProof`. The operational pain is route scheduling and proof of work. The customer-facing pain is "did they actually show up and do the work." Every one of these businesses needs the exact same software with different colors and the same admin app with different field labels. Splash Jacks proves it works in the wild.

**Membership.** Recurring access to a place or a service. Salons, med spas, gyms, yoga studios, massage practices, climbing gyms, martial arts schools. The data model is `Member → Subscription → ClassBooking`. The operational pain is class scheduling, no-show management, and tier upgrades. The customer-facing pain is booking the right class without bouncing between two apps. Higher AOV than mobile-service, easier sales motion locally, more brand-driven (which actually fits the Casamoré template better than the Splash Jacks template).

**Food and hospitality.** Local restaurants and cafés who want online ordering, loyalty, and an email list but can't justify $300/mo for Toast and a per-transaction surcharge. The data model is `Item → Order → Pickup`. The operational pain is menu changes and order routing. The customer-facing pain is loyalty programs that aren't a punch card. SITE-tier with a custom Square or Stripe integration.

Three verticals. Three templates. Every SWFL service business with under 20 employees fits one of them. Most of them don't even know it because every agency that's quoted them has said yes to everything and shipped something half-baked in nine months.

## "But what about my business that's almost mobile-service?"

This is where the line gets tested. The honest version of the conversation goes like this:

If you do recurring visits, charge a monthly subscription, and care about photo proof — you're mobile-service. We can ship you in 14 days. If you do one-off projects, custom quotes per job, and care about milestones and escrow — you're outside the scope. The closest fit in our portfolio is Buildbridge, which is a Platform-tier marketplace with milestone escrow and multi-county permit integrations. That's a 21-day build, not a 14-day build, and it's a Platform price ($10k) not a Portal price ($5k). We'll tell you that on the call.

If you sell physical product but it's all bespoke, you're outside the scope. If you do appointment-based services with no recurring billing, that's halfway between mobile-service and membership and we'll probably still take it. If you run a SaaS, talk to MVP Expert or House of MVPs — they ship better SaaS MVPs than we do.

The reason this works as a business model is that the no's protect the yes's. Every yes-to-a-bad-fit project is a yes-that-stretches-the-template, a 21-day build that should have been 14, an unhappy customer because the result doesn't quite match what they pictured. Productized economics collapse the moment you let scope grow.

## The lost-business worry, honestly

Yes, we leave money on the table. There's a SWFL roofing contractor who emailed asking for a CRM, a chiropractor who wants an HR portal, a tutoring business that wants a 1:1 lesson booker. All of those would be paying customers. All of those would also pull me away from the build-template loop, which is the actual asset.

The narrow scope is a feature. It means I can quote a Portal in five minutes on the intro call because I've quoted it 30 times before. It means I can ship in 14 days because the template is real, not aspirational. It means the deposit-back guarantee is real, not theater. Widen the scope and all three of those crumble.

Designjoy didn't get to $110k MRR by also doing logo design. We don't get to a sustainable build studio by also doing chiropractor HR portals. The math is the math.

If you fit one of the three verticals, the intro call is 30 minutes and we'll quote you on the call. If you don't, I'll tell you that on the call too, and I'll point you somewhere honest. Either way you don't waste the 30 minutes.

Book at day14.us.
