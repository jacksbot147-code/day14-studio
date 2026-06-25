import type { Metadata } from "next";
import Link from "next/link";

import { NewsletterSignup } from "@/components/NewsletterSignup";
import { CinematicPage } from "@/components/cinematic/CinematicPage";
import { Reveal } from "@/components/cinematic/Reveal";

/**
 * /tools — free internal tools index, in the cinematic skin.
 *
 * Re-themed into the cinematic system (block 8/10 of the rebuild — legal + info).
 * Light-touch: the shared <CinematicPage> shell + `.cin-prose` long-form, with the
 * existing interactive <NewsletterSignup> form preserved. Content unchanged.
 */

export const metadata: Metadata = {
  title: "Free tools",
  description:
    "Free tools and templates from Day14. The stack we use to ship in 14 days, available for anyone to study or steal.",
  alternates: { canonical: "/tools" },
};

const TOOLS = [
  {
    title: "Day14 Pricing Calculator",
    desc: "Plug in your SaaS subscriptions (Jobber, Housecall Pro, Squarespace, GoHighLevel). We calculate the 3-year cost vs Day14 and tell you when the break-even is.",
    href: "/tools/pricing-calculator",
    status: "coming",
  },
  {
    title: "14-Day Build Plan Template",
    desc: "The exact playbook we use to ship a Portal-tier project. Notion template, checklists, and the order form we send customers.",
    href: "/tools/build-plan",
    status: "coming",
  },
  {
    title: "Niche Validator",
    desc: "Type a business idea. We Gemini-search for current competitors, market-size signals, and winning angles. Same engine we use internally.",
    href: "/tools/niche-validator",
    status: "coming",
  },
  {
    title: "Stack Auditor",
    desc: "Paste your current website URL. We inspect your stack (analytics, hosting, ESP, CRM, payments) and tell you what is costing 3× what it should.",
    href: "/tools/stack-audit",
    status: "coming",
  },
];

const ALREADY_PUBLIC = [
  { href: "/api/feed.xml", label: "Live RSS feed", desc: "Every commit and agent action on the Day14 empire, in real time." },
  { href: "/builds", label: "Public build logs", desc: "Every customer build is public from day one." },
  { href: "/stack", label: "The Day14 stack", desc: "Full breakdown of the 20+ agents we run." },
  { href: "/case-studies/hot-flash-co", label: "Hot Flash Co case study", desc: "How we used the stack to build an autonomous POD store in under a day." },
];

export default function ToolsPage() {
  return (
    <CinematicPage
      hero={{
        eyebrow: "Free tools",
        title: "Internal tools from the Day14 stack, open to anyone.",
        lede: "Most of these power our customer builds. If they save us hours, they’ll save you hours too.",
      }}
    >
      <Reveal as="div" className="cin-prose">
        <h2>In the works</h2>
        <ul>
          {TOOLS.map((t) => (
            <li key={t.title}>
              <strong>{t.title}</strong>
              {t.status === "coming" ? " — coming soon. " : " "}
              {t.status === "coming" ? (
                t.desc
              ) : (
                <>
                  {t.desc} <Link href={t.href}>Open tool →</Link>
                </>
              )}
            </li>
          ))}
        </ul>

        <hr />

        <p className="cin-prose-kicker">Get notified</p>
        <h2>Email me when each one ships.</h2>
        <p>
          Subscribe to the build log and I&rsquo;ll send a note when each tool
          goes live (along with everything else we&rsquo;re shipping).
        </p>
        <div style={{ margin: "1.4em 0" }}>
          <NewsletterSignup source="tools-page" buttonText="Notify me" />
        </div>

        <h2>Open right now.</h2>
        <ul>
          {ALREADY_PUBLIC.map((l) => (
            <li key={l.href}>
              <Link href={l.href}>{l.label} →</Link> — {l.desc}
            </li>
          ))}
        </ul>
      </Reveal>
    </CinematicPage>
  );
}
