import { brandTheme as t } from "./theme";
import Link from "next/link";
import { fetchLatestBlogPosts } from "@/lib/brand-data";
import { getHotFlashProducts } from "./printify";
import { BrandCtaLink } from "@/components/brand/cta-link";

export const revalidate = 300;

export default async function Page() {
  const products = await getHotFlashProducts();
  const posts = await fetchLatestBlogPosts("hot-flash-co", 3);
  const featured = products.slice(0, 3);

  return (
    <main>
      <section style={{ padding: "120px 32px 80px", textAlign: "center", maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontFamily: t.fonts.heading, fontSize: 56, letterSpacing: "-0.03em", lineHeight: 1.05, color: t.colors.primary }}>Hot Flash Co</h1>
        <p style={{ fontSize: 18, color: t.colors.secondary, marginTop: 16, maxWidth: 600, marginInline: "auto" }}>Print-on-demand humor for perimenopause and menopause — the smartest funny aunt at the table, making women feel seen, not pitied.</p>
        <BrandCtaLink theme={t} href={`/brands/hot-flash-co/products`}>Browse the shop →</BrandCtaLink>
      </section>

      {featured.length > 0 && (
        <section style={{ padding: "60px 32px", maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontFamily: t.fonts.heading, fontSize: 28, marginBottom: 24, letterSpacing: "-0.02em" }}>Featured</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
            {featured.map((p: any) => (
              <Link key={p.id} href={`/brands/hot-flash-co/products/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <article style={{ background: "white", border: `1px solid ${t.colors.accent}`, borderRadius: 12, overflow: "hidden" }}>
                  {p.images?.[0]?.src && <img src={p.images[0].src} alt={p.title} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} />}
                  <div style={{ padding: 20 }}>
                    <h3 style={{ fontSize: 15, fontFamily: t.fonts.heading, marginBottom: 8 }}>{p.title}</h3>
                    {p.minPrice != null && <div style={{ color: t.colors.secondary, fontSize: 14 }}>${(p.minPrice / 100).toFixed(2)}</div>}
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section style={{ padding: "60px 32px", maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ fontFamily: t.fonts.heading, fontSize: 28, marginBottom: 24, letterSpacing: "-0.02em" }}>From the blog</h2>
          {posts.map((post: any) => (
            <Link key={post.slug} href={`/brands/hot-flash-co/blog/${post.slug}`} style={{ display: "block", padding: "20px 0", borderBottom: `1px solid ${t.colors.accent}`, color: "inherit", textDecoration: "none" }}>
              <h3 style={{ fontFamily: t.fonts.heading, fontSize: 18, marginBottom: 4 }}>{post.title}</h3>
              <div style={{ color: t.colors.muted, fontSize: 13 }}>{post.date}</div>
            </Link>
          ))}
        </section>
      )}

      <section style={{ padding: "80px 32px", textAlign: "center", maxWidth: 600, margin: "0 auto" }}>
        <h2 style={{ fontFamily: t.fonts.heading, fontSize: 24, marginBottom: 12, letterSpacing: "-0.02em" }}>Get the newsletter</h2>
        <p style={{ color: t.colors.secondary, marginBottom: 24 }}>One email a week. No filler.</p>
        <form action={`/api/brands/hot-flash-co/subscribe`} method="POST" style={{ display: "flex", gap: 8, justifyContent: "center", maxWidth: 400, margin: "0 auto" }}>
          <input type="email" name="email" placeholder="you@email.com" required style={{ flex: 1, padding: "12px 14px", border: `1px solid ${t.colors.accent}`, borderRadius: 6, fontSize: 14 }} />
          <button type="submit" style={{ padding: "12px 20px", background: t.colors.primary, color: "white", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer" }}>Subscribe</button>
        </form>
      </section>
    </main>
  );
}
