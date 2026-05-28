/**
 * Day14 design tokens — single canonical source of truth.
 *
 * Both the admin command center and the per-brand sites can prepend
 * `DESIGN_TOKENS` to their stylesheets to pick up the same palette and
 * geometry. The admin's `ADMIN_CSS` includes this block at the top so
 * tokens never drift across the empire.
 *
 * The aesthetic is sharp and line-driven: hairline rules carry the
 * structure, near-square radii, one ember accent used with restraint.
 */
export const DESIGN_TOKENS = `
:root {
  /* Surfaces — clean off-white, lines do the structural work now. */
  --bg:#f6f6f4; --surface:#ffffff; --surface-2:#f5f5f2; --surface-3:#ebebe7;
  --border:#e6e6e1; --border-strong:#cfcfc8;
  --text:#0b0b0a; --text-2:#3c3c38; --muted:#6e6e66;
  /* Ember accent — aligns the admin with the day14.us marketing palette. */
  --accent:#e04617; --accent-text:#b5360f; --accent-soft:#fdeee9;
  --green:#15803d; --green-soft:#e7f6ec;
  --gold:#9a4708; --amber:#9a4708; --amber-soft:#fbf0db;
  --red:#dc2626; --red-soft:#fdeceb;
  --cyan:#0e7490; --purple:#7c3aed;
  /* Elevation used almost never — a single-pixel hairline, no blur. */
  --shadow:0 1px 0 rgba(11,11,10,0.03);
  --shadow-lift:0 1px 0 rgba(11,11,10,0.04);
  --ring:0 0 0 2px #ffffff, 0 0 0 4px var(--accent);
  /* Geometry pulled down hard — crisp, not cushioned. */
  --r-sm:2px; --r-md:3px; --r-lg:4px;
  --mono:'SF Mono', ui-monospace, Menlo, Monaco, Consolas, monospace;
}
`;

/**
 * Typed mirror of the CSS custom properties above. Useful when JS/TS
 * code (e.g. inline styles in brand layouts) needs the raw values
 * instead of `var(--…)` references. Keep in sync with `DESIGN_TOKENS`.
 */
export const designTokenValues = {
  bg: "#f6f6f4",
  surface: "#ffffff",
  surface2: "#f5f5f2",
  surface3: "#ebebe7",
  border: "#e6e6e1",
  borderStrong: "#cfcfc8",
  text: "#0b0b0a",
  text2: "#3c3c38",
  muted: "#6e6e66",
  accent: "#e04617",
  accentText: "#b5360f",
  accentSoft: "#fdeee9",
  green: "#15803d",
  greenSoft: "#e7f6ec",
  gold: "#9a4708",
  amber: "#9a4708",
  amberSoft: "#fbf0db",
  red: "#dc2626",
  redSoft: "#fdeceb",
  cyan: "#0e7490",
  purple: "#7c3aed",
  radii: { sm: "2px", md: "3px", lg: "4px" },
  mono: "'SF Mono', ui-monospace, Menlo, Monaco, Consolas, monospace",
} as const;
