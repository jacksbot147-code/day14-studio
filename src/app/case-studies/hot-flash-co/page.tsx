import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const CASE = {
  name: "Hot Flash Co",
  industry: "Print-on-demand · perimenopause humor",
  audience: "Ages 45–60",
  sku: "Internal",
  timeline: "Idea to live store in under a day",
  url: "/brands/hot-flash-co",
} as const;

export const metadata: Metadata = {
  title: `${CASE.name} — case study`,
  description:
    "We built and launched a perimenopause-humor print-on-demand store in under a day using Day14 OS. 10 products live, daily engines running, full content + marketing autopilot.",
  openGraph: {
    title: `${CASE.name} — Day14 case study`,
    description: "POD store from idea to live store in under a day.",
  },
};

export default function CaseStudyPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Header />
        <Stats />
        <AgentWork />
        <Autopilot />
        <Lesson />
        <Newsletter />
      </main>
      <SiteFooter />
    </>
  );
}

function Header() {
  return (
    <section className="container-page pt-14 pb-12 sm:pt-20">
      <Link
        href="/"
        className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-ink-400 transition hover:text-ink"
      >
        ← All case studies
      </Link>

      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs uppercase tracking-[0.18em] text-ink-400">
        <span className="text-ember-600">{CASE.sku}</span>
        <span className="h-1 w-1 rounded-full bg-ink-200" />
        <span>{CASE.industry}</span>
        <span className="h-1 w-1 rounded-full bg-ink-200" />
        <span>{CASE.audience}</span>
      </div>

      <h1 className="mt-5 max-w-4xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px]">
        Idea to live store in under a day.
      </h1>

      <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
        We needed to stress-test the Day14 autonomous stack on a real business
        that wasn&rsquo;t a client. So we picked a niche we know is underserved
        &mdash; perimenopause humor, ages 45&ndash;60 &mdash; and let the agents
        do the rest. Ten products, designed, written, and listed end-to-end with
        zero manual work.
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        <Link href={CASE.url} className="btn-primary">
          Open the storefront →
        </Link>
        <Link href="/stack" className="btn-ember">
          See the stack
        </Link>
      </div>
    </section>
  );
}

function Stats() {
  const stats: Array<{ label: string; value: string }> = [
    { label: "Time to first product live", value: "< 24h" },
    { label: "Products at launch", value: "10" },
    { label: "Manual design work", value: "0 min" },
    { label: "Manual copy work", value: "0 min" },
  ];

  return (
    <section className="container-page py-12">
      <div className="rule mb-12" />
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-ink-100 bg-paper-50 p-5"
          >
            <dt className="font-mono text-xs uppercase tracking-widest text-ink-400">
              {s.label}
            </dt>
            <dd className="mt-2 text-2xl font-extrabold tracking-tightest text-ink tnum">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function AgentWork() {
  const steps: Array<{ title: string; body: string }> = [
    {
      title: "Niche research",
      body: "opportunity-scanner found the gap, scored it 87/100, auto-pitched it.",
    },
    {
      title: "Brand identity",
      body: "voice rules, palette (muted purple / sand / charcoal), Helvetica + serif pair, banned-phrase list.",
    },
    {
      title: "Competitor map",
      body: "8 real competitors with pricing, positioning, and the gap between them.",
    },
    {
      title: "Constitution",
      body: "an 11-section operating doc every agent reads before touching the tenant.",
    },
    {
      title: "10 product concepts",
      body: "drafted quotes + visual directions, all matching the voice.",
    },
    {
      title: "10 images",
      body: "Flux generated each at 1024×1024 sized to the mug print area.",
    },
    {
      title: "10 Printify products",
      body: "uploaded, attached to the 11oz mug blueprint, staged as drafts pending publish.",
    },
    {
      title: "Daily engines wired",
      body: "content calendar, TikTok scripts, Pinterest pins, blog posts, newsletter, and video creator, all running on schedule.",
    },
  ];

  return (
    <section className="container-page py-20">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow mb-4 justify-center">What the agents did</div>
        <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
          Eight steps, no human in the loop.
        </h2>
      </div>

      <ol className="mx-auto mt-14 max-w-3xl space-y-2">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="grid items-start gap-4 rounded border border-ink-100 bg-paper-50 p-4 sm:grid-cols-[44px_1fr]"
          >
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-ember-600 tnum">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="text-sm text-ink-700">
              <span className="font-bold text-ink">{s.title}</span> &mdash;{" "}
              {s.body}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Autopilot() {
  const jobs: Array<{ time: string; what: string }> = [
    { time: "6am daily", what: "Trend scan" },
    { time: "5:30am daily", what: "Hashtag research" },
    { time: "9am daily", what: "Product draft" },
    { time: "Tue/Thu 9am", what: "Blog post" },
    { time: "Wed 8am", what: "Newsletter issue" },
    { time: "M/W/F 11am", what: "TikTok scripts" },
    { time: "M/W/F 11:30am", what: "AI video creation" },
    { time: "M/W/F 12pm", what: "Video variant render" },
    { time: "Daily 10am", what: "Pinterest pins" },
    { time: "Daily 11am", what: "Marketing drafts" },
    { time: "Daily 1pm", what: "Social queue assembly" },
    { time: "Every 30–60 min", what: "Auto-publishers" },
  ];

  return (
    <section className="border-y border-ink-100 bg-paper-50/60 py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow mb-4 justify-center">
            What&rsquo;s running now
          </div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            Twelve scheduled engines, all on autopilot.
          </h2>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => (
            <div
              key={`${j.time}-${j.what}`}
              className="rounded-lg border border-ink-100 bg-paper p-4"
            >
              <div className="font-mono text-xs uppercase tracking-widest text-ink-400 tnum">
                {j.time}
              </div>
              <div className="mt-1.5 text-sm font-semibold text-ink">
                {j.what}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Lesson() {
  return (
    <section className="container-page py-20">
      <div className="rule mb-12" />
      <div className="grid gap-12 md:grid-cols-[1fr_1.3fr]">
        <div>
          <div className="eyebrow mb-4">The lesson for clients</div>
          <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
            The same agents that run our experiments run yours.
          </h2>
        </div>

        <div className="space-y-5 text-ink-500">
          <p>
            This wasn&rsquo;t a client build &mdash; it was an in-house
            experiment. The point: the agent stack is real, runs in production,
            and works on niches the operator (Jack) doesn&rsquo;t actively run.
          </p>
          <p>
            When we build you a Platform-tier project, we don&rsquo;t ship a
            back office and walk away. Your CFO agent files daily P&amp;Ls. Your
            VP Sales drafts outbound. Your Brand Steward catches voice drift.
            Your Compliance Officer flags risk. You tap approve.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={CASE.url} className="btn-primary">
              Open the storefront →
            </Link>
            <a href={SITE.bookingUrl} className="btn-ember">
              Get one built like this
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Newsletter() {
  return (
    <section className="container-page pb-24">
      <div className="card">
        <h3 className="text-xl font-bold tracking-tightest text-ink">
          Get the weekly Day14 build log
        </h3>
        <p className="mt-2 text-sm text-ink-500">
          One email a week. What we shipped, what broke, exact numbers from
          internal builds like this one.
        </p>
        <div className="mt-5">
          <NewsletterSignup source="case-study-hot-flash-co" />
        </div>
      </div>
    </section>
  );
}
