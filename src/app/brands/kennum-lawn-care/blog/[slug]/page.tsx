import Link from "next/link";
import { notFound } from "next/navigation";
import { brandTheme as t } from "../../theme";
import { blogPosts, getPost, formatPostDate } from "../../blog-posts";

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Post not found" };
  const url = `/brands/kennum-lawn-care/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url,
      siteName: "Kennum Lawn Care",
      locale: "en_US",
      publishedTime: post.date,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: post.title,
      description: post.description,
    },
  };
}

export default async function KennumBlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const url = `https://day14.us/brands/kennum-lawn-care/blog/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: "en-US",
    articleSection: "Lawn care",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    author: { "@type": "Organization", name: "Kennum Lawn Care" },
    publisher: {
      "@type": "Organization",
      name: "Kennum Lawn Care",
      areaServed: "Southwest Florida",
    },
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "70px 32px" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/brands/kennum-lawn-care/blog"
        style={{ color: t.colors.secondary, fontSize: 14, fontWeight: 600, textDecoration: "none" }}
      >
        &larr; All posts
      </Link>

      <div
        style={{
          color: t.colors.secondary,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          marginTop: 22,
        }}
      >
        {formatPostDate(post.date)} · {post.readingMinutes} min read
      </div>
      <h1
        style={{
          fontFamily: t.fonts.heading,
          fontSize: 38,
          letterSpacing: "-0.02em",
          color: t.colors.primary,
          lineHeight: 1.18,
          margin: "8px 0 0",
        }}
      >
        {post.title}
      </h1>

      <article style={{ marginTop: 28 }}>
        {post.body.map((block, i) => {
          if (block.type === "h2") {
            return (
              <h2
                key={i}
                style={{
                  fontFamily: t.fonts.heading,
                  fontSize: 22,
                  letterSpacing: "-0.01em",
                  color: t.colors.primary,
                  margin: "34px 0 0",
                }}
              >
                {block.text}
              </h2>
            );
          }
          if (block.type === "ul") {
            return (
              <ul
                key={i}
                style={{
                  margin: "14px 0 0",
                  paddingLeft: 22,
                  color: t.colors.text,
                  fontSize: 16,
                  lineHeight: 1.7,
                }}
              >
                {block.items.map((item, j) => (
                  <li key={j} style={{ marginTop: j === 0 ? 0 : 8 }}>
                    {item}
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p
              key={i}
              style={{
                color: t.colors.text,
                fontSize: 16,
                lineHeight: 1.75,
                margin: "16px 0 0",
              }}
            >
              {block.text}
            </p>
          );
        })}
      </article>

      <div
        style={{
          marginTop: 36,
          padding: 24,
          background: t.colors.accent,
          borderRadius: 14,
          borderLeft: `4px solid ${t.colors.primary}`,
        }}
      >
        <div
          style={{
            fontFamily: t.fonts.heading,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: t.colors.secondary,
            marginBottom: 8,
          }}
        >
          The takeaway
        </div>
        <p style={{ color: t.colors.text, fontSize: 16, lineHeight: 1.7, margin: 0 }}>
          {post.takeaway}
        </p>
      </div>

      <div
        style={{
          marginTop: 36,
          padding: 28,
          background: t.colors.surface,
          border: `1px solid ${t.colors.accent}`,
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
          Want it handled for you?
        </h2>
        <p style={{ color: t.colors.muted, margin: "0 0 18px", lineHeight: 1.6 }}>
          Kennum Lawn Care keeps Southwest Florida yards healthy year-round — on a
          dependable weekly route, at one flat monthly price.
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
