import Link from "next/link";
import { brandTheme as t, services } from "../theme";

export const metadata = {
  title: "Services & pricing",
  description:
    "Lawn maintenance, landscaping, mulch, trimming, seasonal cleanups, and irrigation across Southwest Florida. Free custom quotes, flat monthly pricing.",
  alternates: { canonical: "/brands/kennum-lawn-care/services" },
  openGraph: {
    title: "Services & pricing — Kennum Lawn Care",
    description:
      "Lawn maintenance, landscaping, mulch, trimming, seasonal cleanups, and irrigation across Southwest Florida.",
    type: "website",
    url: "/brands/kennum-lawn-care/services",
  },
};

export default function KennumServices() {
  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "70px 32px" }}>
      <h1 style={{ fontFamily: t.fonts.heading, fontSize: 40, letterSpacing: "-0.02em", color: t.colors.primary, margin: 0 }}>
        Services &amp; pricing
      </h1>
      <p style={{ color: t.colors.muted, marginTop: 12, marginBottom: 14, lineHeight: 1.6, fontSize: 16 }}>
        Prices below are starting points. Every property is different, so every quote is free and
        custom — you get one clear number before any work begins.
      </p>

      <div style={{ display: "grid", gap: 16, marginTop: 28 }}>
        {services.map((s) => (
          <article
            key={s.title}
            style={{
              background: t.colors.surface,
              border: `1px solid ${t.colors.accent}`,
              borderRadius: 14,
              padding: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "baseline" }}>
              <h2 style={{ fontFamily: t.fonts.heading, fontSize: 19, margin: 0, color: t.colors.primary }}>
                {s.title}
              </h2>
              <div style={{ color: t.colors.secondary, fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>
                {s.price}
              </div>
            </div>
            <p style={{ color: t.colors.text, fontSize: 15, lineHeight: 1.65, margin: "12px 0 0" }}>{s.detail}</p>
          </article>
        ))}
      </div>

      <div
        style={{
          marginTop: 36,
          padding: 28,
          background: t.colors.accent,
          borderRadius: 14,
          textAlign: "center",
        }}
      >
        <h2 style={{ fontFamily: t.fonts.heading, fontSize: 20, margin: "0 0 8px", color: t.colors.primary }}>
          Not sure what you need?
        </h2>
        <p style={{ color: t.colors.muted, margin: "0 0 18px", lineHeight: 1.6 }}>
          Send us your property details and we&apos;ll recommend the right plan.
        </p>
        <Link
          href="/brands/kennum-lawn-care/contact"
          style={{
            background: t.colors.primary,
            color: "#fff",
            padding: "13px 26px",
            borderRadius: 10,
            textDecoration: "none",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Get a free quote
        </Link>
      </div>
    </main>
  );
}
