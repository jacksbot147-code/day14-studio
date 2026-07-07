import { brandTheme as t, steps, improveLoop, MARQUE_URL } from "./theme";

/**
 * Marque (formerly AdForge) — Day14 sister-company page.
 *
 * Marque is a standalone product with its own site; this page introduces it
 * inside the Day14 brand roster and links out. Content rules:
 *   - The improve-loop numbers are REAL predictor output; the demo brand is
 *     fictional and every stat block says so inline.
 *   - No pricing figures on this page — pricing lives in the product repo's
 *     single source of truth and renders on the Marque site itself.
 *   - Pre-launch honesty: Marque isn't taking payments yet; the CTA says
 *     "early access", not "buy".
 */

const HOME_TITLE = "Marque — brand-grade short-form video ads for products & local business";

export const metadata = {
  title: { absolute: HOME_TITLE },
  description:
    "Marque turns any link — a product, a service, or a trend — into a batch of TikTok, Reels & Shorts video ads, ready to run and scored before any media spend. Built and operated on the Day14 OS.",
  alternates: { canonical: "/brands/marque" },
  openGraph: {
    title: HOME_TITLE,
    description:
      "Brand-grade AI video ads from any link — made in minutes, scored for hook strength and retention before launch.",
    type: "website",
    url: "/brands/marque",
  },
  twitter: { card: "summary_large_image" as const },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Marque",
  url: MARQUE_URL,
  slogan: t.tagline,
  description:
    "Brand-grade AI short-form video ads for DTC products, local service businesses, and trends — every ad scored by a virality predictor before media spend.",
  parentOrganization: { "@type": "Organization", name: "Day14", url: "https://day14.us" },
  knowsAbout: [
    "Short-form video ads",
    "TikTok ads",
    "Instagram Reels ads",
    "YouTube Shorts ads",
    "Ad creative testing",
    "Virality prediction",
  ],
};

const card: React.CSSProperties = {
  background: t.colors.surface,
  border: `1px solid ${t.colors.accent}`,
  borderRadius: 16,
  padding: 24,
};

export default function MarqueHome() {
  return (
    <main style={{ background: t.colors.bg, color: t.colors.text, fontFamily: t.fonts.body }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />

      {/* Hero */}
      <section style={{ padding: "96px 32px 56px", textAlign: "center", maxWidth: 780, margin: "0 auto" }}>
        <div
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: t.colors.primary,
            background: t.colors.accent,
            padding: "6px 12px",
            borderRadius: 100,
            marginBottom: 20,
          }}
        >
          A Day14 sister company · pre-launch
        </div>
        <h1
          style={{
            fontFamily: t.fonts.heading,
            fontSize: "clamp(34px, 5vw, 52px)",
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            color: t.colors.primary,
            margin: 0,
          }}
        >
          Brand-grade video ads, <em style={{ fontStyle: "normal", color: t.colors.secondary }}>from any link.</em>
        </h1>
        <p style={{ fontSize: 19, color: t.colors.muted, maxWidth: 620, margin: "20px auto 0", lineHeight: 1.6 }}>
          Marque turns a product URL — or a local service, or a rising trend — into a batch of
          ready-to-publish TikTok, Reels &amp; Shorts ads. Every one scored before a dollar goes to
          media.
        </p>
        <div style={{ marginTop: 30, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href={MARQUE_URL}
            style={{
              background: t.colors.primary,
              color: "#fff",
              padding: "13px 26px",
              borderRadius: 12,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Visit Marque for early access
          </a>
        </div>
      </section>

      {/* How it works */}
      <section style={{ maxWidth: 980, margin: "0 auto", padding: "40px 32px" }}>
        <h2 style={{ fontFamily: t.fonts.heading, fontSize: 28, color: t.colors.primary, letterSpacing: "-0.01em" }}>
          How it works
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
            marginTop: 20,
          }}
        >
          {steps.map((s, i) => (
            <div key={s.title} style={card}>
              <div style={{ fontFamily: t.fonts.heading, fontWeight: 700, color: t.colors.secondary, fontSize: 13 }}>
                STEP {i + 1}
              </div>
              <h3 style={{ fontFamily: t.fonts.heading, fontSize: 18, margin: "8px 0 6px", color: t.colors.primary }}>
                {s.title}
              </h3>
              <p style={{ fontSize: 14, color: t.colors.muted, lineHeight: 1.6, margin: 0 }}>{s.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The improve loop — real numbers, honest framing */}
      <section style={{ maxWidth: 980, margin: "0 auto", padding: "40px 32px 96px" }}>
        <h2 style={{ fontFamily: t.fonts.heading, fontSize: 28, color: t.colors.primary, letterSpacing: "-0.01em" }}>
          Score → fix → rescore. Measured.
        </h2>
        <p style={{ color: t.colors.muted, maxWidth: 640, lineHeight: 1.6 }}>
          The score isn&apos;t decoration — it drives iteration. {improveLoop.whatChanged}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 20,
          }}
        >
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.colors.muted, letterSpacing: "0.06em" }}>AD V1</div>
            <div style={{ fontFamily: t.fonts.heading, fontSize: 40, fontWeight: 700, color: t.colors.primary }}>
              {improveLoop.v1.overall}
              <span style={{ fontSize: 15, color: t.colors.muted, fontWeight: 500 }}>/100 overall</span>
            </div>
            <div style={{ fontSize: 14, color: t.colors.muted }}>
              hook {improveLoop.v1.hook} · sustain {improveLoop.v1.sustain}
            </div>
          </div>
          <div style={{ ...card, border: `2px solid ${t.colors.secondary}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.colors.secondary, letterSpacing: "0.06em" }}>
              AD V2 — ONE ITERATION LATER
            </div>
            <div style={{ fontFamily: t.fonts.heading, fontSize: 40, fontWeight: 700, color: t.colors.primary }}>
              {improveLoop.v2.overall}
              <span style={{ fontSize: 15, color: t.colors.muted, fontWeight: 500 }}>/100 overall</span>
            </div>
            <div style={{ fontSize: 14, color: t.colors.muted }}>
              hook {improveLoop.v2.hook} (+{improveLoop.v2.hook - improveLoop.v1.hook}) · sustain{" "}
              {improveLoop.v2.sustain}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: t.colors.muted, marginTop: 14 }}>{improveLoop.disclaimer}</p>
      </section>
    </main>
  );
}
