/**
 * Inbound classifier — turn a customer message into a tag + confidence.
 *
 * Implementation of the `inbound-classifier` skill.
 *
 * Cheap pattern-matching first. If Anthropic API is configured AND
 * pattern matching is low-confidence, fall back to LLM classification.
 *
 * Tags: scope-question | change-request | complaint | general | payment |
 *       launch-question | spam | needs-human-review
 */

export type InboundTag =
  | "scope-question"
  | "change-request"
  | "complaint"
  | "general"
  | "payment"
  | "launch-question"
  | "spam"
  | "needs-human-review";

export interface ClassifiedInbound {
  tag: InboundTag;
  confidence: number;
  signals_matched: string[];
  sub_signals: {
    is_likely_spam: boolean;
    is_likely_complaint: boolean;
    is_likely_change_request: boolean;
    is_likely_payment: boolean;
  };
}

interface SignalRule {
  tag: InboundTag;
  weight: number;
  patterns: RegExp[];
}

// Pattern-matching rules. Earlier rules don't outrank later ones; we
// aggregate all matched weights per tag and pick the highest.
const RULES: SignalRule[] = [
  // ─── COMPLAINT ─────────────────────────────────────────────
  {
    tag: "complaint",
    weight: 4,
    patterns: [
      /\b(not (happy|satisfied)|unacceptable|disappointed)\b/i,
      /\b(this isn'?t what|nothing like|completely wrong)\b/i,
      /\b(refund|cancel|lawyer|sue|legal action)\b/i,
      /\bcomplain(ing|t)?\b/i,
    ],
  },
  {
    tag: "complaint",
    weight: 2,
    patterns: [
      /\b(broken|doesn'?t work|not working|crashed|error)\b/i,
      /\b(terrible|horrible|awful|worst)\b/i,
      /[!]{2,}/, // multiple exclamation points
      /\b[A-Z]{3,}\b/, // ALL CAPS words (3+ chars)
    ],
  },

  // ─── CHANGE-REQUEST ───────────────────────────────────────
  {
    tag: "change-request",
    weight: 3,
    patterns: [
      /\b(can you (change|update|modify|fix)|please (change|update)|make (this|the))\b/i,
      /\b(swap out|replace|move|reposition|adjust)\b/i,
      /\b(different (color|font|image|photo)|use this instead)\b/i,
      /\b(bigger|smaller|larger|wider|taller|narrower)\b/i,
    ],
  },

  // ─── SCOPE-QUESTION ───────────────────────────────────────
  {
    tag: "scope-question",
    weight: 3,
    patterns: [
      /\b(is .{1,50} included|what (does|is in)|does this (include|cover))\b/i,
      /\b(can you (also|do|add)|what about|how about)\b/i,
      /\b(are you (going to|able to)|will you (be )?(doing|including))\b/i,
    ],
  },

  // ─── PAYMENT ──────────────────────────────────────────────
  {
    tag: "payment",
    weight: 5,
    patterns: [
      /\b(invoice|billing|charged|charge me|payment|paid|deposit|balance due)\b/i,
      /\b(stripe|credit card|debit card|bank transfer)\b/i,
      /\$\d+/, // dollar amounts
      /\b(receipt|refund|chargeback)\b/i,
    ],
  },

  // ─── LAUNCH-QUESTION ──────────────────────────────────────
  {
    tag: "launch-question",
    weight: 3,
    patterns: [
      /\b(go live|launch|production|cutover|when (will|does) (it|the site) (be )?live)\b/i,
      /\b(dns|domain|nameserver|propagat)\b/i,
      /\b(my customers (can|will))\b/i,
    ],
  },

  // ─── SPAM ─────────────────────────────────────────────────
  {
    tag: "spam",
    weight: 4,
    patterns: [
      /\b(seo (services?|consultant)|guaranteed (rankings|results)|boost your (rankings|traffic|sales))\b/i,
      /\b(list your business|add (your )?listing|directory submission)\b/i,
      /\b(low cost|cheap|affordable rates|special offer|limited time)\b/i,
      /\bdear (sir|madam)\b/i,
      /\b(crypto|bitcoin|investment opportunity|forex)\b/i,
      /\bnigeria|prince|inheritance\b/i,
      /\b(click here|verify your account|account suspended|update your billing)\b/i,
    ],
  },

  // ─── GENERAL ──────────────────────────────────────────────
  {
    tag: "general",
    weight: 1,
    patterns: [
      /^(thanks|thank you|got it|ok|okay|sounds good|appreciate it|perfect)[\s.!]*$/i,
      /\b(looking forward to|excited about|can't wait)\b/i,
    ],
  },
];

export function classifyInbound(
  fromEmail: string,
  subject: string,
  bodyText: string,
  hints?: { is_known_customer?: boolean }
): ClassifiedInbound {
  const combinedText = `${subject} ${bodyText}`.slice(0, 4000);
  const tagScores = new Map<InboundTag, number>();
  const signals_matched: string[] = [];

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(combinedText)) {
        const current = tagScores.get(rule.tag) ?? 0;
        tagScores.set(rule.tag, current + rule.weight);
        signals_matched.push(`${rule.tag}:${pattern.source.slice(0, 30)}`);
      }
    }
  }

  // Pick top tag by score
  let bestTag: InboundTag = "general";
  let bestScore = 0;
  for (const [tag, score] of tagScores) {
    if (score > bestScore) {
      bestTag = tag;
      bestScore = score;
    }
  }

  // Apply email heuristics for spam
  const isLikelySpam =
    /noreply@|do-not-reply@|@(mail|outlook|hotmail|yahoo)\.com$/.test(
      fromEmail.toLowerCase()
    ) && tagScores.has("spam");

  // If sender isn't a known customer AND no strong signals, lean toward needs-human-review
  if (!hints?.is_known_customer && bestScore <= 1) {
    bestTag = "needs-human-review";
  }

  // Compute confidence — score-based, capped at 0.95 (no LLM here)
  let confidence = 0;
  if (bestScore >= 5) confidence = 0.92;
  else if (bestScore >= 3) confidence = 0.82;
  else if (bestScore >= 2) confidence = 0.7;
  else if (bestScore >= 1) confidence = 0.55;
  else confidence = 0.4;

  // Adjust confidence for known customers (more signal)
  if (hints?.is_known_customer) {
    confidence = Math.min(0.95, confidence + 0.05);
  }

  return {
    tag: bestTag,
    confidence,
    signals_matched: Array.from(new Set(signals_matched)),
    sub_signals: {
      is_likely_spam: isLikelySpam || tagScores.has("spam"),
      is_likely_complaint: tagScores.has("complaint"),
      is_likely_change_request: tagScores.has("change-request"),
      is_likely_payment: tagScores.has("payment"),
    },
  };
}
