import type { ReactNode } from "react";

const TITLE = "Life Loophole — Every legal advantage the tax code gives you";
const DESCRIPTION =
  "Life Loophole shows you the legitimate, IRS-sourced tax strategies that fit your life — in plain English. A Day14 company. Educational information, not tax advice.";
const OG_DESCRIPTION =
  "The legal, IRS-sourced tax strategies that fit your life — found, explained, and organized.";

export const metadata = {
  title: { default: TITLE, template: "%s — Life Loophole" },
  description: DESCRIPTION,
  alternates: { canonical: "/brands/life-loophole" },
  openGraph: {
    title: TITLE,
    description: OG_DESCRIPTION,
    type: "website",
    url: "/brands/life-loophole",
    siteName: "Life Loophole",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: TITLE,
    description: OG_DESCRIPTION,
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Life Loophole",
  url: "https://day14.us/brands/life-loophole",
  description: DESCRIPTION,
  parentOrganization: { "@type": "Organization", name: "Day14" },
  knowsAbout: [
    "U.S. federal tax strategy",
    "IRS-sourced tax planning",
    "Deductions and credits",
    "Retirement and HSA planning",
    "Small business tax structure",
  ],
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Life Loophole",
  url: "https://day14.us/brands/life-loophole",
  description: DESCRIPTION,
  inLanguage: "en-US",
};

export default function LifeLoopholeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
      />
      {children}
    </>
  );
}
