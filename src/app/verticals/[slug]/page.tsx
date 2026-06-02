import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE, VERTICALS, SKUS, CASE_STUDIES } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/cn";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return VERTICALS.map((v) => ({ slug: v.slug }));
}

function findVertical(slug: string) {
  return VERTICALS.find((v) => v.slug === slug);
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const v = findVertical(params.slug);
  if (!v) return {};
  return {
    title: `${v.shortName} platforms`,
    description: `${v.name}. ${v.tagline}`,
  };
}

export default function VerticalPage({ params }: { params: Params }) {
  const v = findVertical(params.slug);
  if (!v) notFound();

  const exemplar = CASE_STUDIES.find((cs) => cs.slug === v.exemplarSlug);
  const matchingSkus = SKUS.filter((s) => v.recommendedSkus.includes(s.id));

  const accentText =
    v.accent === "ember"
      ? "text-ember-600"
      : v.accent === "shipped"
      ? "text-shipped-600"
      : "text-ink";

  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="container-page pt-14 pb-12 sm:pt-20">
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-ink-400 transition hover:text-ink"
          >
            ← All verticals
          </Link>

          <div className={cn("mt-8 font-mono text-xs uppercase tracking-[0.18em]", accentText)}>
            {v.shortName}
          </div>

          <h1 className="mt-3 max-w-4xl text-[40px] font-extrabold leading-[1.05] tracking-tightest text-ink sm:text-[60px]">
            {v.name}
          </h1>

          <p className="mt-7 max-w-2xl text-lg text-ink-500 sm:text-xl">
            {v.tagline}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <a href={SITE.bookingUrl} className="btn-ember">
              Book a 30-min intro call
            </a>
            {exemplar ? (
              <Link href={`/case-studies/${exemplar.slug}`} className="btn-ghost">
                See the {exemplar.name} case study →
              </Link>
            ) : null}
          </div>

          <div className="mt-12">
            <div className="eyebrow mb-3">Businesses we&rsquo;ve built for in this lane</div>
            <ul className="flex flex-wrap gap-2">
              {v.examples.map((ex) => (
                <li
                  key={ex}
                  className="rounded border border-ink-100 bg-paper-50 px-3 py-1 text-sm text-ink-700"
                >
                  {ex}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pain points → what we ship */}
        <section className="container-page py-16">
          <div className="rule mb-12" />
          <div className="grid gap-10 md:grid-cols-2">
            <div>
              <div className="eyebrow mb-4">What&rsquo;s broken today</div>
              <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
                You know the pattern.
              </h2>
              <ul className="mt-7 space-y-3 text-ink-700">
                {v.painPoints.map((p) => (
                  <li key={p} className="flex gap-3">
                    <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="eyebrow mb-4">What Day14 ships</div>
              <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
                Here&rsquo;s how it&rsquo;s fixed.
              </h2>
              <ul className="mt-7 space-y-3 text-ink-700">
                {v.features.map((f) => (
                  <li key={f} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-shipped-500"
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Matching SKUs */}
        <section className="border-y border-ink-100 bg-paper-50/60 py-20">
          <div className="container-page">
            <div className="mx-auto max-w-2xl text-center">
              <div className="eyebrow mb-4 justify-center">Recommended SKUs</div>
              <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
                The right shape, productized.
              </h2>
              <p className="mt-5 text-ink-500">
                For {v.shortName.toLowerCase()}, the natural fit is{" "}
                {matchingSkus.map((s, i) => (
                  <span key={s.id}>
                    <strong className="font-semibold text-ink">{s.name}</strong>
                    {i < matchingSkus.length - 2
                      ? ", "
                      : i === matchingSkus.length - 2
                      ? " or "
                      : ""}
                  </span>
                ))}
                . Pricing fixed; what&rsquo;s in each SKU is below.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-2">
              {matchingSkus.map((sku) => (
                <div key={sku.id} className="card">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-2xl font-extrabold tracking-tightest text-ink">
                      {sku.name}
                    </h3>
                    <div className="font-mono text-xs uppercase tracking-widest text-ink-400">
                      ships in {sku.shipsIn}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-ink-500">{sku.blurb}</p>

                  <div className="mt-6 flex items-baseline gap-1.5 tnum">
                    <span className="text-4xl font-extrabold tracking-tightest text-ink">
                      ${sku.oneTime.toLocaleString()}
                    </span>
                    <span className="text-sm font-medium text-ink-400">one-time</span>
                  </div>
                  <div className="mt-1 font-mono text-xs text-ink-400 tnum">
                    + ${sku.monthly}/mo hosting + maintenance
                  </div>

                  <a href={SITE.bookingUrl} className="btn-primary mt-6 w-full">
                    Book intro call
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Exemplar case study reference */}
        {exemplar ? (
          <section className="container-page py-20">
            <div className="mx-auto max-w-3xl text-center">
              <div className="eyebrow mb-4 justify-center">Closest case study</div>
              <h2 className="text-3xl font-extrabold tracking-tightest text-ink sm:text-4xl">
                The build that proves it.
              </h2>
              <p className="mt-5 text-ink-500">
                {exemplar.summary}
              </p>
              <div className="mt-7 inline-flex gap-3">
                <Link
                  href={`/case-studies/${exemplar.slug}`}
                  className="btn-primary"
                >
                  Read the {exemplar.name} case study →
                </Link>
                {exemplar.url ? (
                  <a
                    href={exemplar.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost"
                  >
                    Open the live build ↗
                  </a>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* Final CTA */}
        <section className="container-page pb-24">
          <div className="overflow-hidden rounded-xl bg-ink p-10 text-paper sm:p-14">
            <div className="grid items-center gap-8 md:grid-cols-[1.4fr_1fr]">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tightest sm:text-4xl">
                  Run a {v.shortName.toLowerCase()} business in {SITE.location}?
                </h2>
                <p className="mt-4 max-w-xl text-paper-200">
                  30-min intro call. Live demo. Fixed price. Signed order form
                  same day if it&rsquo;s a fit.
                </p>
              </div>
              <div>
                <a
                  href={SITE.bookingUrl}
                  className="btn-ember w-full justify-center text-base"
                >
                  Book a 30-min intro call
                </a>
                <Link
                  href="/"
                  className="mt-3 inline-flex w-full items-center justify-center rounded border border-paper-200/40 px-5 py-3 text-sm font-semibold text-paper transition hover:bg-paper/10"
                >
                  See all pricing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
