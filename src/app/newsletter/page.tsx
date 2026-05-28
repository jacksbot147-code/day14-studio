import { NewsletterSignup } from "@/components/NewsletterSignup";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Newsletter — Day14",
  description:
    "One email a week from the founder of Day14. Build logs, lessons from running a one-operator studio with AI agents, customer wins. No filler.",
  openGraph: {
    title: "Day14 Newsletter",
    description: "Build logs from a one-operator AI studio.",
  },
};

const EXPECT = [
  {
    label: "Daily build logs",
    desc: "From active customer projects. Public commits, day-by-day progress.",
  },
  {
    label: "Stack teardowns",
    desc: "What we used, what we would swap, exact unit economics.",
  },
  {
    label: "Agent experiments",
    desc: "What the autonomous side of Day14 is actually doing this week.",
  },
  {
    label: "Niche reports",
    desc: "Markets we are scanning, opportunities we passed on, and why.",
  },
];

export default function NewsletterPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-page py-20 sm:py-28">
        <section className="mx-auto max-w-2xl">
          <span className="eyebrow eyebrow-rule mb-4">Newsletter</span>
          <h1 className="mb-5">
            The Day14 <span className="marker">build log</span>.
          </h1>
          <p className="mb-10 text-lg leading-relaxed text-ink-500 sm:text-xl">
            One email a week. What we shipped, what broke, what we would do differently,
            plus a running tally of every business we are building on the Day14 stack. No
            filler, no &ldquo;here is what is new at our company.&rdquo;
          </p>

          <div className="mb-12 border border-ink-100 bg-paper-50 p-6 sm:p-8">
            <span className="eyebrow mb-2">Subscribe</span>
            <h2 className="mb-4 text-xl">One email a week. That is it.</h2>
            <NewsletterSignup source="newsletter-page" buttonText="Subscribe →" />
            <p className="mt-4 text-xs text-ink-400">
              Unsubscribe anytime. We do not sell or share email addresses.
            </p>
          </div>

          <div className="mb-6">
            <span className="eyebrow mb-2">What you can expect</span>
            <h2 className="mb-6">Four things, every week.</h2>
          </div>
          <ul className="divide-y divide-ink-100 border-y border-ink-100">
            {EXPECT.map((e) => (
              <li
                key={e.label}
                className="flex flex-col gap-1 px-2 py-4 sm:flex-row sm:items-baseline sm:gap-6"
              >
                <span className="text-sm font-semibold text-ink sm:w-48 sm:shrink-0">
                  {e.label}
                </span>
                <span className="text-sm leading-relaxed text-ink-500">{e.desc}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
