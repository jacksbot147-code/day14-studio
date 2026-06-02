import { brandTheme as t } from "../../theme";
import { fetchBlogPost } from "@/lib/brand-data";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchBlogPost("hot-flash-co", slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title,
    description: post.meta_description,
    openGraph: { title: post.title, description: post.meta_description, type: "article" },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchBlogPost("hot-flash-co", slug);
  if (!post) notFound();
  return (
    <article style={{ maxWidth: 720, margin: "0 auto", padding: "60px 32px" }}>
      <h1 style={{ fontFamily: t.fonts.heading, fontSize: 36, letterSpacing: "-0.02em", marginBottom: 8, lineHeight: 1.15 }}>{post.title}</h1>
      <div style={{ color: t.colors.muted, fontSize: 13, marginBottom: 40 }}>{post.date}</div>
      <div style={{ fontSize: 17, lineHeight: 1.7, color: t.colors.text }} dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  );
}
