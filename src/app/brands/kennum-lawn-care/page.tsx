import Link from "next/link";
import { brandTheme as t, services, whyUs } from "./theme";

export default function KennumHome() {
  return (
    <main>
      {/* Hero */}
      <section style={{ padding: "110px 32px 70px", textAlign: "center", maxWidth: 820, margin: "0 auto" }}>
        <div
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: t.colors.secondary,
            background: t.colors.accent,
            padding: "6px 12px",
            borderRadius: 100,
            marginBottom: 22,
          }}
        >
          Serving Southwest Florida
        </div>
        <h1
          style={{
            fontFamily: t.fonts.heading,
            fontSize: 52,
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            color: t.colors.primary,
            margin: 0,
          }}
        >
          A yard you never have to think about.
        </h1>
        <p style={{ fontSize: 18, color: t.colors.muted, marginTop: 18, maxWidth: 600, marginInline: "auto", lineHeight: 1.6 }}>
          Weekly lawn maintenance and landscaping from a crew that shows up on the same day, every
          week — at one flat monthly price.
        </p>
        <div style={{ marginTop: 30, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/brands/kennum-lawn-care/contact"
            style={{
              background: t.colors.primary,
              color: "#fff",
              padding: "14px 28px",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Get a free quote
          </Link>
          <Link
            href="/brands/kennum-lawn-care/services"
            style={{
              background: t.colors.surface,
              color: t.colors.primary,
              padding: "14px 28px",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 600,
              border: `1px solid ${t.colors.accent}`,
            }}
          >
            See services
          </Link>
        </div>
      </section>

      {/* Services preview */}
      <section style={{ padding: "20px 32px 60px", maxWidth: 1080, margin: "0 auto" }}>
        <h2 style={{ fontFamily: t.fonts.heading, fontSize: 28, letterSpacing: "-0.02em", marginBottom: 6 }}>
          What we do
        </h2>
        <p style={{ color: t.colors.muted, marginBottom: 26 }}>
          Recurring maintenance and one-off projects — all quoted free.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
          {services.map((s) => (
            <article
              key={s.title}
              style={{
                background: t.colors.surface,
                border: `1px solid ${t.colors.accent}`,
                borderRadius: 14,
                padding: 22,
              }}
            >
              <h3 style={{ fontFamily: t.fonts.heading, fontSize: 16, margin: 0, color: t.colors.primary }}>
                {s.title}
              </h3>
              <div style={{ color: t.colors.secondary, fontSize: 13, fontWeight: 600, margin: "6px 0 10px" }}>
                {s.price}
              </div>
              <p style={{ color: t.colors.muted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{s.blurb}</p>
            </article>
          ))}
        </div>
        <div style={{ marginTop: 22 }}>
          <Link href="/brands/kennum-lawn-care/services" style={{ color: t.colors.primary, fontWeight: 600, fontSize: 14 }}>
            Full service list &amp; pricing &rarr;
          </Link>
        </div>
      </section>

      {/* Why us */}
      <section style={{ padding: "40px 32px", background: t.colors.surface, borderTop: `1px solid ${t.colors.accent}`, borderBottom: `1px solid ${t.colors.accent}` }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <h2 style={{ fontFamily: t.fonts.heading, fontSize: 28, letterSpacing: "-0.02em", marginBottom: 26 }}>
            Why homeowners stay with us
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
            {whyUs.map((w) => (
              <div key={w.title}>
                <h3 style={{ fontFamily: t.fonts.heading, fontSize: 16, margin: "0 0 6px", color: t.colors.primary }}>
                  {w.title}
                </h3>
                <p style={{ color: t.colors.muted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section style={{ padding: "70px 32px", textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
        <h2 style={{ fontFamily: t.fonts.heading, fontSize: 26, letterSpacing: "-0.02em", marginBottom: 10 }}>
          Ready to hand off the yard?
        </h2>
        <p style={{ color: t.colors.muted, marginBottom: 24, lineHeight: 1.6 }}>
          Tell us about your property and we&apos;ll send a free, no-pressure quote.
        </p>
        <Link
          href="/brands/kennum-lawn-care/contact"
          style={{
            background: t.colors.primary,
            color: "#fff",
            padding: "14px 30px",
            borderRadius: 10,
            textDecoration: "none",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Get a free quote
        </Link>
      </section>
    </main>
  );
}
