import type { Metadata } from "next";
import Link from "next/link";

import { SITE } from "@/lib/site";
import { loadInsights, formatInsightDate, insightPath } from "@/lib/insights";
import { CinematicPage } from "@/components/cinematic/CinematicPage";
import { Reveal } from "@/components/cinematic/Reveal";

/**
 * /insights — the weekly AI update, in the cinematic skin.
 *
 * Same shape as /changelog (its closest sibling): reads a manifest out of
 * public/data/, renders through the shared <CinematicPage> shell + `.cin-prose`
 * long-form styles, exports metadata with canonical + openGraph + twitter.
 * Content lives in public/data/insights/ — see src/lib/insights.ts.
 *
 * Positioning: plain-English AI updates for people running pool, lawn, pest,
 * and trades businesses. Not developer news. No prices appear here.
 */

const TITLE = "Insights";
const HEADLINE = "AI, translated for local service businesses";
const DESCRIPTION =
  "A weekly plain-English read on what's actually changing in AI search and AI tools — written for people running pool, lawn, pest, and trades businesses. No hype, no jargon, no vendor talking points.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/insights" },
  openGraph: {
    title: `${HEADLINE} — ${SITE.brand}`,
    description: DESCRIPTION,
    url: `https://${SITE.domain}/insights`,
    siteName: SITE.brand,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${HEADLINE} — ${SITE.brand}`,
    description: DESCRIPTION,
  },
};

export default async function InsightsPage() {
  const posts = await loadInsights();
  const base = `https://${SITE.domain}`;

  // Blog + ItemList so answer engines can see the series as a series, not a
  // pile of loose pages. Per-article Article schema lives on the detail route.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${base}/insights#blog`,
    name: `${SITE.brand} Insights`,
    headline: HEADLINE,
    description: DESCRIPTION,
    url: `${base}/insights`,
    inLanguage: "en-US",
    publisher: { "@id": `${base}/#organization` },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.summary,
      datePublished: p.date,
      url: `${base}${insightPath(p.slug)}`,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${base}${insightPath(p.slug)}`,
      },
    })),
  };

  return (
    <CinematicPage
      hero={{
        eyebrow: "Insights",
        title: HEADLINE,
        lede: "Every week, one plain-English read on what changed in AI search and AI tools — and what it actually means for a business that answers the phone and drives to jobs. Written for owners, not developers.",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Reveal as="div" className="cin-prose">
        <p className="cin-prose-kicker">
          {posts.length === 1 ? "1 post" : `${posts.length} posts`} · updated
          weekly · no hype, no jargon, no vendor talking points
        </p>

        {posts.length === 0 ? (
          <p>
            The first post goes up shortly. Check back, or{" "}
            <Link href="/newsletter">get it by email</Link>.
          </p>
        ) : (
          posts.map((post) => (
            <section key={post.slug}>
              <h2>
                <Link href={insightPath(post.slug)}>{post.title}</Link>
              </h2>
              <p className="cin-prose-kicker">
                {formatInsightDate(post.date)} · {post.readingMinutes} min read
                {post.tags.length > 0 ? ` · ${post.tags.join(" · ")}` : ""}
              </p>
              <p>{post.summary}</p>
              <p>
                <Link href={insightPath(post.slug)}>Read it →</Link>
              </p>
            </section>
          ))
        )}

        <hr />

        <p className="cin-prose-kicker">Why this exists</p>
        <p>
          Day14 sells AI visibility, AI lead capture, and AI advertising to
          local service businesses. The fastest way to be wrong about any of it
          is to repeat what a vendor said. So every week the research gets done
          in the open here — what changed, what the evidence actually shows, and
          what is being oversold. If something doesn&rsquo;t work, that gets
          published too.
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 28 }}>
          <a
            className="cin-btn cin-btn-solid"
            href={SITE.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Book a 15-min intro call
          </a>
          <Link className="cin-btn" href="/geo">
            See how GEO works
          </Link>
        </div>
      </Reveal>
    </CinematicPage>
  );
}
