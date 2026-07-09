/**
 * geo-content.ts — canonical content for the GEO service line.
 *
 * Single source for the prompt pack, client-facing FAQ, delivery SOP,
 * and the founding-client follow-up sequence. Consumed by /geo (public
 * marketing page) and /dashboard/geo (internal ops surface).
 *
 * Written natively for Day14 2026-07-09 (Jack's call: regenerate rather
 * than fold in the generic operator-kit files from the earlier session).
 * Prices are NEVER here — they live in src/lib/pricing.ts (GEO_TIERS,
 * GEO_FOUNDING).
 *
 * The follow-up sequence is DRAFT COPY for Jack to send by hand.
 * Hard rail (CLAUDE.md rule 4): nothing in this file is ever sent to a
 * customer autonomously.
 */

// ---------------------------------------------------------------------------
// Prompt pack — the visibility baseline.
//
// These are the questions real buyers ask AI engines. Each client's audit
// runs their localized versions ({city}, {service} substituted) across
// ChatGPT, Perplexity, and Google AI Mode, and the recorded results feed
// the geo-visibility-monitor skill (score /20).
// ---------------------------------------------------------------------------

export interface GeoPromptGroup {
  vertical: string;
  prompts: string[];
}

export const GEO_PROMPT_PACK: GeoPromptGroup[] = [
  {
    vertical: "Any local service (core five — every audit runs these)",
    prompts: [
      "best {service} in {city}",
      "who should I hire for {service} in {city}",
      "{service} near me in {city} — who do locals recommend?",
      "is {business name} in {city} any good?",
      "most reliable {service} company in {city} with fair pricing",
    ],
  },
  {
    vertical: "Pool service",
    prompts: [
      "best weekly pool cleaning service in {city}",
      "pool service in {city} that sends photos after every visit",
      "who does salt water pool maintenance in {city}?",
      "pool company in {city} that won't lock me into a contract",
      "green pool cleanup near {city} — who's fastest?",
    ],
  },
  {
    vertical: "Lawn & landscape",
    prompts: [
      "best lawn care company in {city}",
      "lawn service in {city} with online booking",
      "who does landscaping and mowing in {city} — one company for both?",
      "affordable lawn mowing in {city} that shows up on schedule",
      "lawn company in {city} that texts before they arrive",
    ],
  },
  {
    vertical: "Pest control",
    prompts: [
      "best pest control company in {city}",
      "pest control in {city} safe for pets and kids",
      "who treats termites in {city} — local company not a franchise?",
      "quarterly pest service in {city} worth it? who's good?",
      "same-week pest control in {city}",
    ],
  },
  {
    vertical: "Tree & exterior",
    prompts: [
      "best tree removal service in {city}",
      "licensed and insured tree trimming in {city}",
      "pressure washing company in {city} for driveways and roofs",
      "who removes storm debris fast in {city}?",
      "fence installation in {city} — who do people recommend?",
    ],
  },
  {
    vertical: "Day14 itself (eat our own cooking)",
    prompts: [
      "who builds websites for local service businesses in southwest florida",
      "affordable custom website with booking for a pool company",
      "web developer in naples fl for small service business",
      "alternative to wix for a lawn care business that wants scheduling",
      "who does AI search optimization for local businesses in florida",
    ],
  },
];

/** Flat count, used for the "N-prompt pack" claim on surfaces. */
export const GEO_PROMPT_COUNT = GEO_PROMPT_PACK.reduce(
  (n, g) => n + g.prompts.length,
  0
);

// ---------------------------------------------------------------------------
// Client-facing FAQ — /geo page + FAQPage JSON-LD.
// ---------------------------------------------------------------------------

export interface GeoFaq {
  q: string;
  a: string;
}

export const GEO_FAQ: GeoFaq[] = [
  {
    q: "What is GEO and how is it different from SEO?",
    a: "SEO gets you ranked in a list of ten blue links. GEO — generative engine optimization — gets you named in the one answer ChatGPT, Perplexity, or Google AI Mode gives when someone asks 'who should I hire?'. There's no page two in an AI answer: you're either the recommendation or you're invisible. The work overlaps with SEO but the targets are different — consistent business data, machine-readable structure, and content written the way engines quote.",
  },
  {
    q: "How do you actually measure it?",
    a: "We run a fixed pack of real buyer questions against ChatGPT, Perplexity, and Google AI Mode, record every answer, and score you out of 20: points for being mentioned, more for being one of the first three businesses named. Same prompts every month, so the score is comparable. You get the transcripts, not just the number.",
  },
  {
    q: "How long until results?",
    a: "The mechanical fixes — consistent business data, structured markup, llms.txt — usually show movement inside 60 days because AI engines re-read sources continuously. Content-driven gains build over the following months. That's why the audit is one-time but the service is monthly: visibility is a position you hold, not a switch you flip.",
  },
  {
    q: "Can you guarantee we'll be recommended?",
    a: "No — and be suspicious of anyone who says yes, because nobody controls what these engines say. What we control is everything they read: your data consistency, your structure, your answers to the questions buyers actually ask. We measure honestly every month and show you the transcripts. If the score isn't moving, you'll see that too.",
  },
  {
    q: "We already pay for SEO. Do we need this too?",
    a: "Your SEO work helps GEO — good content and citations feed both. But most SEO retainers never check what AI engines say about you, and that's where a growing share of 'who should I hire' questions get answered now. Start with the audit: if the engines already recommend you everywhere, we'll tell you, and you've spent one audit fee to know it.",
  },
  {
    q: "Why is it priced this way?",
    a: "The audit is a fixed one-time fee because it's a fixed piece of work — full prompt baseline, transcripts, fix list. The monthly tiers are retainers because visibility is ongoing work: engines re-read constantly, competitors move, and the monthly re-score keeps it honest. No contracts beyond the founding-rate lock, no surprise invoices.",
  },
];

// ---------------------------------------------------------------------------
// Delivery SOP — /dashboard/geo. The month-by-month operating procedure.
// ---------------------------------------------------------------------------

export interface GeoSopStep {
  phase: string;
  timing: string;
  actions: string[];
}

export const GEO_SOP: GeoSopStep[] = [
  {
    phase: "Baseline audit",
    timing: "Days 1–5 (the $750 deliverable — priced in pricing.ts)",
    actions: [
      "Localize the prompt pack for the client ({city}, {service}, competitors) — core five + their vertical's five, across all 3 engines",
      "Run and record every prompt manually or via the tracker; save transcripts to the dossier (07-geo/prompt-runs.jsonl + transcripts/)",
      "Run geo-visibility-monitor for the baseline score /20",
      "Entity + citation sweep: name/address/phone consistency across Google Business Profile, Yelp, BBB, Facebook, and vertical directories",
      "Deliver: score, transcripts, competitor comparison, ranked fix list",
    ],
  },
  {
    phase: "Foundation fixes",
    timing: "Month 1 (Essentials onward)",
    actions: [
      "Fix every citation inconsistency found in the sweep — engines exclude businesses whose data disagrees across sources",
      "Ship llms.txt + JSON-LD (Organization, Service, FAQPage) on the client site",
      "Rewrite the service pages' FAQ blocks to answer the prompt-pack questions directly — answer-ready content is what engines quote",
    ],
  },
  {
    phase: "Content cadence",
    timing: "Monthly, ongoing",
    actions: [
      "Re-run the full prompt pack; record results; geo-visibility-monitor produces score + delta",
      "Take the report's 'weakest cells' list — each zero-scoring prompt gets a targeted content answer this month",
      "Growth tier: expand the matrix per-city and per-service; prioritize prompts where a named competitor beats the client",
    ],
  },
  {
    phase: "Report + review",
    timing: "Monthly, last week",
    actions: [
      "Jack reviews the generated report BEFORE the client sees it (hard rail: no automated client sends, ever)",
      "Send report with transcripts; flag score movement honestly in both directions",
      "Quarterly (Growth): strategy review against the full transcript archive",
    ],
  },
];

// ---------------------------------------------------------------------------
// Founding-client follow-up sequence — DRAFTS for Jack to send by hand.
// Never automated (CLAUDE.md rule 4).
// ---------------------------------------------------------------------------

export interface GeoFollowUp {
  day: number;
  subject: string;
  body: string;
}

export const GEO_FOLLOWUP_SEQUENCE: GeoFollowUp[] = [
  {
    day: 0,
    subject: "What ChatGPT says when someone asks about {their service} in {city}",
    body: "I asked ChatGPT, Perplexity, and Google AI who to hire for {service} in {city}. {Competitor} came up {N} times. You came up {M}. I recorded all of it — happy to send you the transcripts, no strings. Want them?",
  },
  {
    day: 3,
    subject: "The transcripts",
    body: "Attached — every answer, unedited. The pattern that matters: the engines aren't choosing {competitor} because they're better, they're choosing them because their business data is consistent everywhere and yours disagrees with itself in {specific example}. That's fixable. I do a full audit of this ($750, fixed) that maps every gap and hands you the fix list ranked. Worth 20 minutes to walk through it?",
  },
  {
    day: 8,
    subject: "Founding rate — first 3 only",
    body: "Straight version: this is a new service line for me, so the first 3 clients get the monthly at the founding rate, locked 12 months, in exchange for a testimonial and case-study rights once the score moves. After 3 it goes to the list price. You'd be {slot number}. The audit's the honest starting point either way.",
  },
  {
    day: 16,
    subject: "Closing the loop",
    body: "Last note from me on this. The AI-answer shift isn't slowing down — more of your customers ask ChatGPT than you'd guess, and the answer right now is {competitor}. If timing's wrong, no problem; the transcripts are yours regardless. If you want the audit before month-end I have {N} slots.",
  },
];

// ---------------------------------------------------------------------------
// Scoring rubric — displayed on /dashboard/geo; the math lives in
// src/lib/skills/geo-visibility-monitor.ts.
// ---------------------------------------------------------------------------

export const GEO_RUBRIC = [
  "Each (prompt × engine) cell scores 0 (not mentioned), 1 (mentioned), or 2 (mentioned in the first three businesses named).",
  "Latest recorded run per cell wins — history informs the trend, not the score.",
  "Score = round(20 × points ÷ (2 × cells)). Unmeasured is null, never zero: 'we don't know' and 'invisible' are different findings.",
  "Runs are recorded by Jack or imported from the tracker. Agent code never queries the engines (no real-key API calls).",
  "A month-over-month drop of 3+ points flags for Jack's review before the client report goes out.",
] as const;
