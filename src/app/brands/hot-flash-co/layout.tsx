import { brandTheme as t } from "./theme";
import { BrandLayout } from "@/components/brand/BrandLayout";

export const metadata = {
  title: { default: "Hot Flash Co — Print-on-demand humor for perimenopause and menopause — the smartest funny aunt ", template: "%s — Hot Flash Co" },
  description: "Print-on-demand humor for perimenopause and menopause — the smartest funny aunt at the table, making women feel seen, not pitied.",
  openGraph: {
    title: "Hot Flash Co",
    description: "Print-on-demand humor for perimenopause and menopause — the smartest funny aunt at the table, making women feel seen, not pitied.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

const FONTS_HREF = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(t.fonts.heading.split("'")[1] || "Inter")}:wght@400;600;700&family=${encodeURIComponent(t.fonts.body.split("'")[1] || "Inter")}:wght@400;500&display=swap`;

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <BrandLayout
      theme={t}
      fontsHref={FONTS_HREF}
      home={{
        href: "/brands/hot-flash-co",
        label: "Hot Flash Co",
        style: { color: t.colors.primary, fontSize: 22, fontWeight: 700, textDecoration: "none", letterSpacing: "-0.02em" },
      }}
      links={[
        { href: "/brands/hot-flash-co/products", label: "Shop" },
        { href: "/brands/hot-flash-co/blog", label: "Reading" },
        { href: "/brands/hot-flash-co/about", label: "About" },
        { href: "/brands/hot-flash-co/contact", label: "Contact" },
      ]}
      linksRowStyle={{ display: "flex", gap: 28, fontSize: 14 }}
      navStyle={{ padding: "20px 32px", fontFamily: t.fonts.heading }}
      footerStyle={{ fontSize: 12 }}
      footer={
        <>
          <div>{t.displayName} · {t.tagline}</div>
          <div style={{ marginTop: 8 }}>Part of the Day14 family.</div>
        </>
      }
    >
      {children}
    </BrandLayout>
  );
}
