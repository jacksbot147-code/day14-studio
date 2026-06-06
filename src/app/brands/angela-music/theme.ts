// Brand theme + content for Angela Currier — in-home music lessons in Naples FL.
// Single-page Spark tier site. Voice = Angela's (I, not we).
// Designed to be the best local-tutoring site on the internet.

export const brandTheme = {
  slug: "angela-music",
  displayName: "Angela Currier",
  brandName: "Naples Music Lessons",
  tagline: "Music lessons that come to you.",
  serviceArea: "Naples · Bonita Springs · Marco Island · Estero",
  colors: {
    primary: "#7C3AED", // warm violet
    secondary: "#A855F7",
    accent: "#F59E0B", // amber CTA
    bg: "#FAF7F2", // warm cream
    surface: "#FFFFFF",
    text: "#1F1A2E", // deep plum-black
    muted: "#6B6480",
    softTint: "#F3EBFF", // very pale violet for section backgrounds
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
  bestFor: string;
}

export const lessons: Lesson[] = [
  {
    duration: "30 minutes",
    price: "$55",
    bestFor: "Ages 5–8 · brand new",
    blurb:
      "Focused, manageable, builds the habit without burning anyone out. Your child finishes the lesson wanting more.",
  },
  {
    duration: "45 minutes",
    price: "$75",
    bestFor: "Ages 9+ · most parents pick this",
    blurb:
      "Long enough for warm-ups, real work on a piece, and a check-in. The sweet spot for actual progress.",
  },
  {
    duration: "60 minutes",
    price: "$95",
    bestFor: "Teens · auditions, recitals, ambition",
    blurb:
      "For students preparing for auditions, school band placement, recitals, or anyone who wants to move faster.",
  },
];

export interface Instrument {
  name: string;
  blurb: string;
  symbol: string;
}

export const instruments: Instrument[] = [
  { name: "Piano", symbol: "♩", blurb: "Classical fundamentals or pop favorites — your call." },
  { name: "Guitar", symbol: "♫", blurb: "Acoustic, electric, or bass. Chords to lead lines." },
  { name: "Voice", symbol: "♪", blurb: "Healthy technique, audition prep, performance coaching." },
  { name: "Drums", symbol: "♬", blurb: "Rudiments, kit time, real songs from day one." },
  { name: "Strings", symbol: "♭", blurb: "Violin, viola, cello fundamentals." },
  { name: "Theory & Reading", symbol: "♮", blurb: "Note reading, ear training, music theory — bundle with any instrument." },
];

export interface FaqItem {
  q: string;
  a: string;
}

export const faqs: FaqItem[] = [
  {
    q: "Where do lessons happen?",
    a: "I come to you. Lessons are in your home anywhere in Naples, Bonita Springs, Marco Island, or Estero. No driving the kids around after school.",
  },
  {
    q: "What ages do you teach?",
    a: "Kids and teens, roughly 5 to 18. The youngest students start with 30-minute lessons; we move to 45 or 60 as attention spans grow.",
  },
  {
    q: "What if my child doesn't have an instrument yet?",
    a: "Tell me on the first call. I'll point you to the right starter instrument and where to rent or buy it — no commission, no upsell. We can also start lessons with a borrowed instrument and decide together after a few weeks.",
  },
  {
    q: "What if my child wants to quit?",
    a: "I'd rather know early than have you feel stuck. We talk about it together. Sometimes a small change — switching instruments, changing lesson day, picking a song they actually want to play — turns the whole thing around. If they truly don't want to play, you don't owe me a continuation. Pay-per-lesson means you can stop any time, no contract.",
  },
  {
    q: "Do you do recitals?",
    a: "Yes — informal student recitals twice a year, usually one in spring and one in winter. Optional, never pressured. Performance is a real outcome but it's a gift to the student, not a chore.",
  },
  {
    q: "What about snowbird families?",
    a: "I work with seasonal Naples families regularly. We can pause and resume your slot when you're back. Just let me know in advance. I'll hold your spot through April if you're paid current at season's end.",
  },
  {
    q: "Do you offer sibling discounts?",
    a: "Yes. Second child is 10% off the recurring rate, third is 15%. We can also stack siblings into one back-to-back lesson hour if that's easier on your schedule.",
  },
  {
    q: "How far in advance do I need to book?",
    a: "For a regular weekly slot, the sooner the better — I cap at about 25 active students and the popular after-school times go first. For a one-off trial lesson, usually within the week.",
  },
  {
    q: "How do I book a first lesson?",
    a: "Tap the phone button up top, send a text, fill out the short form below, or email me directly. I reply same day and we'll find a time that fits.",
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
    body: "Piano, guitar, voice, drums, strings, theory. If a sibling wants to switch or add, no new teacher hunt.",
  },
];

// First-30-days timeline — concrete progression removes parent uncertainty.
export const firstMonth = [
  {
    week: "Week 1",
    title: "The first lesson",
    body: "I come to your home, meet your child, set up the instrument together. By the end of the lesson they can play one short thing they didn't know how to play that morning. Parents are welcome to watch.",
  },
  {
    week: "Week 2",
    title: "The first real song",
    body: "We pick a song your child actually likes — a movie theme, a pop melody, something they'll hum at dinner. Practice habit takes shape: 15–20 minutes a day for younger kids, 30+ for teens.",
  },
  {
    week: "Week 3",
    title: "The check-in",
    body: "Quick conversation with you about what's working and what's not. We adjust if needed. I'll show you what your child can already do compared to week 1.",
  },
  {
    week: "Week 4",
    title: "The performance moment",
    body: "By the end of the month, your child can play a complete song for the family. They might even ask to. This is when most parents text me saying \"okay, this is sticking.\"",
  },
];

// Service area — list-style. Add neighborhoods to feel hyper-local.
export const serviceArea = {
  cities: ["Naples", "Bonita Springs", "Marco Island", "Estero"],
  neighborhoods: [
    "Pelican Bay",
    "Park Shore",
    "Pine Ridge",
    "Aqualane Shores",
    "Old Naples",
    "Vineyards",
    "Lely",
    "Pelican Marsh",
    "Mediterra",
    "Quail West",
    "Tiburón",
    "Grey Oaks",
  ],
};

// Anti-objection — addresses the real reasons parents hesitate.
export const objections = [
  {
    title: "What if my kid is too young to focus for 30 minutes?",
    body: "They probably will be, for a while. I plan younger lessons in 5-minute mini-blocks — instrument, ear-training game, song work, theory snippet — so attention resets naturally. Most 5- and 6-year-olds get there inside a month.",
  },
  {
    title: "What if I have no musical background to help them practice?",
    body: "You don't need one. I leave each lesson with a one-line note for you: \"This week, ask them to play X 3 times before dinner.\" That's the whole parent role. No theory required.",
  },
  {
    title: "What if my kid quits after a month?",
    body: "Pay-per-lesson, no contract — you stop any time. Before you do, talk to me. Most quits I've seen are fixable with a small change (different song, different day, different instrument). Sometimes the answer really is \"this isn't for them\" and I'll tell you that too.",
  },
  {
    title: "What if we travel a lot?",
    body: "I'm used to Naples schedules. Up to 4 missed lessons a year with 48-hour notice are reschedulable, no charge. Beyond that, snowbird policy kicks in — I hold your slot at no cost as long as you're paid current through your absence.",
  },
];

// Testimonial structure — Angela fills these in with real parent quotes.
// Until then, intentional empty-state cards that read as "coming soon" elegantly.
export const testimonials = [
  {
    quote: "",
    parent: "",
    student: "",
    instrument: "",
    placeholder: true,
  },
  {
    quote: "",
    parent: "",
    student: "",
    instrument: "",
    placeholder: true,
  },
  {
    quote: "",
    parent: "",
    student: "",
    instrument: "",
    placeholder: true,
  },
];

// Trust strip — numbers Angela fills in. Sensible placeholder defaults.
export const trustStats = [
  { value: "12+", label: "Years teaching" },
  { value: "200+", label: "Students taught" },
  { value: "20+", label: "Recital performances" },
  { value: "Same-day", label: "Reply window" },
];

// Contact placeholders — Jack swaps in real cell + email when Angela sends them.
export const contact = {
  phone: "(239) 000-0000", // TODO: swap with Angela's real number
  phoneHref: "tel:+12390000000",
  email: "angela@naplesmusiclessons.com", // TODO: swap with real email
  emailHref: "mailto:angela@naplesmusiclessons.com",
  sms: "sms:+12390000000",
};
