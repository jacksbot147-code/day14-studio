// Brand theme + content for Kennum Lawn Care.
// Hand-built service-business site — content is inlined so it renders fully
// on Vercel with no runtime filesystem or API dependency.
import type { BrandTheme } from "@/components/brand/theme";

export const brandTheme = {
  slug: "kennum-lawn-care",
  displayName: "Kennum Lawn Care",
  tagline: "A Southwest Florida yard, handled.",
  colors: {
    primary: "#1F6B3A",
    secondary: "#2F8F4E",
    accent: "#E7DEC6",
    bg: "#F7F9F4",
    surface: "#FFFFFF",
    text: "#1C2419",
    muted: "#5C6657",
  },
  fonts: {
    heading: "'Poppins', system-ui, -apple-system, sans-serif",
    body: "'Inter', system-ui, -apple-system, sans-serif",
  },
} satisfies BrandTheme;

export interface Service {
  title: string;
  price: string;
  blurb: string;
  detail: string;
}

export const services: Service[] = [
  {
    title: "Weekly Lawn Maintenance",
    price: "from $140 / month",
    blurb: "Mowing, edging, line-trimming, and blow-down on a dependable weekly route.",
    detail:
      "The core service. The same crew comes the same day every week — mows, edges every bed and walkway, trims, and blows the clippings clear. Billed at a flat monthly rate so you always know the number.",
  },
  {
    title: "Landscape Design & Installation",
    price: "from $850 / project",
    blurb: "Plant beds, sod, and clean borders designed for the Southwest Florida climate.",
    detail:
      "New beds, fresh sod, and hardscape borders chosen to thrive in SWFL heat and rain. We design it, source it, and install it — then your weekly crew keeps it looking that way.",
  },
  {
    title: "Mulch & Bed Maintenance",
    price: "from $350 / project",
    blurb: "Fresh mulch, weeding, and crisp bed edges that hold up through rain season.",
    detail:
      "A full refresh of every planting bed: weeded, re-edged, and topped with fresh mulch. The fastest way to make an entire property look cared-for.",
  },
  {
    title: "Tree & Shrub Trimming",
    price: "from $180 / visit",
    blurb: "Shaping and thinning to keep palms, hedges, and ornamentals healthy.",
    detail:
      "Hand-shaping of hedges, ornamentals, and smaller palms — thinned for airflow and cut for shape, not just hacked back. Heavier and tall-palm work is quoted per property.",
  },
  {
    title: "Seasonal Cleanup",
    price: "from $220 / visit",
    blurb: "Storm prep, debris haul-off, and a full property reset.",
    detail:
      "Before storm season or after a blow-through: debris cleared and hauled off, beds reset, and the whole property brought back to a clean baseline.",
  },
  {
    title: "Irrigation Check & Tune-Up",
    price: "from $120 / visit",
    blurb: "Zone-by-zone inspection, head adjustment, and leak fixes.",
    detail:
      "We run every zone, straighten and adjust heads, fix obvious leaks, and flag anything bigger before it wastes water or browns the lawn.",
  },
];

export const whyUs = [
  {
    title: "We actually show up",
    body: "Same crew, same day, every week. You stop chasing a lawn guy.",
  },
  {
    title: "Built for SWFL yards",
    body: "St. Augustine grass, rainy-season growth, storm debris — we plan around all of it.",
  },
  {
    title: "One flat quote",
    body: "Free custom quotes. Recurring maintenance billed monthly, no surprise charges.",
  },
  {
    title: "Easy to deal with",
    body: "Quotes, scheduling, and updates by text and email. No phone tag.",
  },
];
