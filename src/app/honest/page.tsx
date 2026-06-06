import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * /honest — public objections + rebuttals. Every reason someone might NOT
 * hire Day14, in their own voice, plus the rebuttal. Compounds trust by
 * pre-empting the bounce. Praveen-tier procurement signal.
 *
 * Voice-aligned: I, not we. Confess first, engineer second.
 */

const TITLE = "Day14 — every reason not to hire me, and what I'd say back";
const DESCRIPTION =
  "Honest objections about Day14 from real persona audits, with the rebuttal. Better to know on this page than discover at week 4. Praveen-tier transparency.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/honest" },
  openGraph: {
    title: `${TITLE} — ${SITE.brand}`,
    description: DESCRIPTION,
    url: `https://${SITE.domain}/honest`,
    siteName: SITE.brand,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} — ${SITE.brand}`,
    description: DESCRIPTION,
  },
};

const OBJECTIONS = [
  {
    n: "01",
    headline: "You're one person. What happens when you're sick?",
    voice: "I want a team behind the project. Bus factor matters.",
    rebuttal:
      "Fair. Here's the truth: I'm one operator, and if I'm out of action for more than 3 days, your timeline slips by exactly that many days. Day14 OS captures every decision, every commit, every credential in one place — so if I genuinely couldn't continue, you'd hand the repo + the work-log to any capable Next.js developer and they could pick it up. I'll write down the names of three I'd recommend on day 1. That's a better bus factor than most 8-person agencies where the senior engineer can quit on Friday and nobody on the team remembers why the auth flow works the way it does.",
  },
  {
    n: "02",
    headline: "No portfolio of work for someone like me.",
    voice: "I'm a coach / dentist / lawyer / nonprofit / trades owner. You've only built SaaS.",
    rebuttal:
      "I've built across 11 verticals — healthcare staffing, field service, events, two-sided marketplaces, editorial finance, D2C wellness. If your category isn't in that list, you might be right to wait until it is. But the cross-pollination is actually the moat — every vertical teaches the next. The first pool service customer wasn't the second pool service customer. If we're a fit for the first one in your category, I'll take 30% off — your project becomes my new case study.",
  },
  {
    n: "03",
    headline: "$1,500 is suspiciously cheap.",
    voice: "Real studios charge $15k+ for a custom site. Either you're skipping something or you'll quit halfway.",
    rebuttal:
      "Spark at $1,500 is for a single-page site with lead capture, 5 days, no custom design from scratch — I pull from a small library of patterns I've battle-tested across the six businesses I run. It's not a 5-page agency build. It's a one-page sniper. If you need a 5-page custom build, that's Studio at $9,000. If you need a real platform with portal + admin + billing, that's $24,000. The $1,500 tier exists because some buyers genuinely need a one-pager and the agency tax on that is silly. It doesn't represent the actual cost of bigger work.",
  },
  {
    n: "04",
    headline: "$1,500 isn't a serious vendor signal.",
    voice: "Procurement won't approve anything under $25k. You're below our threshold.",
    rebuttal:
      "If your procurement floor is $25k, look at Platform ($24k) or Custom (quoted in 48h). I've done two $60-90k engagements this year — names available on the intro call. The public price list doesn't mean Day14 only ships cheap work; it means Day14 doesn't hide pricing from solo buyers. If you need a vendor packet — W-9, COI, mutual NDA, MSA on your paper, reference CTOs — say the word. I respond to procurement asks within 24 hours.",
  },
  {
    n: "05",
    headline: "You're too technical / too jargon-y.",
    voice: "The terminal flourishes and CLI accents made me feel like this isn't for me.",
    rebuttal:
      "Caught. The site is built for the kind of person who hires me most often (technical founders, indie hackers, OS-curious operators), and that taste tilts toward terminals and mono fonts. I dialed it back ~40% on mobile after the persona audit caught the issue, but I'm still leaving it on desktop because it signals craft to the people who hire me. If you'd rather work with someone who looks more agency-friendly, that's a real preference and I respect it. If you want to work with someone whose taste is sharp and you don't mind that the homepage isn't designed for you specifically, we're a fit.",
  },
  {
    n: "06",
    headline: "You won't sign our paper.",
    voice: "We have a vendor MSA we use for every contractor. Take it or leave it.",
    rebuttal:
      "I'll sign mutual NDAs same day. I'll work on your MSA up to ~$50k engagements without negotiation, and at higher levels I'll have an attorney redline a few clauses (IP assignment, liability cap, non-compete scope) but won't drag it out. The only deal-breakers: clauses that prevent me from listing you as a reference, clauses requiring on-site work, or clauses with personal liability beyond E&O coverage. Send me the paper and you'll have a redline back in 5 business days.",
  },
  {
    n: "07",
    headline: "No security posture / no SOC 2.",
    voice: "We can't pass our vendor risk review without a SOC 2 report.",
    rebuttal:
      "SOC 2 is in progress with a target of Q4 2026. For now: I carry $2M general liability + $1M E&O, every site runs HTTPS-only with modern security headers, customer data is stored in Supabase (SOC 2 Type II certified) or my own Postgres with at-rest encryption. I'll sign a DPA, provide a sub-processor list, and answer any security questionnaire under NDA. If your vendor risk review hard-requires a completed SOC 2 today, I'm not your vendor today. Check back in Q4.",
  },
  {
    n: "08",
    headline: "Day14 OS — what happens if I want to leave?",
    voice: "I don't want to be locked into your platform forever. What's the exit?",
    rebuttal:
      "Your code is yours. Always. The repo is on your GitHub, the database can dump to any Postgres host, the Stripe is in your account. Day14 OS adds: scheduled tasks, the inbox, the evidence verifier, the work-log. If you leave, you lose those — but you keep everything else. I'll write you a 1-page migration guide on the way out, the same way I'd want one if I were leaving someone else's platform. The lock-in is zero by design because if I had to lock you in to keep you, the product wouldn't be working.",
  },
  {
    n: "09",
    headline: "I want weekly status calls and a Slack channel.",
    voice: "Your 'one operator, daily Looms' model doesn't fit how my team works.",
    rebuttal:
      "If your team needs a weekly status call and a shared Slack channel, I'm not the right vendor. The Daily Loom model works because the meetings agencies have are the meetings agencies need; one operator with the OS doesn't need them. I save the meeting time and pass the savings to you in price + speed. If that trade-off doesn't fit your operating rhythm, we'll both be unhappy by week 2.",
  },
  {
    n: "10",
    headline: "I want to negotiate the timeline / scope mid-project.",
    voice: "We don't know exactly what we want yet. We need flexibility.",
    rebuttal:
      "Then we shouldn't sign yet. The whole Day14 model is fixed scope, fixed price, fixed timeline — and the reason that works is that the scope is decided BEFORE we sign. If you're not sure what you want, book the intro call and we'll talk through it for 15 minutes. I'll tell you whether you're ready to scope a project, what questions to think about, and whether anyone (including me) is the right vendor for you right now. Sometimes the right answer is 'wait a month.' I'll say so.",
  },
];

export default function HonestPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-page pt-14 pb-20 sm:pt-20">
        <div className="eyebrow mb-6">Honest objections</div>
        <h1 className="max-w-4xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px]">
          Every reason not to hire me.
          <br className="hidden sm:block" /> And what I&rsquo;d say back.
        </h1>
        <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
          Most agencies hide the objections until they&rsquo;re on the intro call. I&rsquo;d rather you bounce here than at week 4. If anything below is a deal-breaker, you just saved both of us a meeting.
        </p>

        <div className="mt-16 space-y-16">
          {OBJECTIONS.map((o) => (
            <article key={o.n} className="grid gap-8 border-t border-warm-gray-100 pt-10 lg:grid-cols-[80px_1fr] lg:gap-12">
              <div className="font-mono text-[14px] font-bold uppercase tracking-[0.22em] text-ember-600 tnum">
                {o.n}
              </div>
              <div>
                <h2 className="text-[28px] font-extrabold leading-[1.1] tracking-tightest text-ink sm:text-[32px]">
                  {o.headline}
                </h2>
                <blockquote className="mt-5 border-l-2 border-warm-gray-200 pl-5 text-[16px] italic leading-[1.6] text-warm-gray-500">
                  &ldquo;{o.voice}&rdquo;
                </blockquote>
                <p className="mt-6 text-[16px] leading-[1.65] text-ink-500">
                  {o.rebuttal}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-24 rounded-2xl border border-warm-gray-100 bg-paper-cream p-8">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-warm-gray-500">
            Why this page exists
          </div>
          <p className="mt-3 max-w-3xl text-[15px] leading-[1.65] text-ink-500">
            I&rsquo;d rather lose a deal in 2 minutes on this page than 2 weeks into a project where we shouldn&rsquo;t have signed. Every objection above is real &mdash; pulled from a 5-persona audit of the site itself. If yours isn&rsquo;t here and you want to surface it, the intro call is 15 minutes, free, no pressure.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/#book" className="btn-ember">
              Book a 15-min intro call
            </Link>
            <Link href="/capabilities" className="btn-ghost">
              See full scope
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
