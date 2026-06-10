// Brand theme + content for Angela Currier — Currier Music · Naples FL.
// Single-page Spark tier site. Voice = Angela's (I, not we).
//
// Content rule: ONLY what was confirmed on the call. No invented
// testimonials, no invented neighborhood lists, no invented student
// counts. Placeholders for missing inputs (phone, email, photo, exact
// pricing) marked with TODO comments — Jack swaps when Angela sends them.
import type { BrandTheme } from "@/components/brand/theme";

export const brandTheme = {
  slug: "angela-music",
  displayName: "Angela Currier",
  brandName: "Currier Music",
  tagline: "Private music lessons in Naples — ages 3 to retired.",
  serviceArea: "Berkshire base · Southwest Florida · 20-mile range",
  // Calm forest-green palette. No yellow, no neon — per Angela's note.
  // Stands out without shouting. Reads as "warm, trustworthy, local."
  colors: {
    primary: "#16544a",      // deep forest green
    secondary: "#0f766e",    // teal accent
    accent: "#b45309",       // warm amber (used SPARINGLY for CTA only — not the headline)
    bg: "#faf8f3",           // warm cream paper
    surface: "#ffffff",
    text: "#1a1f1d",         // deep ink with green undertone
    muted: "#5c6660",        // warm gray-green
    softTint: "#eef4f1",     // very pale sage for section backgrounds
  },
  fonts: {
    heading: "'Playfair Display', Georgia, serif",
    body: "'Inter', system-ui, -apple-system, sans-serif",
  },
} satisfies BrandTheme;

// Three lesson lengths. Prices intentionally "TBD" until Angela confirms.
// The page displays them as "text for current rates" rather than fake
// numbers — honest beats wishful.
export interface Lesson {
  duration: string;
  bestFor: string;
  blurb: string;
}

export const lessons: Lesson[] = [
  {
    duration: "30 minutes",
    bestFor: "Younger students · brand new",
    blurb: "Focused, manageable, builds the habit without burning anyone out.",
  },
  {
    duration: "45 minutes",
    bestFor: "Most students",
    blurb: "Long enough for warm-ups, real work on a piece, and a check-in.",
  },
  {
    duration: "60 minutes",
    bestFor: "Adults, teens, recital prep",
    blurb: "For students preparing for auditions, recitals, or anyone who wants to move faster.",
  },
];

// What Angela teaches. Kept simple — she described it as "most instruments,
// customized." Listing the most common four; "and more" covers everything else.
export interface Instrument {
  name: string;
  blurb: string;
}

export const instruments: Instrument[] = [
  { name: "Piano",  blurb: "Classical fundamentals or pop favorites — your call." },
  { name: "Guitar", blurb: "Acoustic, electric, or bass. Chords to lead lines." },
  { name: "Voice",  blurb: "Healthy technique, performance coaching." },
  { name: "Theory & Reading", blurb: "Note reading, ear training, music theory — bundle with any instrument." },
];

// Four short, real FAQs — drawn from the call notes. No fabricated answers.
export interface FaqItem {
  q: string;
  a: string;
}

export const faqs: FaqItem[] = [
  {
    q: "What ages do you teach?",
    a: "Ages 3 to retired. I customize everything to the student — a 3-year-old's lesson looks nothing like a 60-year-old's, and that's the point.",
  },
  {
    q: "Where do lessons happen?",
    a: "I'm based in Berkshire (Naples) and travel up to 20 miles. There's a $15 travel fee for lessons outside Berkshire (negotiable for longer-distance regulars).",
  },
  {
    q: "How does scheduling work?",
    a: "Week-by-week. I tailor everything on the phone — your child's energy, your family's schedule, what's coming up. I keep my caseload small on purpose (around 30 active students) so each one gets real attention.",
  },
  {
    q: "How do I book a first lesson?",
    a: "Text or email me using the form below. I reply same day and we'll find a time that fits.",
  },
];

// Contact placeholders — Jack swaps in real cell + email when Angela sends them.
export const contact = {
  phone: "(239) 000-0000", // TODO: swap with Angela's real number
  phoneHref: "tel:+12390000000",
  email: "angela@curriermusic.com", // TODO: swap with real email
  emailHref: "mailto:angela@curriermusic.com",
  sms: "sms:+12390000000",
};

// Service-area sentence — kept conversational, not a city list.
export const serviceArea = {
  homeBase: "Berkshire (Naples)",
  range: "20 miles",
  travelFee: "$15 outside Berkshire",
  servesBroadly: "Southwest Florida",
};
