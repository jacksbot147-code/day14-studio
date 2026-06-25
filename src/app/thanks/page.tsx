import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { CanvasField } from "@/components/cinematic/CanvasField";
import { Nav } from "@/components/cinematic/Nav";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";

/**
 * /thanks — confirmation landing page for Stripe Payment Links.
 *
 * Each of the three deposit Payment Links (Site / Portal / Platform)
 * redirects here after a successful deposit. The page acknowledges
 * receipt, tells the customer what happens next, and links to the
 * intake form so they can fill it in immediately (rather than waiting
 * for an email).
 *
 * Re-themed onto the cinematic shell (block 9/10) so the chrome matches every
 * other route. The "what happens next" steps reuse the .cin-detail-steps
 * pattern from /platform/[slug].
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

const STEPS: Array<{ title: string; body: string; cta: string; href: (sku?: Sku) => string }> = [
  {
    title: "Fill out the intake form",
    body: "One page, ~25 min. Business name, services, pricing, brand colors, logo, 5 photos. That's the whole input.",
    cta: "Open intake form",
    href: (sku) => (sku ? `/intake?sku=${sku}` : "/intake"),
  },
  {
    title: "Check your inbox tomorrow",
    body: "Preview URL on a *.vercel.app subdomain by EOD tomorrow. You can watch the build progress on a public build-log.",
    cta: "See an example build-log",
    href: () => "/builds/splash-jacks-pools",
  },
  {
    title: "Daily updates, no meetings",
    body: "One-paragraph operator update every weekday. Reply with feedback any time. We launch on day 14 or your deposit refunds.",
    cta: "About the build process",
    href: () => "/about",
  },
];

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
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/" />

      <main className="cin-detail">
        <header className="cin-detail-hero">
          <Reveal as="div" className="cin-kicker">
            ● Deposit confirmed
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-detail-h1">
            Build starts now.
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-detail-lede">
            Thanks for the deposit. Your {skuLabel} tier build kicks off today —
            preview URL in your inbox within 24 hours, live by day{" "}
            {timeline.replace(/[^0-9]/g, "")} or your deposit refunds in full.
          </Reveal>
        </header>

        <section className="cin-detail-block">
          <Reveal as="h2" className="cin-detail-h2">
            What happens next
          </Reveal>
          <ol className="cin-detail-steps" role="list">
            {STEPS.map((s, i) => (
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
                  <a href={s.href(sku)} className="cin-cap-link">
                    {s.cta} →
                  </a>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>

        <section className="cin-detail-block">
          <Reveal as="div" className="cin-kicker">
            Questions before you sit down with the intake form?
          </Reveal>
          <Reveal as="p" delayStep={1} className="cin-detail-body">
            Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or book a
            follow-up call at{" "}
            <a href={SITE.bookingUrl}>
              {SITE.bookingUrl.replace(/^https?:\/\//, "")}
            </a>
            .
          </Reveal>
          <Reveal as="div" delayStep={2} className="cin-hcta">
            <a href="/" className="cin-btn">
              ← Back to homepage
            </a>
            <a href="/about" className="cin-btn">
              About the operator
            </a>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
