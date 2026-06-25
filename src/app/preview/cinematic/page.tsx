import type { Metadata } from "next";

import { CinematicHome } from "@/components/cinematic/CinematicHome";

/**
 * /preview/cinematic — the complete cinematic homepage (non-destructive).
 *
 * As of 2026-06-24 the previously-missing hero + nav + backdrop (task 2/8) are
 * built, so this route now renders the FULL cinematic homepage via
 * <CinematicHome> — no more placeholder hero. The live `/` homepage is still
 * unchanged; swapping it to <CinematicHome> is a deliberate, approved step
 * (see CINEMATIC-REBUILD-REPORT-2026-06-24.md). Kept noindex as a staging
 * surface.
 */

export const metadata: Metadata = {
  title: "Cinematic rebuild — preview",
  robots: { index: false, follow: false },
};

export default function CinematicPreviewPage() {
  return <CinematicHome />;
}
