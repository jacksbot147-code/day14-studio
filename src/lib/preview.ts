/**
 * preview — the instant-preview generator engine.
 *
 * Pure, dependency-free core that powers the "Build it" generator: it turns a
 * few inputs (business name, trade, city) into (a) a shareable token and (b) the
 * trade-specific content used to render a real branded preview page at
 * /preview/[token]. Isomorphic — the token codec runs in the browser (the hero
 * builder) and on the server (the route), so no database is needed for v1: the
 * URL *is* the preview.
 *
 * This is the reusable seam the larger generator grows from (multi-page sites,
 * outreach copy, and — once an image provider is wired — social + logo). Keep
 * generation honest: nothing here fabricates a customer or a price.
 */

export interface PreviewData {
  /** Business name as typed. */
  name: string;
  /** Canonical trade slug (see TRADE_CONTENT keys). */
  trade: string;
  /** City as typed (optional). */
  city: string;
}

export interface TradeContent {
  label: string;
  /** Short noun for headlines, e.g. "Pool service". */
  noun: string;
  tagline: string;
  /** Six service lines shown on the generated page. */
  services: string[];
}

export const TRADE_CONTENT: Record<string, TradeContent> = {
  pool: {
    label: "Pool service",
    noun: "Pool service",
    tagline: "Crystal-clear pools, handled on a schedule.",
    services: [
      "Weekly cleaning routes",
      "Chemical balancing",
      "Equipment repair",
      "Green-to-clean recovery",
      "Filter & pump service",
      "Seasonal openings & closings",
    ],
  },
  lawn: {
    label: "Lawn & landscaping",
    noun: "Lawn & landscaping",
    tagline: "A sharp yard every week — no chasing, no surprises.",
    services: [
      "Weekly mowing & edging",
      "Fertilization & pest programs",
      "Landscape design & installs",
      "Irrigation service",
      "Mulch & flower beds",
      "Seasonal cleanups",
    ],
  },
  pressure: {
    label: "Pressure washing",
    noun: "Pressure washing",
    tagline: "Driveways, homes, and roofs that look new again.",
    services: [
      "House & soft washing",
      "Driveway & concrete",
      "Roof soft-wash",
      "Paver sealing",
      "Gutter cleaning",
      "Commercial & fleet",
    ],
  },
  handyman: {
    label: "Handyman",
    noun: "Handyman service",
    tagline: "Your punch-list, done right the first time.",
    services: [
      "Home repairs",
      "TV & fixture installs",
      "Drywall & paint",
      "Furniture assembly",
      "Honey-do lists",
      "Small remodels",
    ],
  },
  detailing: {
    label: "Mobile detailing",
    noun: "Mobile detailing",
    tagline: "Showroom-clean — at your driveway.",
    services: [
      "Full auto detail",
      "Interior deep clean",
      "Ceramic coating",
      "Boat & RV detailing",
      "Fleet detailing",
      "Monthly maintenance plans",
    ],
  },
  hvac: {
    label: "HVAC",
    noun: "HVAC service",
    tagline: "Comfortable home, year-round — booked in minutes.",
    services: [
      "AC repair & diagnostics",
      "Heating & furnace service",
      "New system installs",
      "Maintenance plans",
      "Indoor air quality",
      "Emergency service calls",
    ],
  },
  cleaning: {
    label: "House cleaning",
    noun: "House cleaning",
    tagline: "A spotless home, on a schedule you set.",
    services: [
      "Recurring home cleaning",
      "Deep cleans",
      "Move-in & move-out",
      "Kitchen & bath detail",
      "Add-on tasks",
      "One-time & event cleans",
    ],
  },
  pest: {
    label: "Pest control",
    noun: "Pest control",
    tagline: "Pests gone, and kept gone — handled on schedule.",
    services: [
      "Quarterly pest treatment",
      "Ant & roach control",
      "Termite inspections",
      "Mosquito programs",
      "Rodent exclusion",
      "Commercial accounts",
    ],
  },
  salon: {
    label: "Salon & barber",
    noun: "Salon & barber",
    tagline: "Fill the chair — booking that runs itself.",
    services: [
      "Online appointment booking",
      "Cuts & styling",
      "Color & treatments",
      "Beard & grooming",
      "Memberships & packages",
      "Automated reminders",
    ],
  },
  roofing: {
    label: "Roofing",
    noun: "Roofing service",
    tagline: "A roof you can trust — quoted and scheduled fast.",
    services: [
      "Roof repairs",
      "Full replacements",
      "Free inspections",
      "Storm & leak response",
      "Gutter installation",
      "Maintenance plans",
    ],
  },
  electrician: {
    label: "Electrician",
    noun: "Electrical service",
    tagline: "Safe, code-right electrical — booked without the phone tag.",
    services: [
      "Repairs & troubleshooting",
      "Panel upgrades",
      "Lighting & fixtures",
      "EV charger installs",
      "Generators & surge protection",
      "Inspections & permits",
    ],
  },
  other: {
    label: "Service business",
    noun: "Service business",
    tagline: "Booked, organized, and running itself.",
    services: [
      "24/7 online booking",
      "Quotes & invoicing",
      "Customer portal",
      "Smart scheduling",
      "Online payments",
      "AI assistant",
    ],
  },
};

/** Map the hero's free-form trade values to canonical content slugs. */
export function normalizeTrade(trade: string): string {
  const t = (trade || "").toLowerCase();
  if (t.includes("pool")) return "pool";
  if (t.includes("lawn") || t.includes("landscap")) return "lawn";
  if (t.includes("pressure") || t.includes("wash")) return "pressure";
  if (t.includes("handy")) return "handyman";
  if (t.includes("detail")) return "detailing";
  if (t.includes("hvac") || t.includes("air condition") || t.includes("heating") || t.includes("cooling") || t.includes(" ac ") || t.includes("furnace")) return "hvac";
  if (t.includes("clean") && !t.includes("pressure") && !t.includes("wash")) return "cleaning";
  if (t.includes("maid") || t.includes("housekeep")) return "cleaning";
  if (t.includes("pest") || t.includes("exterminat") || t.includes("termite") || t.includes("mosquito")) return "pest";
  if (t.includes("salon") || t.includes("barber") || t.includes("hair") || t.includes("stylist") || t.includes("spa")) return "salon";
  if (t.includes("roof")) return "roofing";
  if (t.includes("electric")) return "electrician";
  return "other";
}

export function tradeContent(trade: string): TradeContent {
  return TRADE_CONTENT[normalizeTrade(trade)] ?? TRADE_CONTENT.other!;
}

/* ----------------------------- token codec ------------------------------ */
/* base64url of compact JSON {n,t,c}. Isomorphic (btoa in browser, Buffer on
 * the server) so the same code path runs client- and server-side. */

function b64urlEncode(s: string): string {
  const b =
    typeof btoa !== "undefined"
      ? btoa(unescape(encodeURIComponent(s)))
      : Buffer.from(s, "utf8").toString("base64");
  return b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(token: string): string {
  const b = token.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof atob !== "undefined") {
    return decodeURIComponent(escape(atob(b)));
  }
  return Buffer.from(b, "base64").toString("utf8");
}

export function encodePreview(d: PreviewData): string {
  return b64urlEncode(
    JSON.stringify({ n: d.name, t: d.trade, c: d.city }),
  );
}

export function decodePreview(token: string): PreviewData | null {
  try {
    const o = JSON.parse(b64urlDecode(token)) as {
      n?: unknown;
      t?: unknown;
      c?: unknown;
    };
    const name = typeof o.n === "string" ? o.n.slice(0, 80) : "";
    if (!name.trim()) return null;
    return {
      name: name.trim(),
      trade: typeof o.t === "string" ? o.t : "service business",
      city: typeof o.c === "string" ? o.c.slice(0, 60).trim() : "",
    };
  } catch {
    return null;
  }
}

export const titleCasePreview = (s: string) =>
  s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1));

/* ------------------------------ outreach -------------------------------- */
/* Pure cold-email generator in Jack's operator voice, tied to a preview.
 * Produces subject + body + the canonical preview URL so one input set
 * yields BOTH the preview and the matching outreach (Build Spec phase 5).
 * Honest by construction: no fabricated prices/metrics/testimonials, and
 * the email never claims the preview is the prospect's live site. */

/** Default public origin for preview links. */
export const PREVIEW_ORIGIN = "https://day14.us";

/** Build the canonical preview URL for a business (same codec as encodePreview). */
export function previewUrl(d: PreviewData, origin: string = PREVIEW_ORIGIN): string {
  return `${origin.replace(/\/+$/, "")}/preview/${encodePreview(d)}`;
}

export interface Outreach {
  subject: string;
  body: string;
  /** The preview link referenced in the body (placeholder-free, ready to send). */
  previewUrl: string;
}

/**
 * Generate a short cold-email for a prospect, referencing their trade/city and
 * linking the preview. Pure — no I/O, no send. The body is plain text (drafts
 * only; all sends are Jack-tapped). Pass an explicit `origin` for non-prod links.
 */
export function generateOutreach(
  d: PreviewData,
  origin: string = PREVIEW_ORIGIN,
): Outreach {
  const url = previewUrl(d, origin);
  const biz = titleCasePreview(d.name.trim());
  const tc = tradeContent(d.trade);
  const trade = tc.label.toLowerCase();
  const city = d.city.trim();
  const where = city ? ` in ${titleCasePreview(city)}` : "";

  const subject = `Built ${biz} a website preview — take a look`;

  const body = [
    `Hey — I'm Jack. I run Day14, a small build studio in Southwest Florida.`,
    ``,
    `I put together a free website preview for ${biz}. It's a real branded page` +
      ` — your ${trade} services, built to take bookings — not a mockup or a` +
      ` slide. Made it for a ${trade} business${where} like yours so you can` +
      ` see it before deciding anything.`,
    ``,
    `Here it is: ${url}`,
    ``,
    `If you like it, I can have it live on your own domain fast. If it's not for` +
      ` you, no worries at all — the preview's yours to keep either way.`,
    ``,
    `— Jack, Day14`,
  ].join("\n");

  return { subject, body, previewUrl: url };
}

/* ------------------------------ brand kit ------------------------------- */
/* Text-only brand starter per trade (queue item 16): a suggested color palette
 * (hex) + a font pairing, rendered as an honest "starting point" block on the
 * preview. NO logo image — image generation is intentionally not wired (Build
 * Spec phase 4 is blocked until Jack picks an image provider). This is a pure,
 * dependency-free suggestion the prospect can adopt or override; it never claims
 * to be a finished identity. Fonts are named (system/common web families) so the
 * block can describe a pairing without bundling or fetching anything. */

export interface BrandPalette {
  /** Primary brand color (buttons, headers). */
  primary: string;
  /** Secondary accent (highlights, links). */
  accent: string;
  /** Body text color — mood-aware: dark on light themes, light on dark themes. */
  ink: string;
  /** Card surface color (sits on top of the page `bg`). */
  surface: string;
}

export interface BrandFonts {
  /** Suggested heading typeface (named family). */
  heading: string;
  /** Suggested body typeface (named family). */
  body: string;
}

export interface BrandKit {
  /** Short, evocative name for the look (not a guarantee, just a label). */
  name: string;
  /** One-line description of the vibe. */
  vibe: string;
  /** Drives default text treatment: light themes = dark ink on light bg; dark themes = light ink on dark bg. */
  mood: "light" | "dark";
  /** Page background color (the canvas the cards sit on). */
  bg: string;
  /** Hero section background gradient (CSS value). */
  heroGradient: string;
  palette: BrandPalette;
  fonts: BrandFonts;
}

const BRAND_KITS: Record<string, BrandKit> = {
  pool: {
    name: "Coastal Clear",
    vibe: "Fresh, clean, and unmistakably water.",
    mood: "light",
    bg: "#F1FAFE",
    heroGradient: "linear-gradient(160deg,#eaf7fd,#bfe6f7)",
    palette: { primary: "#0077B6", accent: "#48CAE4", ink: "#14323F", surface: "#ffffff" },
    fonts: { heading: "Poppins", body: "Inter" },
  },
  lawn: {
    name: "Fresh Cut",
    vibe: "Green, grounded, and dependable.",
    mood: "light",
    bg: "#F4FAF1",
    heroGradient: "linear-gradient(160deg,#eef7e6,#cfe9b8)",
    palette: { primary: "#2E7D32", accent: "#8BC34A", ink: "#1B2E1B", surface: "#ffffff" },
    fonts: { heading: "Montserrat", body: "Inter" },
  },
  pressure: {
    name: "Spotless Blue",
    vibe: "Bright, high-contrast, before-and-after clean.",
    mood: "light",
    bg: "#F2F8FD",
    heroGradient: "linear-gradient(160deg,#e8f3fc,#bfe0f5)",
    palette: { primary: "#1565C0", accent: "#26C6DA", ink: "#10243A", surface: "#ffffff" },
    fonts: { heading: "Poppins", body: "Inter" },
  },
  handyman: {
    name: "Toolbox",
    vibe: "Sturdy, friendly, get-it-done.",
    mood: "light",
    bg: "#FBF6F0",
    heroGradient: "linear-gradient(160deg,#fbeede,#f6d3a8)",
    palette: { primary: "#C75000", accent: "#FFB74D", ink: "#2B1A0E", surface: "#ffffff" },
    fonts: { heading: "Oswald", body: "Inter" },
  },
  detailing: {
    name: "Showroom",
    vibe: "Sleek, glossy, premium finish.",
    mood: "dark",
    bg: "#0E0E10",
    heroGradient: "linear-gradient(160deg,#161618,#0b0b0c)",
    palette: { primary: "#E24A3B", accent: "#FF7A6B", ink: "#F5F5F5", surface: "#1a1a1d" },
    fonts: { heading: "Montserrat", body: "Inter" },
  },
  hvac: {
    name: "Comfort Zone",
    vibe: "Cool blue meets warm red — both seasons covered.",
    mood: "light",
    bg: "#F3F7FB",
    heroGradient: "linear-gradient(160deg,#eaf2fb,#d2e6f7)",
    palette: { primary: "#1976D2", accent: "#E64A19", ink: "#16242E", surface: "#ffffff" },
    fonts: { heading: "Poppins", body: "Inter" },
  },
  cleaning: {
    name: "Fresh Linen",
    vibe: "Light, airy, and immaculate.",
    mood: "light",
    bg: "#F3FBF9",
    heroGradient: "linear-gradient(160deg,#e9f7f4,#c7ebe4)",
    palette: { primary: "#00897B", accent: "#80CBC4", ink: "#15302C", surface: "#ffffff" },
    fonts: { heading: "Quicksand", body: "Inter" },
  },
  pest: {
    name: "All Clear",
    vibe: "Confident, protective, reassuring.",
    mood: "light",
    bg: "#F7FAF0",
    heroGradient: "linear-gradient(160deg,#f0f6e4,#dceabf)",
    palette: { primary: "#33691E", accent: "#F9A825", ink: "#1E2812", surface: "#ffffff" },
    fonts: { heading: "Montserrat", body: "Inter" },
  },
  salon: {
    name: "Chair & Mirror",
    vibe: "Stylish, modern, a little bit luxe.",
    mood: "dark",
    bg: "#1a1018",
    heroGradient: "linear-gradient(160deg,#2a1530,#160a1c)",
    palette: { primary: "#EC407A", accent: "#CBA6E0", ink: "#FAF4FB", surface: "#241029" },
    fonts: { heading: "Playfair Display", body: "Inter" },
  },
  roofing: {
    name: "Topline",
    vibe: "Solid, trustworthy, built to last.",
    mood: "dark",
    bg: "#1B2429",
    heroGradient: "linear-gradient(160deg,#28353c,#161e22)",
    palette: { primary: "#FF7043", accent: "#FFB199", ink: "#F4F6F7", surface: "#263238" },
    fonts: { heading: "Oswald", body: "Inter" },
  },
  electrician: {
    name: "Live Wire",
    vibe: "Bright, safe, and switched-on.",
    mood: "dark",
    bg: "#14192E",
    heroGradient: "linear-gradient(160deg,#1c2342,#10142a)",
    palette: { primary: "#FFC107", accent: "#7E8CE0", ink: "#F4F5FC", surface: "#1f2540" },
    fonts: { heading: "Rajdhani", body: "Inter" },
  },
  other: {
    name: "Clean Slate",
    vibe: "Modern, neutral, and professional.",
    mood: "light",
    bg: "#F4F6FB",
    heroGradient: "linear-gradient(160deg,#eef1fb,#d8def5)",
    palette: { primary: "#1F4FFF", accent: "#39E6D4", ink: "#10131A", surface: "#ffffff" },
    fonts: { heading: "Poppins", body: "Inter" },
  },
};

/**
 * Suggest a text-only brand starter (palette + font pairing) for a trade.
 * Pure — same normalization as tradeContent. NO logo/image is produced; this is
 * a starting point the prospect can keep or change, not a finished identity.
 */
export function brandKit(trade: string): BrandKit {
  return BRAND_KITS[normalizeTrade(trade)] ?? BRAND_KITS.other!;
}

/**
 * Flattened, CSS-var-ready theme for a trade's preview page. Resolves a BrandKit
 * into the exact token set the preview layout maps onto `--pv-*` custom
 * properties (item 2's theme plumbing). Pure — no I/O. `line` is a subtle border
 * tone derived from the mood (hairline dividers/card borders).
 */
export interface PreviewTheme {
  mood: "light" | "dark";
  /** Page background. */
  bg: string;
  primary: string;
  accent: string;
  /** Body text color (mood-aware). */
  ink: string;
  /** Card surface. */
  surface: string;
  /** Hairline/border color, mood-derived. */
  line: string;
  /** Hero background gradient (CSS value). */
  heroGradient: string;
  headingFont: string;
  bodyFont: string;
}

/**
 * Pick the more readable foreground (near-black vs white) for text placed ON a
 * solid hex background — used for solid-`primary` button/label text where a fixed
 * `#fff` fails WCAG on light primaries (e.g. the electrician amber, roofing
 * orange). Pure; returns `"#141414"` or `"#ffffff"`, whichever has the higher
 * WCAG contrast ratio against `bgHex`. Accepts 3- or 6-digit hex.
 */
export function readableOn(bgHex: string): "#141414" | "#ffffff" {
  const parse = (h: string): [number, number, number] => {
    let s = h.replace(/^#/, "");
    if (s.length === 3) s = s.split("").map((c) => c + c).join("");
    return [
      parseInt(s.slice(0, 2), 16),
      parseInt(s.slice(2, 4), 16),
      parseInt(s.slice(4, 6), 16),
    ];
  };
  const lin = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  const lum = ([r, g, b]: [number, number, number]) =>
    0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const ratio = (a: [number, number, number], b: [number, number, number]) => {
    const la = lum(a);
    const lb = lum(b);
    const hi = Math.max(la, lb);
    const lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  };
  const bg = parse(bgHex);
  const dark: [number, number, number] = [20, 20, 20];
  const white: [number, number, number] = [255, 255, 255];
  return ratio(dark, bg) >= ratio(white, bg) ? "#141414" : "#ffffff";
}

export function previewTheme(trade: string): PreviewTheme {
  const k = brandKit(trade);
  return {
    mood: k.mood,
    bg: k.bg,
    primary: k.palette.primary,
    accent: k.palette.accent,
    ink: k.palette.ink,
    surface: k.palette.surface,
    line: k.mood === "dark" ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)",
    heroGradient: k.heroGradient,
    headingFont: k.fonts.heading,
    bodyFont: k.fonts.body,
  };
}
