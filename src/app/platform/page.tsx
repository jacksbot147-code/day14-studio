import type { Metadata } from "next";

import { Nav } from "@/components/cinematic/Nav";
import { CanvasField } from "@/components/cinematic/CanvasField";
import { SiteFooter } from "@/components/cinematic/SiteFooter";
import { Capabilities } from "@/components/cinematic/Capabilities";

/**
 * /platform — the capability hub. Renders the same data-driven grid as the
 * homepage's #capabilities section (each card links to its /platform/[slug]
 * detail page), inside the cinematic chrome. Gives the "Platform" nav item a
 * real landing surface and an SEO hub for the eight capability pages.
 */

export const metadata: Metadata = {
  title: "The platform — everything your service business runs on | Day14",
  description:
    "Marketing site, online booking, customer portal, payments, scheduling, an admin app, an AI assistant, and automated SMS/email — one platform for service businesses.",
  alternates: { canonical: "/platform" },
};

export default function PlatformIndexPage() {
  return (
    <div className="cinematic" id="top">
      <CanvasField />
      <Nav linkBase="/preview/cinematic" />
      <main>
        <Capabilities />
      </main>
      <SiteFooter />
    </div>
  );
}
