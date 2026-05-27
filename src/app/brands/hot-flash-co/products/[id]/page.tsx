import { brandTheme as t } from "../../theme";
import { fetchProduct } from "@/lib/brand-data";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await fetchProduct("hot-flash-co", id);
  if (!p) return { title: "Not found" };
  const description = (p.description || "").slice(0, 160);
  const url = `/brands/hot-flash-co/products/${id}`;
  const image = p.images?.[0]?.src;
  return {
    title: p.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: p.title,
      description,
      type: "website",
      url,
      siteName: "Hot Flash Co",
      locale: "en_US",
      images: image ? [image] : [],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: p.title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await fetchProduct("hot-flash-co", id);
  if (!p) notFound();
  const minPrice = p.minPrice ?? 0;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60 }}>
      {p.images?.[0]?.src && <img src={p.images[0].src} alt={p.title} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 12, background: "white" }} />}
      <div>
        <h1 style={{ fontFamily: t.fonts.heading, fontSize: 32, letterSpacing: "-0.02em", marginBottom: 12 }}>{p.title}</h1>
        <div style={{ color: t.colors.secondary, fontSize: 20, marginBottom: 24 }}>${(minPrice / 100).toFixed(2)}</div>
        <div style={{ whiteSpace: "pre-line", color: t.colors.text, lineHeight: 1.7, fontSize: 15 }}>{p.description}</div>
        <a href={`https://printify.com/app/products/${p.id}`} style={{ display: "inline-block", marginTop: 32, padding: "14px 28px", background: t.colors.primary, color: "white", borderRadius: 8, textDecoration: "none", fontSize: 15, fontWeight: 500 }}>Buy on Printify →</a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org/",
          "@type": "Product",
          name: p.title,
          description: p.description,
          image: p.images?.[0]?.src ? [p.images[0].src] : [],
          brand: { "@type": "Brand", name: t.displayName },
          offers: { "@type": "Offer", price: (minPrice / 100).toFixed(2), priceCurrency: "USD", availability: "https://schema.org/InStock" },
        })}} />
      </div>
    </main>
  );
}
