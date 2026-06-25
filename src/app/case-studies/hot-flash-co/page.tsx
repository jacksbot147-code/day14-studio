import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";

/**
 * /case-studies/hot-flash-co — the internal stress-test case study, re-themed.
 *
 * Re-skinned onto the cinematic shell (block 9/10) so it matches its already-
 * cinematic siblings (alignmd, splash-jacks-pools, buildbridge, casamore) — it
 * was the last case study still on the old light theme. Content is preserved
 * verbatim, including the honesty rail: Hot Flash Co was an in-house experiment,
 * NOT a paying customer, and must never be presented as one.
 */

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
  alternates: { canonical: "/case-studies/hot-flash-co" },
  openGraph: {
    title: `${CASE.name} — Day14 case study`,
    description: "POD store from idea to live store in under a day.",
  },
};

const STATS: Array<{ label: string; value: string }> = [
  { label: "Time to first product live", value: "< 24h" },
  { label: "Products at launch", value: "10" },
  { label: "Manual design work", value: "0 min" },
  { label: "Manual copy work", value: "0 min" },
];

const AGENT_STEPS: Array<{ title: string; body: string }> = [
  { title: "Niche research", body: "opportunity-scanner found the gap, scored it 87/100, auto-pitched it." },
  { title: "Brand identity", body: "voice rules, palette (muted purple / sand / charcoal), Helvetica + serif pair, banned-phrase list." },
  { title: "Competitor map", body: "8 real competitors with pricing, positioning, and the gap between them." },
  { title: "Constitution", body: "an 11-section operating doc every agent reads before touching the tenant." },
  { title: "10 product concepts", body: "drafted quotes + visual directions, all matching the voice." },
  { title: "10 images", body: "Flux generated each at 1024×1024 sized to the mug print area." },
  { title: "10 Printify products", body: "uploaded, attached to the 11oz mug blueprint, staged as drafts pending publish." },
  { title: "Daily engines wired", body: "content calendar, TikTok scripts, Pinterest pins, blog posts, newsletter, and video creator, all running on schedule." },
];

const AUTOPILOT: Array<{ time: string; what: string }> = [
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

export default function CaseStudyPage() {
  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/" />

      <main className="cin-detail">
        <Reveal as="nav" className="cin-detail-crumb" aria-label="Breadcrumb">
          <a href="/#work">← All case studies</a>
        </Reveal>

        <header className="cin-detail-hero">
          <Reveal as="div" className="cin-kicker">
            {CASE.sku} · {CASE.industry} · {CASE.audience}
          </Reveal>

          {/* Honesty rail: internal stress-test, now parked. NOT a paying customer. */}
          <Reveal as="p" delayStep={1} className="cin-detail-body">
            <strong>Parked · internal experiment</strong> — Hot Flash Co was an
            in-house stress-test of the autonomous stack, not a client engagement
            and not a paying customer. It&rsquo;s archived here as a build
            artifact. The live, paying proof lives in{" "}
            <a href="/case-studies/splash-jacks-pools">Splash Jacks Pools</a> and{" "}
            <a href="/case-studies/alignmd">AlignMD</a>.
          </Reveal>

          <Reveal as="h1" delayStep={2} className="cin-detail-h1">
            Idea to live store in under a day.
          </Reveal>
          <Reveal as="p" delayStep={3} className="cin-detail-lede">
            We needed to stress-test the Day14 autonomous stack on a real business
            that wasn&rsquo;t a client. So we picked a niche we know is
            underserved &mdash; perimenopause humor, ages 45&ndash;60 &mdash; and
            let the agents do the rest. Ten products, designed, written, and
            listed end-to-end with zero manual work.
          </Reveal>
          <Reveal as="div" delayStep={3} className="cin-hcta cin-detail-cta">
            <a href={CASE.url} className="cin-btn cin-btn-solid" data-cta="store_hfc_hero">
              Open the storefront →
            </a>
            <a href="/stack" className="cin-btn" data-cta="stack_hfc_hero">
              See the stack
            </a>
          </Reveal>
        </header>

        <section className="cin-detail-block">
          <div className="cin-stats">
            {STATS.map((s) => (
              <Reveal key={s.label} className="cin-stat">
                <div className="cin-stat-v">{s.value}</div>
                <div className="cin-stat-l">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="cin-detail-block">
          <Reveal as="div" className="cin-kicker">
            What the agents did
          </Reveal>
          <Reveal as="h2" delayStep={1} className="cin-detail-h2">
            Eight steps, no human in the loop.
          </Reveal>
          <ol className="cin-detail-steps" role="list">
            {AGENT_STEPS.map((s, i) => (
              <Reveal
                as="li"
                key={s.title}
                delayStep={Math.min(i, 3) as 0 | 1 | 2 | 3}
              >
                <span className="cin-detail-step-n">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>

        <section className="cin-detail-block">
          <Reveal as="div" className="cin-kicker">
            What&rsquo;s running now
          </Reveal>
          <Reveal as="h2" delayStep={1} className="cin-detail-h2">
            Twelve scheduled engines, all on autopilot.
          </Reveal>
          <div className="cin-detail-cases">
            {AUTOPILOT.map((j) => (
              <Reveal key={`${j.time}-${j.what}`} className="cin-detail-case">
                <div className="cin-detail-case-v">{j.time}</div>
                <p>{j.what}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="cin-detail-block">
          <Reveal as="div" className="cin-kicker">
            The lesson for clients
          </Reveal>
          <Reveal as="h2" delayStep={1} className="cin-detail-h2">
            The same agents that run our experiments run yours.
          </Reveal>
          <Reveal as="div" delayStep={2} className="cin-prose">
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
          </Reveal>
          <Reveal as="div" delayStep={3} className="cin-hcta">
            <a href={CASE.url} className="cin-btn cin-btn-solid" data-cta="store_hfc_lesson">
              Open the storefront →
            </a>
            <a
              href={SITE.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="cin-btn"
              data-cta="book_hfc_lesson"
            >
              Get one built like this
            </a>
          </Reveal>
        </section>

        <section className="cin-detail-block">
          <Reveal as="h2" className="cin-detail-h2">
            Get the weekly Day14 build log
          </Reveal>
          <Reveal as="p" delayStep={1} className="cin-detail-body">
            One email a week. What we shipped, what broke, exact numbers from
            internal builds like this one.
          </Reveal>
          <Reveal as="div" delayStep={2}>
            <NewsletterSignup source="case-study-hot-flash-co" />
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
