import Link from "next/link";
import { brandTheme as t } from "../theme";
import { blogPosts, formatPostDate } from "../blog-posts";

export const metadata = {
  title: "Blog",
  description:
    "Practical lawn care and landscaping advice for Southwest Florida homeowners — rainy-season mowing, the summer fertilizer rules, hurricane-season yard prep, and more.",
  alternates: { canonical: "/brands/kennum-lawn-care/blog" },
  openGraph: {
    title: "Kennum Lawn Care Blog",
    description:
      "Practical lawn care and landscaping advice for Southwest Florida homeowners.",
    type: "website",
    url: "/brands/kennum-lawn-care/blog",
    siteName: "Kennum Lawn Care",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Kennum Lawn Care Blog",
    description:
      "Practical lawn care and landscaping advice for Southwest Florida homeowners.",
  },
};

export default function KennumBlogIndex() {
  const posts = [...blogPosts].sort((a, b) => (a.date < b.date ? 1 : -1));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Kennum Lawn Care Blog",
    description:
      "Practical lawn care and landscaping advice for Southwest Florida homeowners.",
    url: "https://day14.us/brands/kennum-lawn-care/blog",
    publisher: { "@type": "Organization", name: "Kennum Lawn Care" },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.description,
      datePublished: p.date,
      url: `https://day14.us/brands/kennum-lawn-care/blog/${p.slug}`,
    })),
  };

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "70px 32px" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1
        style={{
          fontFamily: t.fonts.heading,
          fontSize: 40,
          letterSpacing: "-0.02em",
          color: t.colors.primary,
          margin: 0,
        }}
      >
        The Kennum Lawn Care blog
      </h1>
      <p
        style={{
          color: t.colors.muted,
          marginTop: 12,
          marginBottom: 36,
          lineHeight: 1.6,
          fontSize: 16,
        }}
      >
        Straight, practical advice for keeping a Southwest Florida yard healthy —
        written for homeowners, not for search engines.
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/brands/kennum-lawn-care/blog/${p.slug}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <article
              style={{
                background: t.colors.surface,
                border: `1px solid ${t.colors.accent}`,
                borderRadius: 14,
                padding: 24,
              }}
            >
              <div
                style={{
                  color: t.colors.secondary,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {formatPostDate(p.date)} · {p.readingMinutes} min read
              </div>
              <h2
                style={{
                  fontFamily: t.fonts.heading,
                  fontSize: 21,
                  margin: "8px 0 8px",
                  color: t.colors.primary,
                  lineHeight: 1.25,
                }}
              >
                {p.title}
              </h2>
              <p
                style={{
                  color: t.colors.muted,
                  fontSize: 15,
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {p.excerpt}
              </p>
              <div
                style={{
                  marginTop: 14,
                  color: t.colors.primary,
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Read the post &rarr;
              </div>
            </article>
          </Link>
        ))}
      </div>

      <div
        style={{
          marginTop: 36,
          padding: 28,
          background: t.colors.accent,
          borderRadius: 14,
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontFamily: t.fonts.heading,
            fontSize: 20,
            margin: "0 0 8px",
            color: t.colors.primary,
          }}
        >
          Rather just hand off the yard?
        </h2>
        <p style={{ color: t.colors.muted, margin: "0 0 18px", lineHeight: 1.6 }}>
          Tell us about your property and we&apos;ll send a free, custom quote.
        </p>
        <Link
          href="/brands/kennum-lawn-care/contact"
          style={{
            background: t.colors.primary,
            color: "#fff",
            padding: "13px 26px",
            borderRadius: 10,
            textDecoration: "none",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Get a free quote
        </Link>
      </div>
    </main>
  );
}
