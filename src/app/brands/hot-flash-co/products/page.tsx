import { brandTheme as t } from "../theme";
import Link from "next/link";
import { fetchTenantProducts } from "@/lib/brand-data";

export const metadata = { title: "Shop" };

export default async function ProductsPage() {
  const products = await fetchTenantProducts("hot-flash-co");
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 32px" }}>
      <h1 style={{ fontFamily: t.fonts.heading, fontSize: 40, letterSpacing: "-0.02em", marginBottom: 8 }}>Shop</h1>
      <p style={{ color: t.colors.secondary, marginBottom: 40 }}>{products.length} products</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 24 }}>
        {products.map((p: any) => (
          <Link key={p.id} href={`/brands/hot-flash-co/products/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <article style={{ background: "white", border: `1px solid ${t.colors.accent}`, borderRadius: 12, overflow: "hidden" }}>
              {p.images?.[0]?.src && <img src={p.images[0].src} alt={p.title} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} />}
              <div style={{ padding: 16 }}>
                <h3 style={{ fontSize: 14, fontFamily: t.fonts.heading, marginBottom: 6 }}>{p.title}</h3>
                {p.minPrice != null && <div style={{ color: t.colors.secondary, fontSize: 13 }}>${(p.minPrice / 100).toFixed(2)}</div>}
              </div>
            </article>
          </Link>
        ))}
      </div>
    </main>
  );
}
