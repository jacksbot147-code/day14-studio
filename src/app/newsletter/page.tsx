import { NewsletterSignup } from "@/components/NewsletterSignup";

export const metadata = {
  title: "Newsletter — Day14",
  description: "One email a week from the founder of Day14. Build logs, lessons from running a one-operator studio with AI agents, customer wins. No filler.",
  openGraph: { title: "Day14 Newsletter", description: "Build logs from a one-operator AI studio." },
};

export default function NewsletterPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "80px 32px" }}>
      <h1 style={{ fontSize: 44, letterSpacing: "-0.02em", marginBottom: 16, lineHeight: 1.1 }}>The Day14 build log</h1>
      <p style={{ fontSize: 18, color: "#7A6F8F", marginBottom: 32, lineHeight: 1.6 }}>
        One email a week. What we shipped, what broke, what we'd do differently. Plus a running tally of every business we're building on the Day14 stack. No filler, no "here's what's new at our company."
      </p>

      <div style={{ background: "#FAF8F4", border: "1px solid #E5DDD0", borderRadius: 12, padding: 28, marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12, letterSpacing: "-0.01em" }}>Subscribe</h2>
        <NewsletterSignup source="newsletter-page" buttonText="Subscribe →" />
        <p style={{ fontSize: 12, color: "#888", marginTop: 12 }}>Unsubscribe anytime. We don't sell or share email addresses.</p>
      </div>

      <h2 style={{ fontSize: 24, letterSpacing: "-0.01em", marginBottom: 16 }}>What you can expect</h2>
      <ul style={{ paddingLeft: 24, lineHeight: 1.8, color: "#444", fontSize: 15 }}>
        <li><strong>Daily build logs</strong> from active customer projects — public commits, day-by-day progress.</li>
        <li><strong>Stack teardowns</strong> — what we used, what we'd swap, exact unit economics.</li>
        <li><strong>Agent experiments</strong> — what the autonomous side of Day14 is actually doing this week.</li>
        <li><strong>Niche reports</strong> — markets we're scanning, opportunities we passed on, why.</li>
      </ul>
    </main>
  );
}
