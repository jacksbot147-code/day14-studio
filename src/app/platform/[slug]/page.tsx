import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Nav } from "@/components/cinematic/Nav";
import { CanvasField } from "@/components/cinematic/CanvasField";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Reveal } from "@/components/cinematic/Reveal";
import { CAPABILITIES } from "@/components/cinematic/Capabilities";
import {
  CAPABILITY_DETAILS,
  getCapabilityDetail,
} from "@/components/cinematic/capabilityDetail";

/**
 * /platform/[slug] — in-depth detail page for one platform capability.
 *
 * One template, eight pages, driven by CAPABILITY_DETAILS (content) +
 * CAPABILITIES (icon/title), so the homepage grid, the card links, and these
 * pages all share one source of truth. Statically generated; per-page SEO
 * metadata. Wrapped in `.cinematic` with the shared nav, backdrop, and footer.
 */

const HOME = "/preview/cinematic";

export function generateStaticParams() {
  return CAPABILITY_DETAILS.map((d) => ({ slug: d.id }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const d = getCapabilityDetail(params.slug);
  if (!d) return {};
  return {
    title: d.metaTitle,
    description: d.metaDescription,
    alternates: { canonical: `/platform/${d.id}` },
    openGraph: {
      title: d.metaTitle,
      description: d.metaDescription,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: d.metaTitle,
      description: d.metaDescription,
    },
  };
}

function iconFor(id: string) {
  return CAPABILITIES.find((c) => c.id === id)?.Icon;
}
function titleFor(id: string) {
  return CAPABILITIES.find((c) => c.id === id)?.title ?? id;
}

export default function PlatformCapabilityPage({
  params,
}: {
  params: { slug: string };
}) {
  const d = getCapabilityDetail(params.slug);
  if (!d) notFound();

  const Icon = iconFor(d.id);

  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase={HOME} />

      <main className="cin-detail">
        <Reveal as="nav" className="cin-detail-crumb" aria-label="Breadcrumb">
          <a href={`${HOME}#capabilities`}>← The platform</a>
        </Reveal>

        <header className="cin-detail-hero">
          {Icon ? (
            <span className="cin-detail-icon">
              <Icon />
            </span>
          ) : null}
          <Reveal as="div" className="cin-kicker">
            {d.eyebrow}
          </Reveal>
          <Reveal as="h1" delayStep={1} className="cin-detail-h1">
            {d.headline}
          </Reveal>
          <Reveal as="p" delayStep={2} className="cin-detail-lede">
            {d.lede}
          </Reveal>
          <Reveal as="div" delayStep={3} className="cin-hcta cin-detail-cta">
            <a
              href="https://cal.com/day14/intro"
              className="cin-btn cin-btn-solid"
              data-cta="book_platform_detail"
            >
              Book a 15-min look
            </a>
            <a href={`${HOME}#pricing`} className="cin-btn">
              See pricing
            </a>
          </Reveal>
        </header>

        <section className="cin-detail-block">
          <Reveal as="h2" className="cin-detail-h2">
            {d.problem.heading}
          </Reveal>
          <Reveal as="p" delayStep={1} className="cin-detail-body">
            {d.problem.body}
          </Reveal>
          <ul className="cin-detail-pain" role="list">
            {d.problem.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>

        <section className="cin-detail-block">
          <Reveal as="h2" className="cin-detail-h2">
            How it works
          </Reveal>
          <ol className="cin-detail-steps" role="list">
            {d.how.map((s, i) => (
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
          <Reveal as="h2" className="cin-detail-h2">
            What&apos;s included
          </Reveal>
          <ul className="cin-detail-features" role="list">
            {d.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>

        <section className="cin-detail-block">
          <Reveal as="h2" className="cin-detail-h2">
            How it looks in your business
          </Reveal>
          <div className="cin-detail-cases">
            {d.useCases.map((u) => (
              <Reveal key={u.vertical} className="cin-detail-case">
                <div className="cin-detail-case-v">{u.vertical}</div>
                <p>{u.example}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="cin-detail-block">
          <Reveal as="h2" className="cin-detail-h2">
            Questions
          </Reveal>
          <div className="cin-detail-faqs">
            {d.faqs.map((f) => (
              <details key={f.q} className="cin-detail-faq">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="cin-detail-block cin-detail-outcome">
          <Reveal as="p">{d.outcome}</Reveal>
        </section>

        {d.related.length > 0 ? (
          <section className="cin-detail-block">
            <Reveal as="h2" className="cin-detail-h2">
              Works with
            </Reveal>
            <div className="cin-detail-related">
              {d.related.map((rid) => {
                const RIcon = iconFor(rid);
                return (
                  <a
                    key={rid}
                    href={`/platform/${rid}`}
                    className="cin-detail-rel"
                  >
                    {RIcon ? (
                      <span className="cin-detail-rel-icon">
                        <RIcon />
                      </span>
                    ) : null}
                    <span>{titleFor(rid)}</span>
                    <span className="cin-detail-rel-arrow" aria-hidden="true">
                      →
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="cin-detail-block cin-detail-final">
          <Reveal as="h2" className="cin-detail-h2">
            See the whole system run.
          </Reveal>
          <Reveal as="p" delayStep={1} className="cin-detail-body">
            Fifteen minutes, screen-share, the real platform — no slide deck.
          </Reveal>
          <Reveal as="div" delayStep={2} className="cin-hcta">
            <a
              href="https://cal.com/day14/intro"
              className="cin-btn cin-btn-solid"
              data-cta="book_platform_final"
            >
              Book 15 minutes
            </a>
            <a href="mailto:hello@day14.us" className="cin-btn">
              hello@day14.us
            </a>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
