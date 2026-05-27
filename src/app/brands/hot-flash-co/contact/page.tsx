import { brandTheme as t } from "../theme";

const CONTACT_DESCRIPTION =
  "Get in touch with Hot Flash Co — for press, partnership, refunds, or general questions.";

export const metadata = {
  title: "Contact",
  description: CONTACT_DESCRIPTION,
  alternates: { canonical: "/brands/hot-flash-co/contact" },
  openGraph: {
    title: "Contact — Hot Flash Co",
    description: CONTACT_DESCRIPTION,
    type: "website",
    url: "/brands/hot-flash-co/contact",
    siteName: "Hot Flash Co",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Contact — Hot Flash Co",
    description: CONTACT_DESCRIPTION,
  },
};

export default function ContactPage() {
  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: "60px 32px" }}>
      <h1 style={{ fontFamily: t.fonts.heading, fontSize: 40, letterSpacing: "-0.02em", marginBottom: 24 }}>Get in touch</h1>
      <p style={{ color: t.colors.text, lineHeight: 1.7, marginBottom: 32 }}>For press, partnership, refunds, or general questions, drop us a line.</p>
      <form action={`/api/brands/hot-flash-co/contact`} method="POST" style={{ display: "grid", gap: 12 }}>
        <input type="text" name="name" placeholder="Your name" required style={{ padding: "12px 14px", border: `1px solid ${t.colors.accent}`, borderRadius: 6, fontSize: 14 }} />
        <input type="email" name="email" placeholder="you@email.com" required style={{ padding: "12px 14px", border: `1px solid ${t.colors.accent}`, borderRadius: 6, fontSize: 14 }} />
        <textarea name="message" placeholder="Your message" required rows={6} style={{ padding: "12px 14px", border: `1px solid ${t.colors.accent}`, borderRadius: 6, fontSize: 14, resize: "vertical" }} />
        <button type="submit" style={{ padding: "14px 28px", background: t.colors.primary, color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: "pointer" }}>Send</button>
      </form>
    </main>
  );
}
