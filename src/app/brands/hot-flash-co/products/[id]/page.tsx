import { brandTheme as t } from "../../theme";
import { getHotFlashProduct } from "../../printify";
import { notFound } from "next/navigation";
import { BrandMain } from "@/components/brand/section";
import { BrandCtaLink } from "@/components/brand/cta-link";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getHotFlashProduct(id);
  if (!p) return { title: "Not found" };
  return {
    title: p.title,
    description: (p.description || "").slice(0, 160),
    openGraph: {
      title: p.title,
      description: (p.description || "").slice(0, 160),
      images: p.images?.[0]?.src ? [p.images[0].src] : [],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getHotFlashProduct(id);
  if (!p) notFound();
  const minPrice = p.minPrice ?? 0;

  return (
    <BrandMain maxWidth={1100} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60 }}>
      {p.images?.[0]?.src && <img src={p.images[0].src} alt={p.title} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 12, background: "white" }} />}
      <div>
        <h1 style={{ fontFamily: t.fonts.heading, fontSize: 32, letterSpacing: "-0.02em", marginBottom: 12 }}>{p.title}</h1>
        <div style={{ color: t.colors.secondary, fontSize: 20, marginBottom: 24 }}>${(minPrice / 100).toFixed(2)}</div>
        <div style={{ whiteSpace: "pre-line", color: t.colors.text, lineHeight: 1.7, fontSize: 15 }}>{p.description}</div>
        <BrandCtaLink theme={t} href={`https://printify.com/app/products/${p.id}`}>Buy on Printify →</BrandCtaLink>
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
    </BrandMain>
  );
}
