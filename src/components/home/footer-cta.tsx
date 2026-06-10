import Link from "next/link";
import { SITE } from "@/lib/site";
import { DecryptText } from "@/components/landing/decrypt-text";
import { PathCrumb } from "@/components/landing/path-crumb";

/* -------------------------------------------------------------------------- */
/* Footer CTA — legacy 14-day SKU link preserved                               */
/* -------------------------------------------------------------------------- */

export function FooterCta() {
  // SECONDARY OFFER — demoted. The build studio is the primary product on
  // this page; the OS-tenant-subscription play (former SaaS pitch) lives
  // here as a smaller "or, the other thing" option. Same cream surface so
  // it feels like a continuation, not a separate sales pitch.
  return (
    <section id="waitlist" className="bg-paper-cream py-24 sm:py-32 border-t border-warm-gray-100">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex justify-center">
            <PathCrumb path="os-tenant" />
          </div>
          <div className="eyebrow mb-5 justify-center text-warm-gray-400">
            <DecryptText text="Or: run on Day14 OS yourself" durationMs={550} triggerOnView />
          </div>
          <h2 className="text-[32px] font-extrabold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[40px] lg:text-[44px]">
            <DecryptText
              text="Don't need me to build it? Host on the OS for $299/mo."
              durationMs={900}
              startAt={250}
              triggerOnView
            />
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[16px] leading-[1.6] text-warm-gray-500">
            If you&rsquo;ve already got the site and just want what makes Day14 fast &mdash; multi-tenant admin, scheduled agents, evidence-verified work-log, the inbox &mdash; the OS-only tenant tier opens later this summer. Joining the waitlist locks founder pricing.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4">
            <a
              href={`mailto:${SITE.email}?subject=Day14%20OS%20tenant%20waitlist`}
              className="inline-flex items-center justify-center rounded-full border border-ink/15 bg-paper-cream px-5 py-2.5 text-sm font-semibold text-ink transition-colors duration-150 hover:border-ember-500 hover:text-ember-600"
            >
              Join the OS tenant waitlist →
            </a>
            <Link
              href="/work-with-us"
              className="text-[13px] font-semibold text-warm-gray-400 underline decoration-warm-gray-200 underline-offset-4 transition-colors duration-150 hover:text-ink hover:decoration-ember-500"
            >
              See the full pricing breakdown
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
