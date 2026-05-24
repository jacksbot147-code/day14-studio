import type { ReactNode } from "react";

const TITLE = "Life Loophole — Every legal advantage the tax code gives you";

export const metadata = {
  title: { absolute: TITLE },
  description:
    "Life Loophole shows you the legitimate, IRS-sourced tax strategies that fit your life — in plain English. A Day14 company. Educational information, not tax advice.",
  alternates: { canonical: "/brands/life-loophole" },
  openGraph: {
    title: TITLE,
    description:
      "The legal, IRS-sourced tax strategies that fit your life — found, explained, and organized.",
    type: "website",
    url: "/brands/life-loophole",
  },
  twitter: { card: "summary_large_image" as const },
};

export default function LifeLoopholeLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
