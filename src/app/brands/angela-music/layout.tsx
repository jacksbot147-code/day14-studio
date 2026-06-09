import type { Metadata } from "next";
import type { ReactNode } from "react";
import { brandTheme as t } from "./theme";

const TITLE = `${t.brandName} — Private Music Lessons in Naples, FL`;
const DESCRIPTION = `${t.brandName} with Angela Currier. Private piano, guitar, voice, and music theory lessons in Naples and Southwest Florida. 13 years certified. Ages 3 to retired. Week-by-week scheduling, customized to each student.`;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/brands/angela-music" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: "/brands/angela-music",
  },
  twitter: { card: "summary_large_image" },
};

export default function AngelaMusicLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
