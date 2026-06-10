import Link from "next/link";
import { brandTheme as t } from "./theme";
import { BrandLayout } from "@/components/brand/BrandLayout";

const KENNUM_TITLE = "Kennum Lawn Care — Southwest Florida lawn care & landscaping";
const KENNUM_DESCRIPTION =
  "Weekly lawn maintenance and landscaping across Southwest Florida. Dependable crew, flat monthly pricing, free quotes.";
const KENNUM_OG_DESCRIPTION =
  "A Southwest Florida yard, handled — weekly maintenance and landscaping.";

export const metadata = {
  title: {
    default: KENNUM_TITLE,
    template: "%s — Kennum Lawn Care",
  },
  description: KENNUM_DESCRIPTION,
  openGraph: {
    title: "Kennum Lawn Care",
    description: KENNUM_OG_DESCRIPTION,
    type: "website",
    siteName: "Kennum Lawn Care",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Kennum Lawn Care",
    description: KENNUM_OG_DESCRIPTION,
  },
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Kennum Lawn Care",
  url: "https://day14.us/brands/kennum-lawn-care",
  description: KENNUM_DESCRIPTION,
  inLanguage: "en-US",
};

export default function KennumLayout({ children }: { children: React.ReactNode }) {
  const nav = [
    { href: "/brands/kennum-lawn-care", label: "Home" },
    { href: "/brands/kennum-lawn-care/services", label: "Services" },
    { href: "/brands/kennum-lawn-care/about", label: "About" },
    { href: "/brands/kennum-lawn-care/blog", label: "Blog" },
    { href: "/brands/kennum-lawn-care/contact", label: "Contact" },
  ];
  return (
    <BrandLayout
      theme={t}
      fontsHref="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
      jsonLd={[siteJsonLd]}
      home={{
        href: "/brands/kennum-lawn-care",
        label: "Kennum Lawn Care",
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
        ...nav.slice(1),
        {
          href: "/brands/kennum-lawn-care/contact",
          label: "Free quote",
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
            Kennum Lawn Care
          </div>
          <div style={{ marginTop: 6 }}>Lawn care & landscaping · Southwest Florida</div>
          <div style={{ marginTop: 6 }}>
            <Link href="/brands/kennum-lawn-care/contact" style={{ color: t.colors.secondary }}>
              Request a free quote
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
