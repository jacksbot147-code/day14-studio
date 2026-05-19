import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Terms of Service — Day14",
  description: "The short version: you pay, we ship in 14 days, you own the code, 30-day cancel anytime.",
};

const UPDATED = "May 19, 2026";

export default function TermsPage() {
  return (
    <>
    <SiteHeader />
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "80px 32px", fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif", color: "#2F2A33", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 40, letterSpacing: "-0.02em", marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ color: "#7A6F8F", fontSize: 14, marginBottom: 40 }}>Last updated {UPDATED}</p>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>The deal</h2>
      <p>You sign an order form, you pay a 50% deposit, we ship your product in 14 days (Portal SKU) or your deposit refunds in full. The remaining 50% is due at launch. The monthly fee covers hosting + maintenance and is billed via Stripe.</p>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>What you get</h2>
      <ul style={{ paddingLeft: 24 }}>
        <li>The complete repo, in your name on GitHub, from day one.</li>
        <li>A live deployment on Vercel, in our hosting account (covered by the monthly).</li>
        <li>Your domain, registered in your name (or we use yours).</li>
        <li>30-minute training walk-through at launch + 1 hour of changes per month included.</li>
        <li>Email support at <a href="mailto:hello@day14.us">hello@day14.us</a>, replies within 24h on business days.</li>
      </ul>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>What we don't do</h2>
      <ul style={{ paddingLeft: 24 }}>
        <li>Custom logo design from scratch (we use your existing or refer you to a designer).</li>
        <li>Standing meetings or weekly status calls (the build-log is your status update).</li>
        <li>Free open-ended changes after launch — anything beyond your monthly hour is $200/hr or rolls into a Platform upgrade.</li>
      </ul>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>Cancellation</h2>
      <p>You can cancel monthly hosting at any time with 30 days notice. When you cancel, you keep the repo, the domain, and the customer data. We deliver a migration runbook so you can self-host or move to another developer.</p>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>Refunds</h2>
      <p>See the <a href="/refunds" style={{ color: "#7A6F8F" }}>refund policy</a>. Short version: if your Portal isn't live and accepting real customer payments by end of day 14, your deposit refunds in full and you keep everything we've shipped.</p>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>Intellectual property</h2>
      <p>You own the code we write for you. We retain the right to use generalized patterns and tooling we've built (e.g., the Day14 OS automation stack) in future projects.</p>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>Liability</h2>
      <p>We do our best to ship working software, but we're not liable for damages exceeding the amount you've paid us in the prior 90 days. You're responsible for backing up your customer data (we provide tooling to do this).</p>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>Governing law</h2>
      <p>These terms are governed by the laws of the State of Florida. Disputes go to courts in Lee County, FL.</p>

      <h2 style={{ fontSize: 22, marginTop: 40, marginBottom: 12 }}>Questions</h2>
      <p>Email Jack at <a href="mailto:hello@day14.us">hello@day14.us</a> before signing if anything's unclear. We'd rather over-explain on the call than have you sign confused.</p>
    </main>
    <SiteFooter />
    </>
  );
}
