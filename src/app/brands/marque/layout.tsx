import Link from "next/link";
import { brandTheme as t, MARQUE_URL } from "./theme";
import { BrandLayout } from "@/components/brand/BrandLayout";

const MARQUE_TITLE = "Marque — brand-grade short-form video ads";
const MARQUE_DESCRIPTION =
  "Brand-grade AI video ads from any link — a product, a service, or a trend — cut for TikTok, Reels & Shorts and scored before any media spend. A Day14 sister company.";

export const metadata = {
  title: {
    default: MARQUE_TITLE,
    template: "%s — Marque",
  },
  description: MARQUE_DESCRIPTION,
  openGraph: {
    title: "Marque",
    description: MARQUE_DESCRIPTION,
    type: "website",
    siteName: "Marque",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Marque",
    description: MARQUE_DESCRIPTION,
  },
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Marque",
  url: "https://day14.us/brands/marque",
  description: MARQUE_DESCRIPTION,
  inLanguage: "en-US",
};

export default function MarqueLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandLayout
      theme={t}
      fontsHref="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Space+Grotesk:wght@400;500;600&display=swap"
      jsonLd={[siteJsonLd]}
      home={{
        href: "/brands/marque",
        label: "Marque",
        style: {
          color: t.colors.primary,
          fontSize: 21,
          fontWeight: 700,
          fontFamily: t.fonts.heading,
          textDecoration: "none",
          letterSpacing: "-0.01em",
        },
      }}
      links={[
        { href: "/brands", label: "All Day14 brands" },
        {
          href: MARQUE_URL,
          label: "Visit Marque →",
          style: {
            background: t.colors.primary,
            color: "#fff",
            padding: "9px 16px",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
          },
        },
      ]}
      linksRowStyle={{ display: "flex", gap: 22, fontSize: 14, alignItems: "center", flexWrap: "wrap" }}
      navStyle={{
        padding: "18px 32px",
        flexWrap: "wrap",
        gap: 12,
        background: t.colors.surface,
      }}
      footerStyle={{ fontSize: 13, background: t.colors.surface }}
      footer={
        <>
          <div style={{ fontFamily: t.fonts.heading, fontWeight: 600, color: t.colors.primary }}>
            Marque
          </div>
          <div style={{ marginTop: 6 }}>Brand-grade short-form video ads · products, services & trends</div>
          <div style={{ marginTop: 6 }}>
            <Link href="/brands" style={{ color: t.colors.secondary }}>
              See every Day14 brand
            </Link>
          </div>
          <div style={{ marginTop: 10, fontSize: 11 }}>Part of the Day14 family.</div>
        </>
      }
    >
      {children}
    </BrandLayout>
  );
}
