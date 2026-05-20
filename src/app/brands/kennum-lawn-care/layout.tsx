import Link from "next/link";
import { brandTheme as t } from "./theme";

export const metadata = {
  title: {
    default: "Kennum Lawn Care — Southwest Florida lawn care & landscaping",
    template: "%s — Kennum Lawn Care",
  },
  description:
    "Weekly lawn maintenance and landscaping across Southwest Florida. Dependable crew, flat monthly pricing, free quotes.",
  openGraph: {
    title: "Kennum Lawn Care",
    description: "A Southwest Florida yard, handled — weekly maintenance and landscaping.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function KennumLayout({ children }: { children: React.ReactNode }) {
  const nav = [
    { href: "/brands/kennum-lawn-care", label: "Home" },
    { href: "/brands/kennum-lawn-care/services", label: "Services" },
    { href: "/brands/kennum-lawn-care/about", label: "About" },
    { href: "/brands/kennum-lawn-care/contact", label: "Contact" },
  ];
  return (
    <div style={{ background: t.colors.bg, color: t.colors.text, fontFamily: t.fonts.body, minHeight: "100vh" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <nav
        style={{
          borderBottom: `1px solid ${t.colors.accent}`,
          padding: "18px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          background: t.colors.surface,
        }}
      >
        <Link
          href="/brands/kennum-lawn-care"
          style={{
            color: t.colors.primary,
            fontSize: 21,
            fontWeight: 700,
            fontFamily: t.fonts.heading,
            textDecoration: "none",
            letterSpacing: "-0.01em",
          }}
        >
          Kennum Lawn Care
        </Link>
        <div style={{ display: "flex", gap: 22, fontSize: 14, alignItems: "center", flexWrap: "wrap" }}>
          {nav.slice(1).map((n) => (
            <Link key={n.href} href={n.href} style={{ color: t.colors.text, textDecoration: "none" }}>
              {n.label}
            </Link>
          ))}
          <Link
            href="/brands/kennum-lawn-care/contact"
            style={{
              background: t.colors.primary,
              color: "#fff",
              padding: "9px 16px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Free quote
          </Link>
        </div>
      </nav>
      {children}
      <footer
        style={{
          borderTop: `1px solid ${t.colors.accent}`,
          padding: "40px 32px",
          textAlign: "center",
          color: t.colors.muted,
          fontSize: 13,
          marginTop: 80,
          background: t.colors.surface,
        }}
      >
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
      </footer>
    </div>
  );
}
