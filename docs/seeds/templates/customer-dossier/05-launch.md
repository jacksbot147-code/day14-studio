# Launch — {{company_name}}

> Pre-launch checklist + cutover notes + post-launch issues for 30 days.
> Build Agent fills the checklist as items complete; Jack signs off on
> the cutover; both append to post-launch as issues arise.

## Pre-launch checklist (must all be green before cutover)

### Technical
- [ ] Lighthouse mobile score ≥ 90 (performance, accessibility, SEO)
- [ ] Lighthouse desktop score ≥ 95
- [ ] All images optimized (no >500KB images on landing page)
- [ ] favicon.ico in place
- [ ] robots.txt allows crawlers (in production)
- [ ] sitemap.xml generated
- [ ] No `console.error` in browser console on any page
- [ ] All forms submit successfully end-to-end
- [ ] Phone number `tel:` links work on mobile
- [ ] Email links open the customer's mail client
- [ ] SSL valid for the production domain
- [ ] DNS records propagated (check with `dig`)
- [ ] Stripe webhook signature verification passes
- [ ] Resend domain verified (SPF + DKIM + DMARC)

### Content
- [ ] Every page has a unique title + meta description
- [ ] No "lorem ipsum" anywhere
- [ ] No placeholder phone numbers like (555) 123-4567
- [ ] Owner's actual headshot in place (not template stock photo)
- [ ] Customer-supplied photos used in gallery
- [ ] All addresses match what's on the truck/sign
- [ ] Hours of operation match what's in 01-brand.json
- [ ] Google Business Profile linked

### Legal
- [ ] Privacy policy page exists
- [ ] Terms of service page exists
- [ ] Contact page lists business address
- [ ] If accepting payments: PCI compliance statement linked

### Customer sign-off
- [ ] Customer has previewed the live site
- [ ] Customer has approved the production URL launch
- [ ] Customer knows when launch will happen (timezone-explicit)
- [ ] Customer knows their login for the admin panel (if applicable)

---

## Cutover — {{date + time}}

**Vercel production domain swap:** {{timestamp}}
**DNS verified pointing at Vercel:** {{timestamp}}
**SSL active:** {{timestamp}}
**First production page-load verified:** {{timestamp}}

### Cutover commands run
```
# (record the actual commands, for replay)
```

### Issues during cutover
- (any glitches and how they were resolved)

---

## Post-launch — 30-day watch

### Day 1
- Site uptime: ___%
- Forms submitted: ___
- Stripe transactions: ___
- Issues reported: ___

### Day 7
(same fields)

### Day 14
(same fields — this is the contractual "launched" milestone)

### Day 30
(same fields — close the dossier here if no open issues; move to archived/)

---

## Issues log (chronological)

| Date | Severity | Description | Resolution | Time-to-fix |
|---|---|---|---|---|
| | | | | |
