import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * /thanks — confirmation landing page for Stripe Payment Links.
 *
 * Each of the three deposit Payment Links (Site / Portal / Platform)
 * redirects here after a successful deposit. The page acknowledges
 * receipt, tells the customer what happens next, and links to the
 * intake form so they can fill it in immediately (rather than waiting
 * for an email).
 *
 * Optional query params (Stripe appends these on redirect; we render
 * them gracefully if present, defensive if absent):
 *   ?sku=site|portal|platform   — which SKU they bought
 *   ?session_id=cs_test_...     — Stripe Checkout Session id
 */

export const metadata: Metadata = {
  title: "Thanks — your Day14 build kicks off now",
  description: `Deposit confirmed. Next step: fill out the intake form so ${SITE.brand} can ship the preview URL within 24 hours.`,
  robots: { index: false, follow: false }, // never index a thank-you page
};

type Sku = "site" | "portal" | "platform";

function knownSku(value: string | undefined): value is Sku {
  return value === "site" || value === "portal" || value === "platform";
}

const SKU_LABEL: Record<Sku, string> = {
  site: "Site",
  portal: "Portal",
  platform: "Platform",
};

const SKU_TIMELINE: Record<Sku, string> = {
  site: "7 days",
  portal: "14 days",
  platform: "21 days",
};

export default function ThanksPage({
  searchParams,
}: {
  searchParams?: { sku?: string; session_id?: string };
}) {
  const skuParam = searchParams?.sku;
  const sku: Sku | undefined = knownSku(skuParam) ? skuParam : undefined;
  const skuLabel = sku ? SKU_LABEL[sku] : "Day14";
  const timeline = sku ? SKU_TIMELINE[sku] : "14 days";

  return (
    <>
      <SiteHeader />
      <main>
        <section className="container-page pt-20 pb-16">
          <div className="font-mono text-xs uppercase tracking-[0.18em] text-shipped-600">
            ● Deposit confirmed
          </div>

          <h1 className="mt-5 max-w-3xl text-[44px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[64px]">
            Build starts now.
          </h1>

          <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
            Thanks for the deposit. Your {skuLabel} tier build kicks off
            today — preview URL in your inbox within 24 hours, live by day{" "}
            <span className="tnum">{timeline.replace(/[^0-9]/g, "")}</span> or
            your deposit refunds in full.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <Step
              n={1}
              title="Fill out the intake form"
              body="One page, ~25 min. Business name, services, pricing, brand colors, logo, 5 photos. That's the whole input."
              cta="Open intake form"
              href={sku ? `/intake?sku=${sku}` : "/intake"}
            />
            <Step
              n={2}
              title="Check your inbox tomorrow"
              body={`Preview URL on a *.vercel.app subdomain by EOD tomorrow. You can watch the build progress on a public build-log.`}
              cta="See an example build-log"
              href="/builds/splash-jacks-pools"
            />
            <Step
              n={3}
              title="Daily updates, no meetings"
              body="One-paragraph operator update every weekday. Reply with feedback any time. We launch on day 14 or your deposit refunds."
              cta="About the build process"
              href="/about"
            />
          </div>

          <div className="mt-14 rounded-lg border border-ink-100 bg-paper-50 p-6 text-sm text-ink-500 sm:p-8">
            <div className="eyebrow mb-3">Questions before you sit down with the intake form?</div>
            <p className="text-ink-700">
              Email{" "}
              <a className="font-semibold underline" href={`mailto:${SITE.email}`}>
                {SITE.email}
              </a>{" "}
              or book a follow-up call at{" "}
              <a className="font-semibold underline" href={SITE.bookingUrl}>
                {SITE.bookingUrl.replace(/^https?:\/\//, "")}
              </a>
              .
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/" className="btn-ghost">
              ← Back to homepage
            </Link>
            <Link href="/about" className="btn-ghost">
              About the operator
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Step({
  n,
  title,
  body,
  cta,
  href,
}: {
  n: number;
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="card">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs uppercase tracking-widest text-ember-600 tnum">
          {String(n).padStart(2, "0")}
        </span>
        <h2 className="text-lg font-bold tracking-tightest text-ink">{title}</h2>
      </div>
      <p className="mt-3 text-sm text-ink-500">{body}</p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-ember-600"
      >
        {cta} →
      </Link>
    </div>
  );
}
