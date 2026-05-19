import Link from "next/link";

export const metadata = { title: "Subscribed — Day14", robots: { index: false } };

export default function ThanksPage() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "120px 32px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
      <h1 style={{ fontSize: 36, letterSpacing: "-0.02em", marginBottom: 16 }}>Check your inbox</h1>
      <p style={{ fontSize: 17, color: "#7A6F8F", lineHeight: 1.6, marginBottom: 32 }}>
        Confirmation email's on its way. Click the link to lock it in. First issue lands next Tuesday.
      </p>
      <Link href="/" style={{ display: "inline-block", padding: "12px 24px", background: "#2F2A33", color: "white", borderRadius: 8, textDecoration: "none", fontSize: 14 }}>← Back to Day14</Link>
    </main>
  );
}
