import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Press kit — Day14",
  description:
    "Press kit for Day14: a one-operator AI-leveraged build studio. Logos, founder bio, recent shipped projects, contact for press inquiries.",
};

const STATS = [
  { stat: "1", label: "Operator" },
  { stat: "20+", label: "AI agents in production" },
  { stat: "14 days", label: "Average ship time" },
  { stat: "$2.5k–$10k", label: "Fixed-price SKUs" },
  { stat: "Florida", label: "Headquarters" },
  { stat: "2026", label: "Founded" },
];

const PROJECTS = [
  {
    href: "/case-studies/splash-jacks-pools",
    label: "Splash Jacks Pools",
    desc: "Service-business platform, full Stripe billing, AI chatbot, operator admin app. Live.",
  },
  {
    href: "/case-studies/casamore",
    label: "Casamoré Events",
    desc: "Brand-heavy events site, 18 pages, 19 blog essays, full visual identity. Live.",
  },
  {
    href: "/case-studies/buildbridge",
    label: "Buildbridge",
    desc: "Two-sided marketplace with Stripe milestone escrow, native iOS/Android wrappers. Preview.",
  },
  {
    href: "/case-studies/hot-flash-co",
    label: "Hot Flash Co",
    desc: "Autonomous POD store, internal stress-test of the agent stack. Live.",
  },
];

export default function PressPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-page py-20 sm:py-28">
        <section className="mb-16 max-w-3xl">
          <span className="eyebrow eyebrow-rule mb-4">Press kit</span>
          <h1 className="mb-5">
            A one-operator productized build studio,{" "}
            <span className="marker">shipping real platforms in 14 days</span>.
          </h1>
          <p className="text-lg leading-relaxed text-ink-500 sm:text-xl">
            Day14 is based in Southwest Florida and uses AI agents as the work force.
          </p>
        </section>

        <section className="mb-20 grid grid-cols-1 gap-12 lg:grid-cols-[200px_1fr]">
          <span className="eyebrow lg:pt-2">One-liner</span>
          <p className="border-l-2 border-ember-300 pl-6 text-lg leading-relaxed text-ink sm:text-xl">
            A one-operator build studio shipping real business platforms in 14 days,
            productized at $2,500–$10,000, using its own AI agent stack to do it.
          </p>
        </section>

        <section className="mb-20 grid grid-cols-1 gap-12 lg:grid-cols-[200px_1fr]">
          <span className="eyebrow lg:pt-2">Why it matters</span>
          <div className="space-y-4 text-base leading-relaxed text-ink-500">
            <p>
              The agency model is broken: project managers, designers, frontend, backend,
              QA, account managers, 6-month timelines, $50k minimums. Day14 ships the same
              output with one operator and a fleet of AI agents, in two weeks, at a fixed
              price, with the customer owning the code.
            </p>
            <p>
              Day14 runs its own businesses on the same stack as proof: a
              perimenopause-humor POD store (Hot Flash Co), a service-business platform
              (Splash Jacks Pools), a marketplace (Buildbridge), and a brand-heavy events
              site (Casamoré).
            </p>
          </div>
        </section>

        <section className="mb-20 grid grid-cols-1 gap-12 lg:grid-cols-[200px_1fr]">
          <span className="eyebrow lg:pt-2">Founder bio</span>
          <p className="border-l-2 border-ink-200 pl-6 text-base italic leading-relaxed text-ink-500">
            Jack Boppington is the founder and operator of Day14. Based in Southwest
            Florida, he is the only human on the team. Day14's twenty-plus AI agents
            handle the rest: sales drafts, customer success, financial reporting, content
            production, compliance review, devops. Before Day14 he ran service businesses
            directly. The playbook is now productized.
          </p>
        </section>

        <section className="mb-20">
          <div className="mb-8 max-w-2xl">
            <span className="eyebrow mb-3">Stats, live</span>
            <h2 className="mb-3">The shape of Day14, today.</h2>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden border border-ink-100 bg-ink-100 sm:grid-cols-3 lg:grid-cols-6">
            {STATS.map((s) => (
              <div key={s.label} className="bg-paper-50 p-5">
                <div className="tnum text-2xl font-extrabold leading-none tracking-tightest text-ink">
                  {s.stat}
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.16em] text-ink-400">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-20">
          <div className="mb-8 max-w-2xl">
            <span className="eyebrow mb-3">Recent projects</span>
            <h2 className="mb-3">What we have shipped.</h2>
          </div>
          <ul className="divide-y divide-ink-100 border-y border-ink-100">
            {PROJECTS.map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  className="group flex flex-col gap-1 px-2 py-4 transition-colors duration-150 hover:bg-paper-50 sm:flex-row sm:items-baseline sm:gap-6"
                >
                  <span className="text-sm font-semibold text-ink group-hover:text-ember-600 sm:w-56 sm:shrink-0">
                    {p.label}
                    <span className="ml-1 inline-block text-ember-500 transition-transform duration-150 group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                  <span className="text-sm leading-relaxed text-ink-500">{p.desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-20 grid grid-cols-1 gap-12 lg:grid-cols-[200px_1fr]">
          <span className="eyebrow lg:pt-2">Brand assets</span>
          <p className="text-base leading-relaxed text-ink-500">
            Logo SVG, founder photo, and screenshots available on request. Email{" "}
            <a
              href="mailto:hello@day14.us"
              className="font-semibold text-ink underline decoration-ember-300 underline-offset-4 transition-colors hover:decoration-ember-500"
            >
              hello@day14.us
            </a>{" "}
            with your outlet and we will send a Dropbox link within a day.
          </p>
        </section>

        <section className="border border-ink-100 bg-paper-50 p-8 sm:p-12">
          <div className="max-w-2xl">
            <span className="eyebrow mb-3">Press contact</span>
            <h2 className="mb-4">Jack Boppington, Founder</h2>
            <p className="mb-2 text-base text-ink-500">
              <a
                href="mailto:hello@day14.us"
                className="font-semibold text-ink underline decoration-ember-300 underline-offset-4 transition-colors hover:decoration-ember-500"
              >
                hello@day14.us
              </a>
            </p>
            <p className="text-sm leading-relaxed text-ink-500">
              Generally available for podcast appearances, written interviews, and panel
              talks on AI-leveraged productized services. Replies within 24 hours.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
