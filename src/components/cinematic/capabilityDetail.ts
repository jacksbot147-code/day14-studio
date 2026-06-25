/**
 * cinematic/capabilityDetail — long-form content for each platform capability.
 *
 * Powers the /platform/[slug] detail pages. Keyed by the same `id`s as
 * CAPABILITIES in ./Capabilities (the homepage grid), so the card → page link
 * and the icon/title stay in one source of truth.
 *
 * CONTENT RULES (honesty rail): every claim here describes what a Day14 build
 * actually ships (marketing site, structured booking/quoting, magic-link
 * customer portal, Stripe-backed payments, auto-sequenced scheduling, the admin
 * app + inbox, a scoped AI assistant, transactional SMS/email). No invented
 * metrics, no fabricated customers. Pricing is never stated here — it lives in
 * pricing.ts and is shown only on the pricing section.
 */

export interface DetailStep {
  title: string;
  body: string;
}
export interface DetailFaq {
  q: string;
  a: string;
}
export interface DetailUseCase {
  vertical: string;
  example: string;
}

export interface CapabilityDetail {
  id: string;
  /** Short label above the page headline. */
  eyebrow: string;
  /** The page <h1> — a customer-facing promise, not the feature name. */
  headline: string;
  /** One- or two-sentence intro under the headline. */
  lede: string;
  /** The customer's pain this solves. */
  problem: { heading: string; body: string; bullets: string[] };
  /** How it actually works, in order. */
  how: DetailStep[];
  /** What's included. */
  features: string[];
  /** Concrete examples across the verticals Day14 serves. */
  useCases: DetailUseCase[];
  faqs: DetailFaq[];
  /** The payoff line that closes the page. */
  outcome: string;
  /** Related capability ids (rendered as cross-links). */
  related: string[];
  metaTitle: string;
  metaDescription: string;
}

export const CAPABILITY_DETAILS: readonly CapabilityDetail[] = [
  {
    id: "marketing-site",
    eyebrow: "Your front door",
    headline: "A site that turns strangers into booked jobs.",
    lede: "A fast, custom website on your own domain — built to win the customer who just Googled you, not just to exist.",
    problem: {
      heading: "The problem",
      body: "Most local businesses live on a Facebook page or a template that hasn't been touched in years. When a new customer hears your name and looks you up, they find a question mark — or your competitor's clean site — and the job is gone before you ever get the call.",
      bullets: [
        "No real website, or a dated one that loads slowly on a phone",
        "Facebook-only presence that you don't own and can't be found on Google",
        "No obvious way for a visitor to actually hire you",
        "Looks like a side hustle, not the operation you actually run",
      ],
    },
    how: [
      { title: "Custom design to your brand", body: "Not a drag-and-drop template — a page designed around your services, your work, and your area, so it looks like it came from a real studio." },
      { title: "On your own domain", body: "yourbusiness.com, hosted and maintained for you. You own the domain, the content, and the customer relationships." },
      { title: "Built for Google and phones", body: "Fast load times, mobile-first layout, and the SEO basics done right so you actually show up when someone searches your service near them." },
      { title: "One obvious next step", body: "Every visitor is guided to the thing that matters — request a quote, book, or call — instead of wandering off." },
    ],
    features: [
      "Custom, conversion-focused design",
      "Your own domain, hosted + maintained",
      "Mobile-first and fast (Core Web Vitals)",
      "Search-engine basics + Google Business alignment",
      "Click-to-call and one-tap directions",
      "Your services, photos, and reviews in one place",
      "Edits handled for you — text us the change",
    ],
    useCases: [
      { vertical: "Pool service", example: "Service areas, before/after photos, and a 'request weekly service' button front and center." },
      { vertical: "Lawn & landscaping", example: "Seasonal services with a clear estimate request — no more 'message us on Facebook.'" },
      { vertical: "Salon / spa", example: "Services, team, and a book-now flow that fills the calendar." },
      { vertical: "Restaurant / food", example: "Menu, hours, location, and order/reserve — the three things people search for." },
    ],
    faqs: [
      { q: "Do I own the site?", a: "Yes. Your domain, your content, your brand. You're not renting a template — and if you ever leave, it's yours." },
      { q: "How fast can it be live?", a: "Typically 7–14 days depending on tier, with the first months of ops included so it actually launches." },
      { q: "Can I make changes?", a: "Text or email the change and it's handled for you — no logging into a clunky builder." },
      { q: "What about SEO?", a: "The technical foundation (speed, structure, metadata) is built in, and ongoing upkeep is part of the monthly." },
    ],
    outcome: "When someone Googles you, they find a real business — and a clear way to hire you on the spot.",
    related: ["booking-quoting", "ai-assistant"],
    metaTitle: "Marketing site — a site that books jobs | Day14",
    metaDescription: "A fast, custom website on your own domain, built to turn the people who Google your service business into booked jobs. Live in days, edits handled for you.",
  },
  {
    id: "booking-quoting",
    eyebrow: "Capture every lead",
    headline: "Quoting that works while you're on a roof.",
    lede: "Structured online booking and quote requests that come in organized, 24/7 — so the lead that lands at 9pm is still there, and ready to act on, in the morning.",
    problem: {
      heading: "The problem",
      body: "You're on a job, your phone rings, it goes to voicemail, and the customer calls the next guy. Or the quote request is a vague text you can't act on. The work is there — it's just slipping through phone tag and a messy inbox.",
      bullets: [
        "Missed calls become missed jobs",
        "Quote requests arrive as half-formed texts and voicemails",
        "Customers want to act at 9pm; you can't answer until tomorrow",
        "No record of who asked for what, or when",
      ],
    },
    how: [
      { title: "A request form per service", body: "Each service has its own short, structured form — so you get the address, the job, and photos, not a one-line 'how much?'." },
      { title: "Instant confirmation", body: "The customer gets an immediate, branded reply so they know they're in your queue — no silence, no second-guessing." },
      { title: "Organized into your board", body: "The request lands in your admin board with everything attached: name, service, location, notes, photos — ready to quote." },
      { title: "Quote or book in a tap", body: "Set services can auto-book a slot; custom work becomes a clean quote you send back in seconds." },
    ],
    features: [
      "Service-specific intake forms",
      "Photo upload with the request",
      "Available 24/7, no phone tag",
      "Structured data (not freeform messages)",
      "Instant branded auto-reply",
      "Routes straight to the admin board",
      "Optional real-time self-booking for set services",
    ],
    useCases: [
      { vertical: "Pool service", example: "'Weekly service in 34102' with a photo of the pool — quoted before you're off the route." },
      { vertical: "HVAC", example: "A tune-up request with the unit photo and address, slotted into the day automatically." },
      { vertical: "Cleaning", example: "Recurring deep-clean request captured with square footage and rooms." },
      { vertical: "Salon", example: "Self-booking for standard services; consult requests for custom work." },
    ],
    faqs: [
      { q: "Is it instant booking or a request?", a: "Both. Standard services can auto-book a real slot; custom jobs come in as structured quote requests you approve." },
      { q: "Can customers attach photos?", a: "Yes — photos come in with the request, so you can quote accurately without a site visit." },
      { q: "Does it sync to my schedule?", a: "Yes. Accepted jobs flow straight into Scheduling and the route board." },
    ],
    outcome: "Every lead arrives organized and time-stamped — none of them slip to voicemail.",
    related: ["scheduling", "ai-assistant", "customer-portal"],
    metaTitle: "Online booking & quoting for service businesses | Day14",
    metaDescription: "Structured 24/7 booking and quote requests that arrive organized with photos and details — no more phone tag, no more lost leads. Flows straight into your schedule.",
  },
  {
    id: "customer-portal",
    eyebrow: "Customers serve themselves",
    headline: "Stop being the help desk for 'when are you coming?'",
    lede: "A private login where each customer sees their visits, history, and photo proof — and pays online — so they stop texting you for status and start trusting the system.",
    problem: {
      heading: "The problem",
      body: "Half your day is answering 'did you come yet?', 'when's my next visit?', and 'can I pay you?'. You become the human status page for every customer, and it never stops.",
      bullets: [
        "Constant texts asking about status and scheduling",
        "No proof a visit happened — disputes and re-dos",
        "Customers can't pay without you chasing them",
        "Everything lives in your phone, not a system",
      ],
    },
    how: [
      { title: "One-tap login", body: "Each customer gets a secure magic-link login — no app to download, no password to forget." },
      { title: "Their visits, on demand", body: "Upcoming visits, full history, and photo proof of completed work — they check it themselves instead of texting you." },
      { title: "Pay online", body: "Outstanding invoices are right there to pay by card or bank — see Payments." },
      { title: "Self-service requests", body: "Reschedule, add a service, or ask a question without a phone call." },
    ],
    features: [
      "Secure magic-link login (no app)",
      "Upcoming visits + full service history",
      "Photo proof on every completed visit",
      "Online invoice payment",
      "Self-service requests and changes",
      "Per-customer data isolation",
    ],
    useCases: [
      { vertical: "Pool service", example: "Visit log with chemical readings and a photo of the clean pool after each stop." },
      { vertical: "Cleaning", example: "A completed checklist and before/after photos the customer can see anytime." },
      { vertical: "Memberships / recurring", example: "Members see their plan, history, and next visit without calling the front desk." },
    ],
    faqs: [
      { q: "Do customers need an app?", a: "No. It's a web portal they reach with a magic link — works on any phone." },
      { q: "Is their information secure?", a: "Yes. Each customer only sees their own data, isolated from everyone else's." },
      { q: "Is it worth it for one-time customers?", a: "It's optional per customer — it shines for recurring routes and memberships where trust and repeat payment matter most." },
    ],
    outcome: "Fewer 'where are you?' texts, more trust, and faster payment — because customers can see the work and pay for it themselves.",
    related: ["payments-invoicing", "scheduling"],
    metaTitle: "Customer portal — visit history, photo proof, online pay | Day14",
    metaDescription: "Give customers a private login to see their visits, photo proof, and history — and pay online. Fewer status texts, more trust, faster payment.",
  },
  {
    id: "payments-invoicing",
    eyebrow: "Get paid, on time",
    headline: "Money shows up online — without you chasing it.",
    lede: "Stripe billing wired into your business from day one, so you invoice in a tap, customers pay by card or bank, and reminders go out on their own.",
    problem: {
      heading: "The problem",
      body: "You're chasing checks, fronting work, and re-sending invoices you wrote in a notebook. Customers who'd happily pay by card can't, so some of them just… don't, on time.",
      bullets: [
        "Chasing checks, cash, and late payers",
        "Invoices tracked in a notebook or your head",
        "No card option — so payment drags",
        "Manual reminders you forget to send",
      ],
    },
    how: [
      { title: "Your Stripe, your money", body: "Payments run through your own Stripe account — funds go straight to you. Day14 never holds your money." },
      { title: "Invoice from the job", body: "Turn a completed job into an invoice in one tap, with the line items already there." },
      { title: "Customer pays online", body: "Card or bank transfer (ACH), from the portal or a link — paid in seconds, not weeks." },
      { title: "Reminders run themselves", body: "Gentle automatic nudges go out until it's paid, so you never have to send the awkward 'just following up' text." },
    ],
    features: [
      "Stripe billing on your own account",
      "Card and ACH bank payments",
      "One-tap invoices from jobs",
      "Recurring / subscription billing for routes + memberships",
      "Automatic payment reminders",
      "Deposits and prepayment",
      "Full payment history in the admin app",
    ],
    useCases: [
      { vertical: "Pool / recurring routes", example: "Monthly recurring billing runs automatically — no re-invoicing every cycle." },
      { vertical: "Lawn / per-visit", example: "Invoice on completion; customer taps to pay before you've left the street." },
      { vertical: "Salon / spa", example: "Take deposits at booking to cut no-shows." },
    ],
    faqs: [
      { q: "Whose Stripe account is it?", a: "Yours. The money goes directly to your account — Day14 doesn't touch or hold funds." },
      { q: "What are the fees?", a: "Standard Stripe processing fees apply; there's no Day14 markup on payments." },
      { q: "Can I bill recurring customers automatically?", a: "Yes — subscriptions for routes and memberships bill on schedule with no manual work." },
      { q: "How do refunds work?", a: "Issue them from your dashboard like any Stripe payment." },
    ],
    outcome: "Invoices get paid online and on time, because paying you is finally as easy as tapping a link.",
    related: ["customer-portal", "admin-app"],
    metaTitle: "Payments & invoicing for service businesses (Stripe) | Day14",
    metaDescription: "Stripe billing wired into your business: one-tap invoices, card and bank payment, recurring billing, and automatic reminders. Your account, your money, paid on time.",
  },
  {
    id: "scheduling",
    eyebrow: "Run the day",
    headline: "Your day, sequenced for you.",
    lede: "Jobs land on a board and get ordered automatically by location and density — less windshield time, no double-booking, and every crew knows exactly where to be.",
    problem: {
      heading: "The problem",
      body: "The route lives in your head or a notebook. You backtrack across town, squeeze in a job you shouldn't have, and your crew texts you all morning asking what's next.",
      bullets: [
        "Routes planned from memory; lots of backtracking",
        "Double-bookings and jobs that don't fit the day",
        "New requests don't slot in cleanly",
        "Crews unsure where to go next",
      ],
    },
    how: [
      { title: "Jobs land on a board", body: "Accepted bookings and recurring visits show up on a single day/week board automatically." },
      { title: "Auto-sequenced by density", body: "Stops are ordered by proximity so you spend the day working, not driving across town and back." },
      { title: "Assign crews", body: "Split the board across techs or crews; everyone gets their own list." },
      { title: "Mobile day-view", body: "Each tech sees their stops, addresses, and notes on their phone — and status updates flow back to you." },
    ],
    features: [
      "Job + route board (day / week)",
      "Automatic sequencing by location density",
      "Crew assignment and splitting",
      "Recurring schedules for routes + memberships",
      "Mobile day-view for techs",
      "Live status tracking",
      "Calendar sync",
    ],
    useCases: [
      { vertical: "Pool service", example: "A 12-stop route auto-ordered by neighborhood so the truck never doubles back." },
      { vertical: "Lawn / multi-crew", example: "Two crews, two boards, both sequenced — assigned in seconds." },
      { vertical: "HVAC", example: "Dispatch tune-ups and emergency calls into the same optimized day." },
    ],
    faqs: [
      { q: "Can it handle multiple crews?", a: "Yes — assign and split the board across as many crews as you run." },
      { q: "Does it optimize driving?", a: "It sequences stops by proximity and density to cut backtracking and windshield time." },
      { q: "Do my techs need anything special?", a: "Just their phone — they get a mobile day-view of their stops." },
    ],
    outcome: "Less driving, no double-booking, and everyone knows where to be — without you running dispatch from your truck.",
    related: ["admin-app", "booking-quoting"],
    metaTitle: "Scheduling & route board for field-service teams | Day14",
    metaDescription: "Jobs auto-sequenced by location and density, crews assigned in seconds, and a mobile day-view for every tech. Less driving, no double-booking.",
  },
  {
    id: "admin-app",
    eyebrow: "The operator cockpit",
    headline: "Run the whole operation from one screen.",
    lede: "Jobs, customers, payments, schedule, and messages in a single dashboard — with an inbox that surfaces only the things that actually need a human decision.",
    problem: {
      heading: "The problem",
      body: "You're the integration between five tools that don't talk to each other — a booking inbox, a spreadsheet, a notebook, a payment app, and your texts. Nothing lines up, and you're the only one who knows where anything is.",
      bullets: [
        "Five disconnected tools and a spreadsheet",
        "No single view of the business",
        "Important things buried in notifications",
        "Only you know how it all fits together",
      ],
    },
    how: [
      { title: "One dashboard", body: "Jobs, customer records, payments, the schedule, and messages all in one place — not five tabs." },
      { title: "An inbox that filters for you", body: "Most things run on their own; the inbox surfaces only what needs your call — approve, quote, reschedule." },
      { title: "Act in a tap", body: "Approve a job, send an invoice, reschedule a visit — without leaving the screen." },
      { title: "Everything logged", body: "A clean record of what happened and when, so nothing lives only in your memory." },
    ],
    features: [
      "Unified dashboard (jobs, customers, payments, schedule)",
      "Customer CRM with full history",
      "Jobs and pipeline view",
      "The inbox — only what needs you",
      "Reporting on revenue and activity",
      "Team access with roles",
      "Works on desktop and mobile",
    ],
    useCases: [
      { vertical: "Solo operator", example: "Your morning is one screen: three things to approve, then the day runs itself." },
      { vertical: "Small team", example: "Office staff and techs get role-based access to exactly what they need." },
      { vertical: "Multi-service business", example: "Pool, cleaning, and pressure-washing lines managed from the same cockpit." },
    ],
    faqs: [
      { q: "Does it replace Jobber or QuickBooks?", a: "It covers the core day-to-day in one place and integrates where you need specialized tools — so you stop stitching them together by hand." },
      { q: "Can my team have logins?", a: "Yes, with roles so people see only what's relevant to them." },
      { q: "Is it usable on a phone?", a: "Yes — the cockpit and the inbox work on mobile for when you're in the field." },
    ],
    outcome: "One screen instead of five tabs and a notebook — the business finally fits in a single view.",
    related: ["scheduling", "payments-invoicing", "ai-assistant"],
    metaTitle: "Admin app — run your whole service business from one screen | Day14",
    metaDescription: "A single dashboard for jobs, customers, payments, and scheduling, plus an inbox that surfaces only what needs your decision. The operator cockpit.",
  },
  {
    id: "ai-assistant",
    eyebrow: "Never miss a question",
    headline: "Answers customers and books jobs while you work.",
    lede: "A site assistant trained on your services, areas, and how you work — answering visitors 24/7 and capturing the ones ready to book, then handing the real conversations to you.",
    problem: {
      heading: "The problem",
      body: "Questions come in at all hours — 'do you service my area?', 'are you open?', 'can you do this?' — and you can't answer from a job site. By the time you do, the lead has cooled or called someone else.",
      bullets: [
        "Questions arrive at all hours, you can't always reply",
        "Repetitive FAQs eat your evenings",
        "Leads cool off waiting for an answer",
        "After-hours visitors leave without a next step",
      ],
    },
    how: [
      { title: "Trained on your business", body: "It knows your services, your service area, your hours, and how you like to work — configured from real information, not guesses." },
      { title: "Answers 24/7", body: "Visitors get accurate answers on your site any time of day, in plain language." },
      { title: "Captures and books", body: "When someone's ready, it collects what's needed and books or stages the lead so it's waiting for you." },
      { title: "Hands off with context", body: "Real conversations come to you with the full thread, so you pick up where it left off." },
    ],
    features: [
      "Site chat assistant trained on your business",
      "24/7 after-hours coverage",
      "Lead capture and booking hand-off",
      "Plain-language answers to common questions",
      "Escalation to you with full context",
      "Scoped to your info — it won't invent prices or services",
    ],
    useCases: [
      { vertical: "Pool service", example: "'Do you service Bonita Springs?' answered instantly, with a quote request started if yes." },
      { vertical: "Restaurant", example: "'Are you open Monday? Do you cater?' handled without tying up the phone." },
      { vertical: "Salon", example: "'Do you do balayage, and what's the wait?' — answered, then booked." },
    ],
    faqs: [
      { q: "Will it make things up?", a: "No. It only answers from what you've configured — it won't quote a price you didn't set or promise a service you don't offer." },
      { q: "Does it replace me?", a: "No. It handles the repetitive questions and books the easy ones, then hands genuine conversations to you with context." },
      { q: "Can it speak to non-English customers?", a: "Yes, language support is configurable for your area." },
    ],
    outcome: "A tireless front desk that never sleeps and never lets a ready-to-book customer slip away.",
    related: ["booking-quoting", "marketing-site"],
    metaTitle: "AI assistant — answer customers & book jobs 24/7 | Day14",
    metaDescription: "A site assistant trained on your services and areas that answers customers around the clock and books the ready ones — then hands real conversations to you.",
  },
  {
    id: "sms-email",
    eyebrow: "Nothing slips",
    headline: "Reminders and follow-ups that send themselves.",
    lede: "Automated, on-brand texts and emails — appointment reminders, on-my-way notices, follow-ups, and review requests — so no-shows drop and good jobs turn into reviews.",
    problem: {
      heading: "The problem",
      body: "No-shows cost you slots you can't get back. Follow-ups never happen because you're busy. And the happy customer who'd leave a five-star review never gets asked.",
      bullets: [
        "No-shows from forgotten appointments",
        "Follow-ups and re-bookings that never get sent",
        "Manual 'you're due for service' texts you skip",
        "Reviews you earned but never asked for",
      ],
    },
    how: [
      { title: "Appointment reminders", body: "Automatic reminders before each visit cut no-shows without you lifting a finger." },
      { title: "On-the-way and done notices", body: "Customers get an 'on my way' and a 'completed' message — fewer questions, more trust." },
      { title: "Follow-ups and re-booking", body: "Timed nudges bring recurring customers back ('your lawn's due', 'time to re-book')." },
      { title: "Review requests", body: "After a completed, paid job, a request to review goes out while you're still top of mind." },
    ],
    features: [
      "Automated appointment reminders",
      "On-the-way + job-complete notifications",
      "Follow-up and re-booking nudges",
      "Review requests after completed work",
      "Receipts and payment confirmations",
      "Broadcasts for seasonal offers",
      "Sent from your brand",
    ],
    useCases: [
      { vertical: "Pool / seasonal", example: "An automatic 'time to re-open the pool' nudge to last year's customers." },
      { vertical: "Lawn", example: "'Your lawn's due for service this week' — re-booking without a phone call." },
      { vertical: "Salon", example: "Reminders the day before cut no-shows; a rebooking nudge keeps the chair full." },
    ],
    faqs: [
      { q: "Do messages come from my brand?", a: "Yes — they're branded as your business, not a generic service." },
      { q: "Won't this feel spammy?", a: "Messages are transactional and opt-in — reminders, confirmations, and timely follow-ups, not blasts." },
      { q: "Can I send a seasonal offer to everyone?", a: "Yes, you can broadcast to your customer list when it makes sense." },
    ],
    outcome: "No-shows drop, recurring customers come back on their own, and happy jobs turn into reviews — automatically.",
    related: ["customer-portal", "scheduling"],
    metaTitle: "Automated SMS & email — reminders, follow-ups, reviews | Day14",
    metaDescription: "On-brand automated texts and emails: appointment reminders that cut no-shows, follow-ups that re-book customers, and review requests after good jobs.",
  },
];

export function getCapabilityDetail(slug: string): CapabilityDetail | undefined {
  return CAPABILITY_DETAILS.find((d) => d.id === slug);
}
