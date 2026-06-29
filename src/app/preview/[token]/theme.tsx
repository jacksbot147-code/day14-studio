import { previewTheme } from "@/lib/preview";

/**
 * /preview/[token]/theme — theme plumbing for the generated preview (queue item 2).
 *
 * Turns a trade into the two things every preview route needs in its <head>:
 *   (a) an inline <style> that sets the `--pv-*` custom properties (the
 *       business's OWN palette + fonts) scoped to the `.pv-root` element, and
 *   (b) the correct Google Fonts <link> (the trade's heading family + Inter),
 *       with preconnect so the swap doesn't flash.
 *
 * All values come from `previewTheme(trade)` in src/lib/preview.ts, so the THEME
 * TOKENS table has exactly one source of truth — this file only maps it onto CSS
 * variables and a font URL. The preview body (items 3–6) reads ONLY `--pv-*`;
 * it never touches Day14's `--cin-*` tokens. The lone Day14 element is the thin
 * honesty ribbon in layout.tsx — that stays neutral and is not themed here.
 *
 * HONESTY RAIL: nothing here fabricates copy, prices, or imagery; it only wires
 * colors and fonts. Monogram letter only — no logo image is referenced.
 */

/** Weight axis requested for every heading family (covers nav/hero/section heads). */
const HEAD_WEIGHTS = "wght@400;500;600;700";
/** Body family is always Inter; these three weights cover body + emphasis. */
const BODY_FAMILY = "Inter:wght@400;500;600";

/**
 * Build the Google Fonts css2 URL for a trade's preview: the heading family for
 * that trade (Poppins / Montserrat / Oswald / Quicksand / Playfair Display /
 * Rajdhani) plus Inter for body. Pure — no I/O. Spaces in family names (e.g.
 * "Playfair Display") are encoded as `+` per the css2 API. If a trade's heading
 * font is already Inter, only Inter is requested (no duplicate family).
 */
export function previewFontHref(trade: string): string {
  const head = previewTheme(trade).headingFont;
  const headFamily = `${head.replace(/ /g, "+")}:${HEAD_WEIGHTS}`;
  const families = head === "Inter" ? [BODY_FAMILY] : [headFamily, BODY_FAMILY];
  return `https://fonts.googleapis.com/css2?family=${families.join("&family=")}&display=swap`;
}

/**
 * Build the scoped CSS that sets the `--pv-*` variables on `.pv-root`. Pure —
 * returns a string so it can be unit-tested without a DOM. `--pv-mut` is derived
 * from ink + surface so muted text stays mood-correct (dark mood → a light-gray
 * mute, light mood → a soft-dark mute) without a separate token in the table.
 */
export function previewThemeCss(trade: string): string {
  const t = previewTheme(trade);
  return (
    `.pv-root{` +
    `--pv-bg:${t.bg};` +
    `--pv-primary:${t.primary};` +
    `--pv-accent:${t.accent};` +
    `--pv-ink:${t.ink};` +
    `--pv-surface:${t.surface};` +
    `--pv-line:${t.line};` +
    `--pv-hero:${t.heroGradient};` +
    `--pv-head:"${t.headingFont}",system-ui,sans-serif;` +
    `--pv-body:"${t.bodyFont}",system-ui,sans-serif;` +
    `--pv-mut:color-mix(in srgb,var(--pv-ink) 64%,var(--pv-surface));` +
    `}`
  );
}

/**
 * <head>-bound theme block for a preview route. Emits the font preconnects, the
 * trade's stylesheet link, and the inline `--pv-*` <style>. In the Next app
 * router these <link>/<style> tags are hoisted into <head> automatically, so
 * this can be rendered inside layout.tsx's tree (queue item 3). Server component
 * — no client JS.
 */
export function PreviewThemeHead({ trade }: { trade: string }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={previewFontHref(trade)} />
      <style dangerouslySetInnerHTML={{ __html: previewThemeCss(trade) }} />
    </>
  );
}
