/**
 * marque-taxonomy.ts — the shared vocabulary of the Marque creative pipeline.
 *
 * Marque sells a creative pipeline, not ad management: volume generation,
 * variant TAGGING, fatigue detection, and brand consistency. This file is the
 * tagging half. It is the single source of truth shared by three consumers:
 *
 *   1. The `marque-ads` operator skill, which generates variants and stamps
 *      each one with a VariantTag.
 *   2. `/api/webhooks/marque` (kind `marque-ad-scored`), which receives those
 *      tags as the event payload.
 *   3. The fatigue checker, which reads platform metrics back and decides
 *      which variant IDs to retire.
 *
 * WHY TAGS AT ALL: an ad account tells you which IMAGE won. It cannot tell you
 * which IDEA won, because the idea is not a field. Tagging every variant by
 * hook, angle, format, and ratio turns a pile of winners into a readable
 * answer — "problem-callout beats social-proof for this product, at 9:16, in
 * video" — which is the thing a client cannot get anywhere else.
 *
 * WHY THE FIELD IS SMALL: ads inside one ad set share a single pool of
 * optimization events, and splitting them across ad sets splits the budget
 * feeding that pool. Running everything at once keeps everything in learning.
 * Deep bench, small field. See MARQUE_SPEND_RULE in ./pricing.
 *
 * No fabricated benchmarks live in this file. The fatigue thresholds are
 * decision rules Marque commits to, stated as rules — not as claims about what
 * any particular account will do.
 */

/* ------------------------------------------------------------------ hooks */

/**
 * HOOK = why the scroll stops in the first ~1.5 seconds. Independent of what
 * is being sold; two products with nothing in common can share a hook.
 */
export const HOOK_TYPES = [
  "problem-callout",
  "before-after",
  "demo-in-hand",
  "price-anchor",
  "social-proof",
  "objection-kill",
  "curiosity-gap",
  "founder-direct",
  "ugc-testimonial",
  "pattern-interrupt",
] as const;
export type HookType = (typeof HOOK_TYPES)[number];

export const HOOK_BRIEFS: Record<HookType, string> = {
  "problem-callout":
    "Open on the pain, named specifically, before the product exists. 'Your garage floor is the reason you park outside.'",
  "before-after":
    "Two states, hard cut, no narration needed. The delta carries it. Strongest for anything visually transformative.",
  "demo-in-hand":
    "Human hands using the thing, uninterrupted, in the first two seconds. No logo, no title card.",
  "price-anchor":
    "Name the expensive alternative first, then the price. Works only when the gap is genuinely large.",
  "social-proof":
    "Volume or specificity of other buyers, shown not claimed — a wall of orders, a comment section, a repeat customer.",
  "objection-kill":
    "State the exact reason they would not buy, out loud, and answer it. 'It looks cheap in photos. Here it is unedited.'",
  "curiosity-gap":
    "An incomplete visual or claim that only resolves if they keep watching. Highest risk of feeling like bait — use sparingly.",
  "founder-direct":
    "One person, talking to camera, unpolished. Reads as accountable rather than advertised.",
  "ugc-testimonial":
    "Customer-shot framing and pacing. Must be disclosed as illustrative if it is not a real customer.",
  "pattern-interrupt":
    "Visual or audio that does not belong in the feed — wrong speed, wrong sound, wrong framing. Buys attention, does not sell.",
};

/* ----------------------------------------------------------------- angles */

/**
 * ANGLE = what is actually being sold underneath the hook. The same hook run
 * against two angles is a genuine test; the same hook run twice is not.
 */
export const OFFER_ANGLES = [
  "pain-relief",
  "time-save",
  "money-save",
  "status",
  "novelty",
  "bundle",
  "risk-reversal",
  "scarcity",
  "seasonal",
  "identity",
] as const;
export type OfferAngle = (typeof OFFER_ANGLES)[number];

export const ANGLE_BRIEFS: Record<OfferAngle, string> = {
  "pain-relief":
    "The thing that hurts stops hurting. Most durable angle; rarely fatigues on message, only on execution.",
  "time-save": "Hours back. Quantify or it reads as filler.",
  "money-save": "Cheaper than the alternative, over a stated period. Needs the comparison to be real.",
  status: "How they are seen with it. Works for visible products, dies on invisible ones.",
  novelty: "They have not seen this before. Fastest to fatigue of any angle — expect a short life.",
  bundle: "More for the same, or a set that solves the whole job rather than part of it.",
  "risk-reversal": "Returns, guarantee, shipping, trial. Converts fence-sitters; does not create demand.",
  scarcity:
    "Limited stock or window. Only usable when true — a false one is both a policy violation and a trust bomb.",
  seasonal: "Tied to a date or weather. Built-in expiry, so schedule the retirement when you schedule the launch.",
  identity: "'People like me use this.' Strongest for products with a visible subculture.",
};

/* ---------------------------------------------------------------- formats */

export const FORMATS = [
  "static",
  "animated-static",
  "carousel",
  "video-ugc",
  "video-demo",
  "video-founder",
] as const;
export type Format = (typeof FORMATS)[number];

export const ASPECT_RATIOS = ["9:16", "1:1", "4:5", "16:9"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

/* --------------------------------------------------------------- channels */

export const CHANNELS = ["tiktok", "meta", "youtube-shorts", "pinterest"] as const;
export type Channel = (typeof CHANNELS)[number];

/**
 * Which ratios and formats each channel actually wants. TikTok is listed first
 * deliberately: it is the primary channel for product/e-commerce creative in
 * this pipeline, with Meta supported second.
 */
export const CHANNEL_SPECS: Record<
  Channel,
  { ratios: AspectRatio[]; preferredFormats: Format[]; note: string }
> = {
  tiktok: {
    ratios: ["9:16"],
    preferredFormats: ["video-ugc", "video-demo", "video-founder"],
    note: "Native-feeling vertical video only. Polished brand film underperforms shot-on-phone framing. Sound is not optional.",
  },
  meta: {
    ratios: ["4:5", "9:16", "1:1"],
    preferredFormats: ["static", "video-ugc", "video-demo", "carousel"],
    note: "4:5 for feed, 9:16 for Reels and Stories. Statics still work here in a way they do not on TikTok.",
  },
  "youtube-shorts": {
    ratios: ["9:16"],
    preferredFormats: ["video-demo", "video-ugc"],
    note: "Longer tolerance for demonstration than TikTok. The first three seconds still decide it.",
  },
  pinterest: {
    ratios: ["9:16", "4:5"],
    preferredFormats: ["static", "animated-static"],
    note: "Intent-heavy and slow-burn. Statics with legible text outperform video.",
  },
};

/* ----------------------------------------------------------------- variant */

/** The tag stamped on every generated asset. This IS the product. */
export interface VariantTag {
  /** Stable machine ID — see buildVariantId. */
  id: string;
  /** Slug of the product or offer this variant sells. */
  product: string;
  hook: HookType;
  angle: OfferAngle;
  format: Format;
  ratio: AspectRatio;
  channel: Channel;
  /** Monotonic sequence within (product, hook, angle, format) — distinguishes re-cuts. */
  seq: number;
  /** ISO date the asset was generated. */
  generatedAt: string;
  /** Free-text one-liner describing the specific execution. */
  concept: string;
  /** Where the rendered asset lives (URL or local path). */
  assetRef?: string;
}

/**
 * Machine-readable variant ID. Deliberately parseable in both directions so a
 * platform report — which only ever gives you back the ad name — can be joined
 * to the tag without a database.
 *
 *   mugwarmer-problem-callout-pain-relief-video-ugc-9x16-tiktok-01
 */
export function buildVariantId(
  t: Pick<VariantTag, "product" | "hook" | "angle" | "format" | "ratio" | "channel" | "seq">,
): string {
  const ratio = t.ratio.replace(":", "x");
  const seq = String(t.seq).padStart(2, "0");
  return [t.product, t.hook, t.angle, t.format, ratio, t.channel, seq].join("-");
}

/**
 * Longest match wins. Several tokens are suffixes of others — `static` inside
 * `animated-static`, `shorts` inside `youtube-shorts` — so a naive first-match
 * scan silently mis-parses them. Any future token with the same property is
 * handled by this rule without further code.
 */
function longestSuffix<T extends string>(source: readonly T[], text: string): T | undefined {
  return [...source].sort((a, b) => b.length - a.length).find((t) => text.endsWith(`-${t}`));
}

/** Ratio tokens as they appear inside an id (`:` is not id-safe). */
const RATIO_SLUGS = ASPECT_RATIOS.map((r) => r.replace(":", "x"));

/**
 * Inverse of buildVariantId. Returns null on anything malformed.
 *
 * Strips right-to-left, longest-token-first, because both the product slug and
 * several tag values legitimately contain hyphens.
 */
export function parseVariantId(
  id: string,
): Omit<VariantTag, "generatedAt" | "concept" | "assetRef"> | null {
  const parts = id.split("-");
  if (parts.length < 8) return null;

  const seq = Number(parts[parts.length - 1]);
  if (!Number.isFinite(seq)) return null;

  let rest = parts.slice(0, -1).join("-");

  const channel = longestSuffix(CHANNELS, rest);
  if (!channel) return null;
  rest = rest.slice(0, -(channel.length + 1));

  const ratioSlug = longestSuffix(RATIO_SLUGS, rest);
  if (!ratioSlug) return null;
  rest = rest.slice(0, -(ratioSlug.length + 1));
  const ratio = ratioSlug.replace("x", ":") as AspectRatio;

  const format = longestSuffix(FORMATS, rest);
  if (!format) return null;
  rest = rest.slice(0, -(format.length + 1));

  const angle = longestSuffix(OFFER_ANGLES, rest);
  if (!angle) return null;
  rest = rest.slice(0, -(angle.length + 1));

  const hook = longestSuffix(HOOK_TYPES, rest);
  if (!hook) return null;
  const product = rest.slice(0, -(hook.length + 1));
  if (!product) return null;

  return { id, product, hook, angle, format, ratio, channel, seq };
}

/* ----------------------------------------------------------------- fatigue */

/**
 * The retirement rules Marque commits to. These are DECISION RULES, not
 * predictions — they say when we swap, not what your results will be.
 *
 * Each rule is evaluated against a 7-day trailing window versus that same
 * variant's own best 7-day window. Comparing a variant to itself, rather than
 * to other variants, is what makes the call fair when budgets move around.
 */
export interface FatigueRule {
  id: string;
  label: string;
  channels: Channel[];
  trigger: string;
  action: "retire" | "refresh" | "watch";
}

export const FATIGUE_RULES: FatigueRule[] = [
  {
    id: "ctr-decay",
    label: "Click-through decay",
    channels: ["tiktok", "meta", "youtube-shorts", "pinterest"],
    trigger: "Trailing-7d CTR falls below 70% of this variant's own best trailing-7d CTR.",
    action: "retire",
  },
  {
    id: "cpm-drift",
    label: "CPM drift",
    channels: ["meta", "tiktok"],
    trigger: "Trailing-7d CPM exceeds 130% of this variant's first-7d CPM on the same audience.",
    action: "refresh",
  },
  {
    id: "frequency-ceiling",
    label: "Frequency ceiling",
    channels: ["meta"],
    trigger: "7-day frequency reaches 2.5 on a prospecting audience.",
    action: "retire",
  },
  {
    id: "hold-rate-drop",
    label: "Hold-rate drop",
    channels: ["tiktok", "youtube-shorts"],
    trigger:
      "3-second view rate falls below 70% of the variant's launch week. The hook died before the offer did.",
    action: "retire",
  },
  {
    id: "spend-no-conversion",
    label: "Spend without conversion",
    channels: ["tiktok", "meta", "youtube-shorts", "pinterest"],
    trigger: "Spend exceeds 3x target cost-per-action with zero attributed conversions.",
    action: "retire",
  },
  {
    id: "novelty-clock",
    label: "Novelty clock",
    channels: ["tiktok", "meta", "youtube-shorts", "pinterest"],
    trigger: "Any variant on the novelty or seasonal angle reaching 21 days live, regardless of metrics.",
    action: "refresh",
  },
];

/** A metrics row as read back from a platform export, normalised. */
export interface VariantMetrics {
  variantId: string;
  channel: Channel;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  /** Trailing-7d click-through rate, as a fraction (0.012 = 1.2%). */
  ctr7d: number;
  /** This variant's own best trailing-7d CTR to date. */
  ctrBest7d: number;
  cpm7d: number;
  cpmFirst7d: number;
  /** Meta only; 0 when not applicable. */
  frequency7d: number;
  /** TikTok and Shorts only; fraction. */
  holdRate3s?: number;
  holdRate3sLaunch?: number;
  daysLive: number;
  /** The target cost per action, in the same currency as spend. */
  targetCpa: number;
}

export interface FatigueVerdict {
  variantId: string;
  fired: string[];
  action: "retire" | "refresh" | "watch" | "keep";
  reasons: string[];
}

/**
 * Evaluate one variant against the rule set. Pure, dependency-free, and
 * deliberately conservative: a rule only fires when the numbers are actually
 * present, so a sparse export produces "keep" rather than a false retirement.
 */
export function evaluateFatigue(m: VariantMetrics, angle?: OfferAngle): FatigueVerdict {
  const fired: string[] = [];
  const reasons: string[] = [];

  if (m.ctrBest7d > 0 && m.ctr7d > 0 && m.ctr7d < m.ctrBest7d * 0.7) {
    fired.push("ctr-decay");
    reasons.push(
      `CTR ${(m.ctr7d * 100).toFixed(2)}% is ${Math.round((1 - m.ctr7d / m.ctrBest7d) * 100)}% below its own peak of ${(m.ctrBest7d * 100).toFixed(2)}%.`,
    );
  }
  if (m.cpmFirst7d > 0 && m.cpm7d > m.cpmFirst7d * 1.3) {
    fired.push("cpm-drift");
    reasons.push(
      `CPM has drifted from ${m.cpmFirst7d.toFixed(2)} to ${m.cpm7d.toFixed(2)} — the auction is charging more for the same attention.`,
    );
  }
  if (m.channel === "meta" && m.frequency7d >= 2.5) {
    fired.push("frequency-ceiling");
    reasons.push(`Frequency ${m.frequency7d.toFixed(2)} — the same people are seeing it too often.`);
  }
  if (
    typeof m.holdRate3s === "number" &&
    typeof m.holdRate3sLaunch === "number" &&
    m.holdRate3sLaunch > 0 &&
    m.holdRate3s < m.holdRate3sLaunch * 0.7
  ) {
    fired.push("hold-rate-drop");
    reasons.push("Three-second hold rate collapsed — the hook stopped working before the offer did.");
  }
  if (m.targetCpa > 0 && m.conversions === 0 && m.spend > m.targetCpa * 3) {
    fired.push("spend-no-conversion");
    reasons.push(
      `${m.spend.toFixed(2)} spent at a ${m.targetCpa.toFixed(2)} target with nothing attributed. Three times the target with zero is enough.`,
    );
  }
  if ((angle === "novelty" || angle === "seasonal") && m.daysLive >= 21) {
    fired.push("novelty-clock");
    reasons.push(`On a ${angle} angle for ${m.daysLive} days — these expire on the calendar, not the chart.`);
  }

  const byId = new Map(FATIGUE_RULES.map((r) => [r.id, r]));
  const actions = fired
    .map((f) => byId.get(f)?.action)
    .filter((a): a is FatigueRule["action"] => Boolean(a));
  const action: FatigueVerdict["action"] = actions.includes("retire")
    ? "retire"
    : actions.includes("refresh")
      ? "refresh"
      : actions.includes("watch")
        ? "watch"
        : "keep";

  return { variantId: m.variantId, fired, action, reasons };
}

/* ------------------------------------------------------- generation matrix */

/**
 * Build a balanced generation matrix: `count` variants spread across hooks and
 * angles so no two share the same (hook, angle, format) triple until the space
 * is exhausted. This is what makes a batch a TEST rather than a pile.
 */
export function buildMatrix(opts: {
  product: string;
  count: number;
  channel: Channel;
  hooks?: HookType[];
  angles?: OfferAngle[];
  formats?: Format[];
  ratio?: AspectRatio;
}): Array<Omit<VariantTag, "generatedAt" | "concept" | "assetRef">> {
  const hooks: HookType[] = opts.hooks?.length ? opts.hooks : [...HOOK_TYPES];
  const angles: OfferAngle[] = opts.angles?.length ? opts.angles : [...OFFER_ANGLES];
  const spec = CHANNEL_SPECS[opts.channel];
  const formats: Format[] = opts.formats?.length ? opts.formats : spec.preferredFormats;
  const ratio: AspectRatio = opts.ratio ?? spec.ratios[0] ?? "9:16";

  const out: Array<Omit<VariantTag, "generatedAt" | "concept" | "assetRef">> = [];
  const seen = new Map<string, number>();

  for (let i = 0; i < opts.count; i++) {
    const hook = hooks[i % hooks.length] as HookType;
    const angle = angles[(i + Math.floor(i / hooks.length)) % angles.length] as OfferAngle;
    const format = formats[i % formats.length] as Format;
    const pairKey = `${hook}|${angle}|${format}`;
    const seq = (seen.get(pairKey) ?? 0) + 1;
    seen.set(pairKey, seq);
    const base = { product: opts.product, hook, angle, format, ratio, channel: opts.channel, seq };
    out.push({ ...base, id: buildVariantId(base) });
  }
  return out;
}

/** The webhook payload for one generated/scored variant. */
export function toIngestRecord<E extends Record<string, unknown> = Record<string, never>>(
  tag: VariantTag,
  extra?: E
) {
  return {
    brand: "marque",
    source: "marque-pipeline",
    kind: "marque-ad-scored",
    external_id: tag.id,
    created_at: tag.generatedAt,
    payload: {
      product: tag.product,
      hook: tag.hook,
      angle: tag.angle,
      format: tag.format,
      ratio: tag.ratio,
      channel: tag.channel,
      seq: tag.seq,
      concept: tag.concept,
      assetRef: tag.assetRef ?? null,
      ...((extra ?? {}) as E),
    },
  };
}
