import type { ReactNode } from "react";

const TITLE = "The Loophole Advisor — Life Loophole";
const DESCRIPTION =
  "Describe your tax situation in plain words and get back the legal, IRS-sourced strategies that fit you. Educational information only — not tax advice.";

export const metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/brands/life-loophole/advisor" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: "/brands/life-loophole/advisor",
    siteName: "Life Loophole",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function LifeLoopholeAdvisorLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
