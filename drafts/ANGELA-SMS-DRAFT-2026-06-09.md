# Angela SMS — paste-and-send
# Open Messages on your Mac, paste, hit send.

---

## The text

```
Hey Angela — Jack from Day14 here. Got your site staged and ready to publish.

To take it live I just need 4 things whenever you have a minute:

1. A headshot (phone photo is totally fine — natural light, head + shoulders)
2. The phone number you want listed
3. The business email you want listed
4. Your current rates if you want them shown (or I can leave it as "text for current rates")

Reply with whatever you have and I'll get the page live the same day. No rush — but anything you send moves us closer.

Preview link if you want to peek first: https://day14.us/brands/angela-music
```

---

## Why this text is structured this way

- **First line names Day14** — so she knows who's texting (not a random number)
- **"4 things" anchored upfront** — sets a small, finite ask. No vague "send me stuff."
- **Each ask is one-line specific** — no decision fatigue. Photo from phone is fine (removes "I need to schedule a real shoot" friction).
- **Rates question gives an out** — "or I can leave it as text for current rates" means she doesn't have to commit to a number now. Honest framing.
- **"Same day"** — sets your turnaround expectation. Builds trust.
- **Preview link last** — only after you've made the ask. She'll click it after replying, not instead of replying.

## After she sends each input

| She sends | You do |
|---|---|
| **Photo** | Drop into `/public/brands/angela-music/portrait.jpg`. Edit `src/app/brands/angela-music/page.tsx`, find "Photo coming", replace with `<img src="/brands/angela-music/portrait.jpg" alt="Angela Currier" className="aspect-[4/5] w-full rounded-2xl object-cover" />` |
| **Phone** | Edit `src/app/brands/angela-music/theme.ts` lines 65-67. Format: `phone: "(239) XXX-XXXX"`, `phoneHref: "tel:+1239XXXXXXX"`, `sms: "sms:+1239XXXXXXX"` |
| **Email** | Same file lines 68-69. `email: "her@email.com"`, `emailHref: "mailto:her@email.com"` |
| **Pricing** | Edit `lessons` array, replace each `blurb` with a price line or leave as-is |

After each edit: `npm run typecheck && git add -A && git commit -m "angela: <what changed>" && git push origin redesign/apple-base44-2026-06-03`. Vercel rebuilds in 60s.

## If she takes >24 hours to reply

Follow-up text:
```
Hey — quick nudge on the headshot and phone/email whenever you have a sec. Site is ready to go live the moment those land.
```

## If she sends extras (testimonials, a story about a student, etc.)

Save everything. We can add a small testimonial card between the "How it works" and FAQ sections later. Don't reject — just don't promise.
