/**
 * BrandTheme — the shared shape every brand site's theme.ts conforms to.
 *
 * Each brand keeps its own theme.ts (content + palette live with the brand),
 * but conforms to this interface via `satisfies BrandTheme` so shared
 * components (BrandLayout, BrandMain, BrandCtaLink) can be driven by any
 * brand's theme without per-brand prop plumbing.
 */

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  text: string;
  muted: string;
  /** Card / nav / footer surface — not every brand defines one. */
  surface?: string;
  /** Very pale tint for alternating section backgrounds. */
  softTint?: string;
}

export interface BrandFonts {
  heading: string;
  body: string;
}

export interface BrandTheme {
  slug: string;
  displayName: string;
  tagline: string;
  /** Trading name when it differs from displayName (e.g. "Currier Music"). */
  brandName?: string;
  /** One-line positioning statement. */
  niche?: string;
  /** Footer service-area line for local-service brands. */
  serviceArea?: string;
  colors: BrandColors;
  fonts: BrandFonts;
}
