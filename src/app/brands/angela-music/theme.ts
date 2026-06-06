// Brand theme + content for Angela Currier — in-home music lessons in Naples FL.
// Single-page Spark tier site. Voice = Angela's (I, not we).

export const brandTheme = {
  slug: "angela-music",
  displayName: "Angela Currier",
  brandName: "Naples Music Lessons",
  tagline: "Music lessons that come to you.",
  serviceArea: "Naples · Bonita Springs · Marco Island · Estero",
  colors: {
    primary: "#7C3AED", // warm violet — sophisticated, music-coded
    secondary: "#A855F7",
    accent: "#F59E0B", // amber for CTAs
    bg: "#FAF7F2", // warm cream
    surface: "#FFFFFF",
    text: "#1F1A2E", // deep plum-black
    muted: "#6B6480",
  },
  fonts: {
    heading: "'Playfair Display', Georgia, serif",
    body: "'Inter', system-ui, -apple-system, sans-serif",
  },
};

export interface Lesson {
  duration: string;
  price: string;
  blurb: string;
}

export const lessons: Lesson[] = [
  {
    duration: "30 minutes",
    price: "$55",
    blurb:
      "A great fit for younger students (5–8) and anyone just getting started. Focused, manageable, builds the habit without burning anyone out.",
  },
  {
    duration: "45 minutes",
    price: "$75",
    blurb:
      "My most-requested slot. Long enough for warm-ups, real work on a piece, and a check-in. Good for ages 9 and up.",
  },
  {
    duration: "60 minutes",
    price: "$95",
    blurb:
      "For teens preparing for auditions, school band placement, recitals, or any student who wants to move faster. Deep practice time with room to explore.",
  },
];

export interface Instrument {
  name: string;
  blurb: string;
  emoji: string;
}

export const instruments: Instrument[] = [
  {
    name: "Piano",
    emoji: "🎹",
    blurb: "Classical fundamentals or pop favorites — your call.",
  },
  {
    name: "Guitar",
    emoji: "🎸",
    blurb: "Acoustic, electric, or bass. Chords to lead lines.",
  },
  {
    name: "Voice",
    emoji: "🎤",
    blurb: "Healthy technique, audition prep, performance coaching.",
  },
  {
    name: "Drums",
    emoji: "🥁",
    blurb: "Rudiments, kit time, real songs.",
  },
  {
    name: "Strings",
    emoji: "🎻",
    blurb: "Violin, viola, cello fundamentals.",
  },
  {
    name: "Theory & Reading",
    emoji: "🎼",
    blurb: "Note reading, ear training, music theory — bundle with any instrument.",
  },
];

export interface FaqItem {
  q: string;
  a: string;
}

export const faqs: FaqItem[] = [
  {
    q: "Where do lessons happen?",
    a: "I come to you. Lessons are in your home, anywhere in Naples, Bonita Springs, Marco Island, or Estero. No driving the kids around after school.",
  },
  {
    q: "What ages do you teach?",
    a: "Kids and teens, roughly 5 to 18. The youngest students start with 30-minute lessons; we move to 45 or 60 as attention spans grow.",
  },
  {
    q: "What if my child doesn't have an instrument yet?",
    a: "Tell me on the first call. I'll point you to the right starter instrument and where to rent or buy it — no commission, no upsell.",
  },
  {
    q: "Do you do recitals?",
    a: "Yes — informal student recitals a couple times a year. Optional, never pressured. Performance is a real outcome, but it's a gift to the student, not a chore.",
  },
  {
    q: "What about snowbird families?",
    a: "I work with seasonal Naples families regularly. We can pause and resume your slot when you're back. Just let me know in advance.",
  },
  {
    q: "How do I book a first lesson?",
    a: "Tap the phone button up top, send a text, or fill out the short form below. I'll reply same day and we'll find a time that fits your schedule.",
  },
];

export const whyMe = [
  {
    title: "Every lesson in your home",
    body: "Naples traffic is real. I come to you so the lesson actually happens — no driving, no rushing.",
  },
  {
    title: "Transparent pricing",
    body: "Prices on the site, no hidden fees, no commitment contracts. Pay per lesson or month at a time.",
  },
  {
    title: "Built for kids and teens",
    body: "I teach the way I'd want my own kids taught: warm, patient, with real progress every week.",
  },
  {
    title: "All instruments under one teacher",
    body: "Piano, guitar, voice, drums, strings, theory. If a sibling wants to switch or add an instrument, no new teacher search.",
  },
];

// Contact placeholders — Jack swaps in real cell + email when Angela sends them.
export const contact = {
  phone: "(239) 000-0000", // TODO: swap with Angela's real number
  phoneHref: "tel:+12390000000", // TODO: swap with Angela's real number
  email: "angela@naplesmusiclessons.com", // TODO: swap with real email
  emailHref: "mailto:angela@naplesmusiclessons.com",
};
