import Link from "next/link";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Free tools — Day14",
  description:
    "Free tools and templates from Day14. The stack we use to ship in 14 days, available for anyone to study or steal.",
};

const TOOLS = [
  {
    title: "Day14 Pricing Calculator",
    desc: "Plug in your SaaS subscriptions (Jobber, Housecall Pro, Squarespace, GoHighLevel). We calculate the 3-year cost vs Day14 and tell you when the break-even is.",
    href: "/tools/pricing-calculator",
    status: "coming",
  },
  {
    title: "14-Day Build Plan Template",
    desc: "The exact playbook we use to ship a Portal-tier project. Notion template, checklists, and the order form we send customers.",
    href: "/tools/build-plan",
    status: "coming",
  },
  {
    title: "Niche Validator",
    desc: "Type a business idea. We Gemini-search for current competitors, market-size signals, and winning angles. Same engine we use internally.",
    href: "/tools/niche-validator",
    status: "coming",
  },
  {
    title: "Stack Auditor",
    desc: "Paste your current website URL. We inspect your stack (analytics, hosting, ESP, CRM, payments) and tell you what is costing 3× what it should.",
    href: "/tools/stack-audit",
    status: "coming",
  },
];

const ALREADY_PUBLIC = [
  { href: "/api/feed.xml", label: "Live RSS feed", desc: "Every commit and agent action on the Day14 empire, in real time." },
  { href: "/builds", label: "Public build logs", desc: "Every customer build is public from day one." },
  { href: "/stack", label: "The Day14 stack", desc: "Full breakdown of the 20+ agents we run." },
  { href: "/case-studies/hot-flash-co", label: "Hot Flash Co case study", desc: "How we used the stack to build an autonomous POD store in under a day." },
];

export default function ToolsPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-page py-20 sm:py-28">
        <section className="mb-16 max-w-3xl">
          <span className="eyebrow eyebrow-rule mb-4">Free tools</span>
          <h1 className="mb-5">
            Internal tools from the Day14 stack,{" "}
            <span className="marker">open to anyone</span>.
          </h1>
          <p className="text-lg leading-relaxed text-ink-500 sm:text-xl">
            Most of these power our customer builds. If they save us hours, they will save
            you hours too.
          </p>
        </section>

        <section className="mb-20 grid grid-cols-1 gap-4 md:grid-cols-2">
          {TOOLS.map((t) => (
            <div key={t.title} className="card-pop relative">
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold leading-snug tracking-tighter">
                  {t.title}
                </h3>
                {t.status === "coming" ? (
                  <span className="badge whitespace-nowrap">Coming soon</span>
                ) : null}
              </div>
              <p className="mb-4 text-sm leading-relaxed text-ink-500">{t.desc}</p>
              {t.status !== "coming" ? (
                <Link
                  href={t.href}
                  className="text-sm font-semibold text-ember-600 hover:text-ember-700"
                >
                  Open tool →
                </Link>
              ) : null}
            </div>
          ))}
        </section>

        <section className="mb-20 border border-ink-100 bg-paper-50 p-8 sm:p-12">
          <div className="max-w-2xl">
            <span className="eyebrow mb-3">Get notified</span>
            <h2 className="mb-3">Email me when each one ships.</h2>
            <p className="mb-6 text-base leading-relaxed text-ink-500">
              Subscribe to the build log and I will send a note when each tool goes live
              (along with everything else we are shipping).
            </p>
            <div className="max-w-md">
              <NewsletterSignup source="tools-page" buttonText="Notify me" />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-8 max-w-2xl">
            <span className="eyebrow mb-3">Already public</span>
            <h2 className="mb-3">Open right now.</h2>
          </div>
          <ul className="divide-y divide-ink-100 border-y border-ink-100">
            {ALREADY_PUBLIC.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="group flex flex-col gap-1 px-2 py-4 transition-colors duration-150 hover:bg-paper-50 sm:flex-row sm:items-baseline sm:gap-6"
                >
                  <span className="text-sm font-semibold text-ink group-hover:text-ember-600 sm:w-56 sm:shrink-0">
                    {l.label}
                    <span className="ml-1 text-ember-500 transition-transform duration-150 group-hover:translate-x-0.5 inline-block">
                      →
                    </span>
                  </span>
                  <span className="text-sm leading-relaxed text-ink-500">{l.desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
