import { brandTheme as t } from "../theme";
import Link from "next/link";
import { fetchBlogPosts } from "@/lib/brand-data";

const READING_DESCRIPTION =
  "Reading from Hot Flash Co — field notes for the seasons no one warns you about.";

export const metadata = {
  title: "Reading",
  description: READING_DESCRIPTION,
  alternates: { canonical: "/brands/hot-flash-co/blog" },
  openGraph: {
    title: "Reading — Hot Flash Co",
    description: READING_DESCRIPTION,
    type: "website",
    url: "/brands/hot-flash-co/blog",
    siteName: "Hot Flash Co",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Reading — Hot Flash Co",
    description: READING_DESCRIPTION,
  },
};

export default async function BlogPage() {
  const posts = await fetchBlogPosts("hot-flash-co");
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "60px 32px" }}>
      <h1 style={{ fontFamily: t.fonts.heading, fontSize: 40, letterSpacing: "-0.02em", marginBottom: 8 }}>Reading</h1>
      <p style={{ color: t.colors.secondary, marginBottom: 40 }}>{posts.length} posts</p>
      <div>
        {posts.map((post: any) => (
          <Link key={post.slug} href={`/brands/hot-flash-co/blog/${post.slug}`} style={{ display: "block", padding: "24px 0", borderBottom: `1px solid ${t.colors.accent}`, textDecoration: "none", color: "inherit" }}>
            <h2 style={{ fontFamily: t.fonts.heading, fontSize: 22, marginBottom: 6 }}>{post.title}</h2>
            <p style={{ color: t.colors.secondary, fontSize: 14, marginBottom: 4 }}>{post.meta_description}</p>
            <div style={{ color: t.colors.muted, fontSize: 12 }}>{post.date} · {post.word_count} words</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
