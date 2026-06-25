import type { Metadata } from "next";

import { NewsletterSignup } from "@/components/NewsletterSignup";
import { CinematicPage } from "@/components/cinematic/CinematicPage";
import { Reveal } from "@/components/cinematic/Reveal";

/**
 * /newsletter — the build-log signup, in the cinematic skin.
 *
 * Re-themed into the cinematic system (block 8/10 of the rebuild — legal + info).
 * Light-touch: the shared <CinematicPage> shell + `.cin-prose` long-form, with the
 * existing interactive <NewsletterSignup> form preserved. Content unchanged.
 */

export const metadata: Metadata = {
  title: "Newsletter",
  description:
    "One email a week from the founder of Day14. Build logs, lessons from running a one-operator studio with AI agents, customer wins. No filler.",
  alternates: { canonical: "/newsletter" },
  openGraph: {
    title: "Day14 Newsletter",
    description: "Build logs from a one-operator AI studio.",
  },
};

const EXPECT = [
  {
    label: "Daily build logs",
    desc: "From active customer projects. Public commits, day-by-day progress.",
  },
  {
    label: "Stack teardowns",
    desc: "What we used, what we would swap, exact unit economics.",
  },
  {
    label: "Agent experiments",
    desc: "What the autonomous side of Day14 is actually doing this week.",
  },
  {
    label: "Niche reports",
    desc: "Markets we are scanning, opportunities we passed on, and why.",
  },
];

export default function NewsletterPage() {
  return (
    <CinematicPage
      hero={{
        eyebrow: "Newsletter",
        title: "The Day14 build log.",
        lede: "One email a week. What we shipped, what broke, what we’d do differently, plus a running tally of every business we’re building on the Day14 stack. No filler, no “here’s what’s new at our company.”",
      }}
    >
      <Reveal as="div" className="cin-prose">
        <p className="cin-prose-kicker">Subscribe</p>
        <h2>One email a week. That&rsquo;s it.</h2>
        <div style={{ margin: "1.4em 0" }}>
          <NewsletterSignup source="newsletter-page" buttonText="Subscribe →" />
        </div>
        <p>Unsubscribe anytime. We don&rsquo;t sell or share email addresses.</p>

        <h2>Four things, every week.</h2>
        <table>
          <tbody>
            {EXPECT.map((e) => (
              <tr key={e.label}>
                <th scope="row" style={{ whiteSpace: "nowrap" }}>
                  {e.label}
                </th>
                <td>{e.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>
    </CinematicPage>
  );
}
