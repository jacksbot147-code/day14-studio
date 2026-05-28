import Link from "next/link";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "The Day14 Stack — how a one-operator studio ships in 14 days",
  description:
    "Inside the Day14 OS: 20+ AI agents running customer operations, content production, financial reporting, and self-improvement. Same stack we sell to customers.",
  openGraph: {
    title: "The Day14 Stack",
    description: "How a one-operator studio ships in 14 days.",
  },
};

const AGENTS = [
  { name: "CFO", role: "Daily P&L, cash flow, pricing recommendations." },
  { name: "Head of Product", role: "Sales-driven roadmap, kill list, cross-pollination." },
  { name: "Customer Success", role: "Post-purchase drafts, NPS, win-back." },
  { name: "Compliance Officer", role: "Legal and brand-safety review of every output." },
  { name: "Performance Analyst", role: "Weekly cohort, week-over-week growth, attribution." },
  { name: "VP Sales", role: "Outbound drafts per archetype." },
  { name: "PR Director", role: "Brand-mention monitoring, podcast pitches." },
  { name: "Brand Steward", role: "Voice consistency across every piece of content." },
  { name: "DevOps / SRE", role: "Uptime, daemon health, security audits." },
  { name: "Investor Relations", role: "Monthly investor-style update with wins and asks." },
];

const ENGINES = [
  {
    name: "Opportunity scanner",
    desc: "Continuous Gemini-grounded scan for underserved niches, scored 0–100.",
  },
  {
    name: "Idea pitcher",
    desc: "When an opportunity scores 75 or higher, auto-drafts a full launch pitch with a 30-day MVP plan.",
  },
  {
    name: "Business bootstrap",
    desc: "One command spins up a new business of any archetype: constitution, identity, competitor research, products, LaunchAgents, brand site.",
  },
  {
    name: "Product factory",
    desc: "Daily design generation, Printify upload, draft creation.",
  },
  {
    name: "Content pipeline",
    desc: "TikTok script → AI video → six platform variants → cross-poster → publishers across IG, TikTok, YouTube, LinkedIn, Pinterest, Threads, X.",
  },
  {
    name: "Recursive expansion",
    desc: "When you describe a need, the system auto-drafts a SKILL.md and an implementation stub. Approve to ship it into the registry.",
  },
];

const PROOF = [
  {
    href: "/case-studies/hot-flash-co",
    title: "Hot Flash Co",
    desc: "Autonomous POD store, perimenopause humor niche.",
  },
  {
    href: "/case-studies/splash-jacks-pools",
    title: "Splash Jacks Pools",
    desc: "Service-business platform, customer #0.",
  },
  {
    href: "/brands/hot-flash-co",
    title: "Open Hot Flash Co",
    desc: "Live storefront, Printify-fulfilled.",
  },
];

export default function StackPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-page py-20 sm:py-28">
        <section className="mb-24 max-w-3xl">
          <span className="eyebrow eyebrow-rule mb-4">The Stack</span>
          <h1 className="mb-5">
            The stack we ship to clients is the one{" "}
            <span className="marker">we run ourselves</span>.
          </h1>
          <p className="text-lg leading-relaxed text-ink-500 sm:text-xl">
            Day14 is a one-operator studio. We ship real products in 14 days because{" "}
            <strong className="font-semibold text-ink">20+ AI agents</strong> handle
            everything that is not judgment: marketing, sales, customer success, financial
            reporting, compliance, devops. We sell you the same stack.
          </p>
        </section>

        <section className="mb-24">
          <div className="mb-10 max-w-2xl">
            <span className="eyebrow mb-3">The C-suite, hired</span>
            <h2 className="mb-3">Ten roles a real company would hire for.</h2>
            <p className="text-base leading-relaxed text-ink-500">
              Each one runs on schedule, writes reports, and pings Telegram when
              something needs your attention.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden border border-ink-100 bg-ink-100 sm:grid-cols-2 lg:grid-cols-5">
            {AGENTS.map((a) => (
              <div
                key={a.name}
                className="group relative bg-paper-50 p-5 transition-colors duration-150 hover:bg-paper-100"
              >
                <span className="absolute left-0 top-0 h-px w-0 bg-ember-500 transition-[width] duration-200 ease-out group-hover:w-full" />
                <h3 className="mb-1.5 text-base font-bold leading-snug tracking-tighter">
                  {a.name}
                </h3>
                <p className="text-sm leading-relaxed text-ink-500">{a.role}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-24">
          <div className="mb-10 max-w-2xl">
            <span className="eyebrow mb-3">Autonomous loops</span>
            <h2 className="mb-3">Six engines that run between approvals.</h2>
            <p className="text-base leading-relaxed text-ink-500">
              The system finds opportunities, drafts pitches, builds businesses, ships
              content, and improves itself.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ENGINES.map((e) => (
              <div key={e.name} className="card-pop">
                <h3 className="mb-2 text-lg font-bold leading-snug tracking-tighter">
                  {e.name}
                </h3>
                <p className="text-sm leading-relaxed text-ink-500">{e.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-24 border border-ink-100 bg-paper-50 p-8 sm:p-12">
          <div className="mb-8 max-w-2xl">
            <span className="eyebrow mb-3">Live proof</span>
            <h2 className="mb-3">The stack runs our own businesses too.</h2>
            <p className="text-base leading-relaxed text-ink-500">
              Hot Flash Co is a perimenopause-humor POD store we built as a stress-test.
              Full autopilot, idea to first product in under a day.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden border border-ink-100 bg-ink-100 sm:grid-cols-3">
            {PROOF.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="group block bg-paper p-5 transition-colors duration-150 hover:bg-paper-100"
              >
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
                  {p.title}
                  <span className="text-ember-500 transition-transform duration-150 group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
                <div className="text-xs leading-relaxed text-ink-500">{p.desc}</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-ink-100 pt-16">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow mb-3">Run it in your business</span>
            <h2 className="mb-4">The Platform SKU includes the agent stack.</h2>
            <p className="mb-8 text-base leading-relaxed text-ink-500">
              Tuned to your operations, deployed on your domain, owned by you.
            </p>
            <div className="mb-12 flex flex-wrap justify-center gap-3">
              <Link href="/#sku" className="btn-primary">
                See pricing
              </Link>
              <a href="https://cal.com/day14/intro" className="btn-ghost">
                Book intro call
              </a>
            </div>
            <div className="mx-auto max-w-md border-t border-ink-100 pt-8">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-ink-400">
                Or get the weekly build log
              </p>
              <NewsletterSignup source="stack-page" buttonText="Subscribe →" />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
