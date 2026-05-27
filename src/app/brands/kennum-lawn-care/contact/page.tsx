import { brandTheme as t } from "../theme";

export const metadata = {
  title: "Get a free quote",
  description:
    "Request a free, custom lawn care or landscaping quote from Kennum Lawn Care, serving homeowners across Southwest Florida.",
  alternates: { canonical: "/brands/kennum-lawn-care/contact" },
  openGraph: {
    title: "Get a free quote — Kennum Lawn Care",
    description:
      "Request a free, custom lawn care or landscaping quote from Kennum Lawn Care.",
    type: "website",
    url: "/brands/kennum-lawn-care/contact",
    siteName: "Kennum Lawn Care",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Get a free quote — Kennum Lawn Care",
    description:
      "Request a free, custom lawn care or landscaping quote from Kennum Lawn Care.",
  },
};

const inputStyle = {
  padding: "12px 14px",
  border: `1px solid ${t.colors.accent}`,
  borderRadius: 8,
  fontSize: 14,
  fontFamily: t.fonts.body,
  width: "100%",
  boxSizing: "border-box" as const,
};

export default function KennumContact() {
  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: "70px 32px" }}>
      <h1 style={{ fontFamily: t.fonts.heading, fontSize: 40, letterSpacing: "-0.02em", color: t.colors.primary, margin: 0 }}>
        Get a free quote
      </h1>
      <p style={{ color: t.colors.muted, marginTop: 12, marginBottom: 28, lineHeight: 1.6, fontSize: 16 }}>
        Tell us about your property and what you need. We&apos;ll reply the same day with a free,
        custom quote — no pressure, no obligation.
      </p>

      <form
        action="/api/brands/kennum-lawn-care/contact"
        method="POST"
        style={{ display: "grid", gap: 14 }}
      >
        <div>
          <label htmlFor="name" style={{ fontSize: 13, fontWeight: 600, color: t.colors.text }}>
            Your name
          </label>
          <input id="name" type="text" name="name" required style={{ ...inputStyle, marginTop: 6 }} />
        </div>
        <div>
          <label htmlFor="email" style={{ fontSize: 13, fontWeight: 600, color: t.colors.text }}>
            Email
          </label>
          <input id="email" type="email" name="email" required style={{ ...inputStyle, marginTop: 6 }} />
        </div>
        <div>
          <label htmlFor="message" style={{ fontSize: 13, fontWeight: 600, color: t.colors.text }}>
            About your property
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={6}
            placeholder="Your property address, what you'd like done, and the best phone number to reach you."
            style={{ ...inputStyle, marginTop: 6, resize: "vertical" }}
          />
        </div>
        <button
          type="submit"
          style={{
            background: t.colors.primary,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "14px 28px",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: t.fonts.body,
          }}
        >
          Send my quote request
        </button>
      </form>

      <p style={{ color: t.colors.muted, fontSize: 13, marginTop: 20, lineHeight: 1.6 }}>
        Kennum Lawn Care · Lawn care &amp; landscaping across Southwest Florida.
      </p>
    </main>
  );
}
