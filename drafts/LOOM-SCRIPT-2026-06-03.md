# Day14 — Build studio demo, 4-minute Loom
# Updated 2026-06-03 evening — new build-studio positioning
# One-take target. Coffee in hand. Don't over-rehearse.

---

## Setup

- Record at 1080p, talking-head + screen-share layout (Loom's default)
- Wear something a real human would wear (not a hoodie, not a suit)
- Open admin tabs BEFORE hitting record so you're not fumbling
- Pin to Loom workspace, share URL, paste into `LOOM_EMBED_URL` in `src/app/page.tsx`

---

## Cold open (0:00 – 0:30) — verbatim

> "Hey, I'm Jack. I run Day14 — a build studio that ships sites and apps in days, not months. The reason we can move that fast is because we built our own operating system — Day14 OS — and every client project runs on it from day one.
>
> Today I'm going to show you what that actually looks like. Not slides, not a sales pitch — me clicking through the admin app I use to run six of my own businesses, and the workflow that means your build is shipped, hosted, and operated inside two weeks. Let's go."

(Cut to screen-share)

---

## Beat sheet (0:30 – 3:45)

**0:30 — Open day14.us/admin (real screen, real tenants)**

"This is the admin app I open every morning. Six tenants down the left rail — those are six different businesses I run on the same OS. AlignMD is a B2B SaaS for healthcare staffing. Life Loophole is an editorial finance brand. Day14 itself. Three more."

**0:50 — Click the inbox**

"The inbox is the only screen I have to look at. Twelve items right now — content drafts to approve, a candidate dossier from AlignMD, a hero image for a new article. I approve three, skip the rest, and I'm done."

(Approve a few visibly)

**1:20 — Switch tenants**

"Watch this — I click into AlignMD. Same admin, same inbox, completely different business. Different brand, different agents, different evidence verifier — but the surface is identical. That's the multi-tenant part. It's not theory, it's how I save four hours a day."

**1:50 — Show the deploy strip**

"This row up top — every tenant, current deploy status. Green means live, amber means deploying. I push from anywhere, Vercel builds, and the verifier checks the deploy actually shipped what the commit promised. If something's wrong, it surfaces here, not in production."

**2:20 — Show the scheduled-agent panel**

"Here's the agents. Daily briefing fires at 7:30. Content drafts at noon. End-of-day evidence sweep at 4. These run whether I'm at my desk or not. The system stays running while I sleep."

**2:50 — Show the work-log**

"And this is the evidence verifier — every action I or an agent takes, evidenced against the actual file change. So when I say six businesses shipped this morning, I can prove it down to the diff."

**3:15 — Pull up a recent client build (or example)**

"Now — same OS, different paint job. This is a client site we shipped recently — Spark tier, single page, lead capture, hosted on the same stack. Their admin looks exactly like mine, just with their brand. Same agents, same verifier, same inbox. We hand off the keys and they're running on the system we built for ourselves."

---

## Close (3:45 – 4:00) — verbatim

> "If you've got something to ship — a marketing site, a customer portal, a full platform, anything in between — we're booking three projects for July. Twenty-minute scope call, fixed quote in 48 hours, shipped in days. Link in the description. Or just hit me at jack@day14.us. That's it. Thanks for watching."

(End record)

---

## Post-record checklist

- [ ] Trim opening dead air to first frame of audio
- [ ] Confirm Loom thumbnail picks a "showing screen + cursor" frame, not your face talking
- [ ] Set Loom share access to "public, anyone with link"
- [ ] Paste share URL into `LOOM_EMBED_URL` in `src/app/page.tsx`
- [ ] Commit + push the URL change to the redesign branch
- [ ] Reply to the X-thread Tweet 8 with the Loom link as a follow-up tweet (compounds thread engagement)
