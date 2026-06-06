import type { Metadata } from "next";
import type { ReactNode } from "react";
import { brandTheme as t } from "./theme";

const TITLE = `${t.brandName} — In-Home Music Lessons in ${t.serviceArea.split(" · ")[0]}`;
const DESCRIPTION = `${t.brandName} with Angela Currier. In-home piano, guitar, voice, drums, and strings lessons for kids and teens in Naples, Bonita Springs, Marco Island, and Estero. Transparent pricing, real progress, lessons that come to you.`;

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
