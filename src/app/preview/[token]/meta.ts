import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { decodePreview, tradeContent, titleCasePreview } from "@/lib/preview";

/**
 * previewMetadata — one source of truth for the SEO/meta of every preview route
 * (queue item 15).
 *
 * The four preview pages (one-pager + /services, /about, /contact) all need the
 * same metadata shape: stealth (noindex), a self-referential canonical, a good
 * trade/city-tailored title + description, and Open Graph / Twitter TEXT tags.
 * Centralizing it here keeps the four routes' `generateMetadata` to a single
 * delegating line and guarantees they stay consistent.
 *
 * NOTES:
 * - NOINDEX: every preview is a per-prospect, not-yet-live page — it must never
 *   be indexed. `robots:{index:false,follow:false}` is set unconditionally here
 *   (independent of the root layout's prod-only robots gate), so previews stay
 *   stealth in every environment.
 * - CANONICAL + OG URL are RELATIVE paths; the root layout sets `metadataBase`,
 *   so Next resolves them against the production origin — matching the pattern
 *   used by the other marketing pages (e.g. /capabilities, the kennum brand).
 * - NO OG IMAGE: no image provider is wired yet (honesty rail / blocked items),
 *   so these are text-only cards. We use `card:"summary"` (not
 *   `summary_large_image`) because there is genuinely no image to show — an
 *   honest, correct card rather than one that implies a missing graphic.
 * - TITLE uses `absolute` to bypass the root layout's `%s · Day14` template:
 *   the titles already end in "by Day14", so the template would double the
 *   brand. `absolute` keeps the title clean.
 * - HONESTY RAIL: copy is tailored to the decoded trade/city but invents no
 *   price, metric, testimonial, or specific claim about the real business.
 */

/** Sub-path of a preview route relative to /preview/[token]. */
export type PreviewSub = "" | "/services" | "/about" | "/contact";

const PAGE_NOUN: Record<PreviewSub, string> = {
  "": "site",
  "/services": "services",
  "/about": "about",
  "/contact": "contact",
};

export function previewMetadata(token: string, sub: PreviewSub = ""): Metadata {
  const noun = PAGE_NOUN[sub];
  const path = `/preview/${token}${sub}`;
  const robots = { index: false, follow: false } as const;

  const d = decodePreview(token);
  if (!d) {
    const title = `${titleCasePreview(noun)} preview — Day14`;
    return {
      title: { absolute: title },
      description: "A free website preview by Day14.",
      alternates: { canonical: path },
      robots,
    };
  }

  const name = titleCasePreview(d.name);
  const tc = tradeContent(d.trade);
  const trade = tc.label.toLowerCase();
  const city = d.city ? titleCasePreview(d.city) : "";
  const where = city ? ` in ${city}` : "";

  const title = `${name} — ${noun} preview by Day14`;
  const description =
    sub === ""
      ? `A free ${trade} website preview Day14 built for ${name}${where}. See it, then make it real.`
      : `The ${noun} page Day14 generated for ${name}${where} — a free ${trade} website preview. See it, then make it real.`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    robots,
    openGraph: {
      type: "website",
      siteName: SITE.brand,
      title,
      description,
      url: path,
      locale: "en_US",
    },
    twitter: {
      // Text-only: no OG image provider wired yet (queue item 15 / 17).
      card: "summary",
      title,
      description,
    },
  };
}
