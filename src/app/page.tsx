import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { SERVICE_TIERS } from "@/lib/pricing";
import { StructuredData } from "@/components/seo/structured-data";
import { CinematicHome } from "@/components/cinematic/CinematicHome";

/**
 * Home page — the cinematic rebuild (2026-06-24).
 *
 * The live `/` now renders <CinematicHome> (the dark, operator-built positioning:
 * one platform for service businesses). The previous light-theme landing
 * components are retired from this route — the build-studio messaging still lives
 * at /work-with-us. JSON-LD stays for SEO. Price in the description comes from
 * pricing.ts (no literals).
 */

const ENTRY_SETUP = SERVICE_TIERS[0]?.setup ?? 0; // Spark — from pricing.ts
const TITLE =
  "Day14 — the software that runs your service business. Live in 14 days.";
const DESCRIPTION =
  `Site, online booking, customer portal, payments, scheduling, an admin app and an AI assistant — one platform for service businesses, built by an operator who runs one too. Builds from $${ENTRY_SETUP.toLocaleString()}.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: SITE.brand,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function HomePage() {
  return (
    <>
      <StructuredData />
      <CinematicHome />
    </>
  );
}
