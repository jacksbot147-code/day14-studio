import { brandTheme as t } from "./theme";
import Link from "next/link";

const HFC_TITLE = "Hot Flash Co — Real goods for the seasons no one warns you about.";
const HFC_DESCRIPTION = "Real goods for the seasons no one warns you about.";
const HFC_URL = "/brands/hot-flash-co";

export const metadata = {
  title: { default: HFC_TITLE, template: "%s — Hot Flash Co" },
  description: HFC_DESCRIPTION,
  alternates: { canonical: HFC_URL },
  openGraph: {
    title: HFC_TITLE,
    description: HFC_DESCRIPTION,
    type: "website",
    url: HFC_URL,
    siteName: "Hot Flash Co",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: HFC_TITLE,
    description: HFC_DESCRIPTION,
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Hot Flash Co",
  url: "https://day14.us/brands/hot-flash-co",
  description: HFC_DESCRIPTION,
  parentOrganization: { "@type": "Organization", name: "Day14" },
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Hot Flash Co",
  url: "https://day14.us/brands/hot-flash-co",
  description: HFC_DESCRIPTION,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: t.colors.bg, color: t.colors.text, fontFamily: t.fonts.body, minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
      />
      <link href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(t.fonts.heading.split("'")[1] || "Inter")}:wght@400;600;700&family=${encodeURIComponent(t.fonts.body.split("'")[1] || "Inter")}:wght@400;500&display=swap`} rel="stylesheet" />
      <nav style={{ borderBottom: `1px solid ${t.colors.accent}`, padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: t.fonts.heading }}>
        <Link href={`/brands/hot-flash-co`} style={{ color: t.colors.primary, fontSize: 22, fontWeight: 700, textDecoration: "none", letterSpacing: "-0.02em" }}>Hot Flash Co</Link>
        <div style={{ display: "flex", gap: 28, fontSize: 14 }}>
          <Link href={`/brands/hot-flash-co/products`} style={{ color: t.colors.text, textDecoration: "none" }}>Shop</Link>
          <Link href={`/brands/hot-flash-co/blog`} style={{ color: t.colors.text, textDecoration: "none" }}>Reading</Link>
          <Link href={`/brands/hot-flash-co/about`} style={{ color: t.colors.text, textDecoration: "none" }}>About</Link>
          <Link href={`/brands/hot-flash-co/contact`} style={{ color: t.colors.text, textDecoration: "none" }}>Contact</Link>
        </div>
      </nav>
      {children}
      <footer style={{ borderTop: `1px solid ${t.colors.accent}`, padding: "40px 32px", textAlign: "center", color: t.colors.muted, fontSize: 12, marginTop: 80 }}>
        <div>{t.displayName} · {t.tagline}</div>
        <div style={{ marginTop: 8 }}>Part of the Day14 family.</div>
      </footer>
    </div>
  );
}
