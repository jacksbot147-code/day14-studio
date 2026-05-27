import { brandTheme as t } from "../../theme";
import { fetchBlogPost } from "@/lib/brand-data";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchBlogPost("hot-flash-co", slug);
  if (!post) return { title: "Not found" };
  const url = `/brands/hot-flash-co/blog/${slug}`;
  return {
    title: post.title,
    description: post.meta_description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.meta_description,
      type: "article",
      url,
      siteName: "Hot Flash Co",
      locale: "en_US",
      publishedTime: post.date,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: post.title,
      description: post.meta_description,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchBlogPost("hot-flash-co", slug);
  if (!post) notFound();
  const url = `https://day14.us/brands/hot-flash-co/blog/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.meta_description,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: "en-US",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    author: { "@type": "Organization", name: "Hot Flash Co" },
    publisher: { "@type": "Organization", name: "Hot Flash Co" },
  };
  return (
    <article style={{ maxWidth: 720, margin: "0 auto", padding: "60px 32px" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 style={{ fontFamily: t.fonts.heading, fontSize: 36, letterSpacing: "-0.02em", marginBottom: 8, lineHeight: 1.15 }}>{post.title}</h1>
      <div style={{ color: t.colors.muted, fontSize: 13, marginBottom: 40 }}>{post.date}</div>
      <div style={{ fontSize: 17, lineHeight: 1.7, color: t.colors.text }} dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  );
}
