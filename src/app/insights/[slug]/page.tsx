import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SITE } from "@/lib/site";
import {
  loadInsights,
  getInsight,
  loadInsightBody,
  formatInsightDate,
  insightPath,
} from "@/lib/insights";
import { markdownToHtml } from "@/lib/markdown";
import { CinematicPage } from "@/components/cinematic/CinematicPage";
import { Reveal } from "@/components/cinematic/Reveal";

/**
 * /insights/[slug] — one article, in the cinematic skin.
 *
 * Params are generated from the manifest at build time (public/data/insights/
 * index.json) and the Markdown body is rendered server-side by
 * src/lib/markdown.ts — HTML-escaped first, fixed tag set, scheme-checked
 * links, so nothing in a content file can inject markup. The emitted tags map
 * onto `.cin-prose`, so articles inherit the cinematic long-form styling.
 *
 * The Article JSON-LD below is the point of the whole surface: it is what
 * lets answer engines attribute a quote to Day14 by name. Keep headline,
 * datePublished, author, publisher, and mainEntityOfPage accurate.
 *
 * No prices appear here; article bodies must not quote prices either —
 * link to /pricing instead.
 */

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const posts = await loadInsights();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const post = await getInsight(params.slug);
  if (!post) return { title: "Post not found" };

  const url = `https://${SITE.domain}${insightPath(post.slug)}`;
  return {
    title: post.title,
    description: post.summary,
    keywords: post.tags,
    alternates: { canonical: insightPath(post.slug) },
    openGraph: {
      title: `${post.title} — ${SITE.brand}`,
      description: post.summary,
      url,
      siteName: SITE.brand,
      type: "article",
      locale: "en_US",
      publishedTime: post.date,
      modifiedTime: post.date,
      tags: [...post.tags],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} — ${SITE.brand}`,
      description: post.summary,
    },
  };
}

export default async function InsightPost({ params }: { params: Params }) {
  const post = await getInsight(params.slug);
  if (!post) notFound();

  const body = await loadInsightBody(post);
  const html = body ? markdownToHtml(body) : null;

  const base = `https://${SITE.domain}`;
  const url = `${base}${insightPath(post.slug)}`;
  const organization = {
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: SITE.brand,
    url: base,
    logo: `${base}/icon`,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: "en-US",
    isAccessibleForFree: true,
    articleSection: "AI search",
    keywords: post.tags.join(", "),
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: organization,
    publisher: organization,
    isPartOf: { "@type": "Blog", "@id": `${base}/insights#blog` },
  };

  return (
    <CinematicPage
      hero={{
        eyebrow: `Insights · ${formatInsightDate(post.date)} · ${post.readingMinutes} min read`,
        title: post.title,
        lede: post.summary,
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Reveal as="div" className="cin-prose">
        <p className="cin-prose-kicker">
          <Link href="/insights">← All insights</Link>
        </p>

        {html ? (
          <article dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p>
            This article isn&rsquo;t available right now.{" "}
            <Link href="/insights">Back to all insights</Link>.
          </p>
        )}

        <hr />

        {post.tags.length > 0 ? (
          <p className="cin-prose-kicker">{post.tags.join(" · ")}</p>
        ) : null}

        <p>
          Day14 builds websites, AI search visibility, AI lead capture, and AI
          advertising for local service businesses in {SITE.location}. If you
          want this run on your business instead of read about, that&rsquo;s the{" "}
          <Link href="/geo">GEO</Link> service.
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
          <Link className="cin-btn" href="/insights">
            More insights
          </Link>
        </div>
      </Reveal>
    </CinematicPage>
  );
}
