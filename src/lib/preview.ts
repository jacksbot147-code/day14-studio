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
  /** Near-black text color. */
  ink: string;
  /** Light surface / background. */
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
  palette: BrandPalette;
  fonts: BrandFonts;
}

const BRAND_KITS: Record<string, BrandKit> = {
  pool: {
    name: "Coastal Clear",
    vibe: "Fresh, clean, and unmistakably water.",
    palette: { primary: "#0077B6", accent: "#48CAE4", ink: "#14323F", surface: "#F1FAFE" },
    fonts: { heading: "Poppins", body: "Inter" },
  },
  lawn: {
    name: "Fresh Cut",
    vibe: "Green, grounded, and dependable.",
    palette: { primary: "#2E7D32", accent: "#8BC34A", ink: "#1B2E1B", surface: "#F4FAF1" },
    fonts: { heading: "Montserrat", body: "Inter" },
  },
  pressure: {
    name: "Spotless Blue",
    vibe: "Bright, high-contrast, before-and-after clean.",
    palette: { primary: "#1565C0", accent: "#26C6DA", ink: "#10243A", surface: "#F2F8FD" },
    fonts: { heading: "Poppins", body: "Inter" },
  },
  handyman: {
    name: "Toolbox",
    vibe: "Sturdy, friendly, get-it-done.",
    palette: { primary: "#C75000", accent: "#FFB74D", ink: "#2B1A0E", surface: "#FBF6F0" },
    fonts: { heading: "Oswald", body: "Inter" },
  },
  detailing: {
    name: "Showroom",
    vibe: "Sleek, glossy, premium finish.",
    palette: { primary: "#1A1A1A", accent: "#C0392B", ink: "#0D0D0D", surface: "#F5F5F5" },
    fonts: { heading: "Montserrat", body: "Inter" },
  },
  hvac: {
    name: "Comfort Zone",
    vibe: "Cool blue meets warm red — both seasons covered.",
    palette: { primary: "#1976D2", accent: "#E64A19", ink: "#16242E", surface: "#F3F7FB" },
    fonts: { heading: "Poppins", body: "Inter" },
  },
  cleaning: {
    name: "Fresh Linen",
    vibe: "Light, airy, and immaculate.",
    palette: { primary: "#00897B", accent: "#80CBC4", ink: "#15302C", surface: "#F3FBF9" },
    fonts: { heading: "Quicksand", body: "Inter" },
  },
  pest: {
    name: "All Clear",
    vibe: "Confident, protective, reassuring.",
    palette: { primary: "#33691E", accent: "#F9A825", ink: "#1E2812", surface: "#F7FAF0" },
    fonts: { heading: "Montserrat", body: "Inter" },
  },
  salon: {
    name: "Chair & Mirror",
    vibe: "Stylish, modern, a little bit luxe.",
    palette: { primary: "#6A1B9A", accent: "#EC407A", ink: "#241029", surface: "#FAF4FB" },
    fonts: { heading: "Playfair Display", body: "Inter" },
  },
  roofing: {
    name: "Topline",
    vibe: "Solid, trustworthy, built to last.",
    palette: { primary: "#37474F", accent: "#FF7043", ink: "#1B2429", surface: "#F4F6F7" },
    fonts: { heading: "Oswald", body: "Inter" },
  },
  electrician: {
    name: "Live Wire",
    vibe: "Bright, safe, and switched-on.",
    palette: { primary: "#283593", accent: "#FFC107", ink: "#15192E", surface: "#F4F5FC" },
    fonts: { heading: "Rajdhani", body: "Inter" },
  },
  other: {
    name: "Clean Slate",
    vibe: "Modern, neutral, and professional.",
    palette: { primary: "#1F4FFF", accent: "#39E6D4", ink: "#10131A", surface: "#F4F6FB" },
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
