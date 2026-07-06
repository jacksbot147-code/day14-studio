import Link from "next/link";
import { brandTheme as t, ADFORGE_URL } from "./theme";
import { BrandLayout } from "@/components/brand/BrandLayout";

const ADFORGE_TITLE = "AdForge — scored short-form video ads";
const ADFORGE_DESCRIPTION =
  "AI-generated TikTok, Reels & Shorts ads for products and local businesses — every ad ranked by predicted virality before any media spend. A Day14 sister company.";

export const metadata = {
  title: {
    default: ADFORGE_TITLE,
    template: "%s — AdForge",
  },
  description: ADFORGE_DESCRIPTION,
  openGraph: {
    title: "AdForge",
    description: ADFORGE_DESCRIPTION,
    type: "website",
    siteName: "AdForge",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "AdForge",
    description: ADFORGE_DESCRIPTION,
  },
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "AdForge",
  url: "https://day14.us/brands/adforge",
  description: ADFORGE_DESCRIPTION,
  inLanguage: "en-US",
};

export default function AdForgeLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandLayout
      theme={t}
      fontsHref="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Space+Grotesk:wght@400;500;600&display=swap"
      jsonLd={[siteJsonLd]}
      home={{
        href: "/brands/adforge",
        label: "AdForge",
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
          href: ADFORGE_URL,
          label: "Visit adforge →",
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
            AdForge
          </div>
          <div style={{ marginTop: 6 }}>Scored short-form video ads · products & local businesses</div>
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
