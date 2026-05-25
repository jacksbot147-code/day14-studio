/**
 * Life Loophole — full tax-strategist advisor agent endpoint.
 *
 * Takes a free-text description of a tax situation, builds the Block A-E
 * system prompt (see `lib/life-loophole-advisor.ts`), calls Claude, and
 * returns a personalized, ranked, sourced strategy set.
 *
 * This is the fuller advisor specified in
 * `businesses/life-loophole/advisor-agent/{SKILL,AGENT-DESIGN}.md`. It is
 * ADDED alongside the existing lightweight "weave-together" route at
 * `../advisor/route.ts` — that route is left in place.
 *
 * Grounding contract enforcement happens here in three places:
 *   1. The system prompt confines the model to the injected <catalog> block.
 *   2. Every returned strategy id is validated against the real CATALOG; any
 *      strategy that does not map to a real entry is dropped, and its source,
 *      professional_needed flag, and tax year are overwritten from the
 *      authoritative catalog entry so the model cannot invent a citation.
 *   3. A post-generation check forces the standard disclaimer onto every
 *      response (AGENT-DESIGN.md §5).
 *
 * Educational only — never tax advice. Degrades to a friendly message when no
 * API key is configured, and is rate-limited per IP.
 */
import { NextRequest, NextResponse } from "next/server";
import { CATALOG } from "@/app/brands/life-loophole/catalog";
import type { LoopholeEntry } from "@/app/brands/life-loophole/catalog";
import {
  buildSystemPrompt,
  catalogTaxYear,
  ensureDisclaimer,
  DISCLAIMER,
} from "@/lib/life-loophole-advisor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ----------------------------- Rate limiting ----------------------------- */

const HITS = new Map<string, { n: number; t: number }>();
const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 8;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = HITS.get(ip);
  if (!rec || now - rec.t > WINDOW_MS) {
    HITS.set(ip, { n: 1, t: now });
    return false;
  }
  rec.n += 1;
  return rec.n > LIMIT;
}

/* ------------------------------- Catalog --------------------------------- */

const CATALOG_BY_ID = new Map<string, LoopholeEntry>(
  CATALOG.map((e) => [e.id, e]),
);
const TAX_YEAR = catalogTaxYear(CATALOG);

const VALID_PERSONAS = new Set<string>([
  "individuals-families",
  "freelancers-creators",
  "small-business",
  "investors-high-earners",
  "legal-entities",
]);

/* ----------------------------- Output types ------------------------------ */

interface StrategyCard {
  id: string;
  name: string;
  summary: string;
  what_it_is: string;
  does_it_fit_you: string;
  rough_impact: string;
  effort: string;
  risk: string;
  action_steps: string;
  source: string;
  current_as_of: string;
  professional_needed: boolean;
  group: "quick-win" | "bigger-move";
  professional_banner: string;
  questions_for_a_pro: string[];
}

interface AdvisorResult {
  readback: string;
  personas: string[];
  intro: string;
  clarifying_question: string;
  out_of_catalog: boolean;
  refused: boolean;
  message: string;
  strategies: StrategyCard[];
  disclaimer: string;
  tax_year: string;
}

/* ------------------------------- Helpers --------------------------------- */

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asBool(v: unknown): boolean {
  return v === true;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

/**
 * Validate and re-ground one strategy card the model returned. Returns null if
 * the card's id is not a real catalog entry — that drop is the structural
 * defense against invented strategies. For a valid card, the source,
 * professional_needed flag, name, and tax year are taken from the
 * authoritative catalog entry (the model cannot upgrade or invent a citation),
 * while the model's plain-language framing of the other fields is kept.
 */
function regroundCard(raw: unknown): StrategyCard | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = asString(r.id);
  const entry = CATALOG_BY_ID.get(id);
  if (!entry) return null;

  const groupRaw = asString(r.group);
  const group: "quick-win" | "bigger-move" =
    groupRaw === "quick-win" ? "quick-win" : "bigger-move";

  // Honest-risk safeguard: a high-risk or professional_needed entry can never
  // be presented as a quick win, regardless of what the model labeled it.
  const highStakes =
    entry.professional_needed || entry.risk_level === "high";
  const safeGroup: "quick-win" | "bigger-move" = highStakes
    ? "bigger-move"
    : group;

  let banner = asString(r.professional_banner);
  if (highStakes && !banner) {
    banner =
      "This one needs a licensed professional before you act — its rules " +
      "depend on details specific to you and are easy to get wrong.";
  }
  if (!highStakes) banner = "";

  return {
    id: entry.id,
    name: entry.name,
    summary: asString(r.summary) || entry.summary,
    what_it_is: asString(r.what_it_is) || entry.explanation,
    does_it_fit_you: asString(r.does_it_fit_you) || entry.eligibility,
    rough_impact: asString(r.rough_impact) || entry.estimated_impact,
    effort: asString(r.effort) || entry.complexity,
    risk: asString(r.risk) || entry.risk_level,
    action_steps: asString(r.action_steps) || entry.action_steps,
    // Citation is always copied verbatim from the catalog — never the model.
    source: entry.source,
    current_as_of: entry.current_as_of,
    professional_needed: entry.professional_needed,
    group: safeGroup,
    professional_banner: banner,
    questions_for_a_pro: asStringArray(r.questions_for_a_pro),
  };
}

/**
 * Restrict the model's persona list to the five real persona ids. Anything
 * else is dropped — the model cannot invent a persona.
 */
function regroundPersonas(raw: unknown): string[] {
  return asStringArray(raw).filter((p) => VALID_PERSONAS.has(p));
}

/**
 * Parse and re-ground the model's JSON output into an AdvisorResult, applying
 * the grounding contract. Throws if the payload is not usable JSON.
 */
function regroundResult(text: string): AdvisorResult {
  // The model is told to return bare JSON; tolerate an accidental code fence.
  let body = text.trim();
  if (body.startsWith("```")) {
    body = body.replace(/^```[a-zA-Z]*\n?/, "").replace(/```\s*$/, "").trim();
  }
  const parsed: unknown = JSON.parse(body);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("advisor returned a non-object payload");
  }
  const p = parsed as Record<string, unknown>;

  const refused = asBool(p.refused);
  const out_of_catalog = asBool(p.out_of_catalog);

  const rawStrategies = Array.isArray(p.strategies) ? p.strategies : [];
  // A refused request never carries strategy content.
  const strategies: StrategyCard[] = refused
    ? []
    : rawStrategies
        .map(regroundCard)
        .filter((c): c is StrategyCard => c !== null);

  return {
    readback: asString(p.readback),
    personas: regroundPersonas(p.personas),
    intro:
      asString(p.intro) ||
      "Life Loophole is an educational tool — it is not a substitute for a " +
        "licensed tax professional.",
    clarifying_question: asString(p.clarifying_question),
    out_of_catalog,
    refused,
    message: asString(p.message),
    strategies,
    // Defense layer 3: force the disclaimer onto every response.
    disclaimer: ensureDisclaimer(p.disclaimer),
    tax_year: TAX_YEAR,
  };
}

/* -------------------------------- Route ---------------------------------- */

interface AdvisorBody {
  situation?: unknown;
}

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // Graceful no-key degradation — same shape as the existing advisor route.
    return NextResponse.json({
      ok: false,
      message:
        "The Life Loophole advisor switches on once the team connects it. " +
        "In the meantime, the Loophole Finder on the main page lets you " +
        "browse every sourced strategy by situation right now.",
    });
  }

  const ip =
    ((req.headers.get("x-forwarded-for") || "").split(",")[0] || "").trim() ||
    "anon";
  if (rateLimited(ip)) {
    return NextResponse.json({
      ok: false,
      message:
        "You have run several analyses recently — give it a little while, " +
        "then try again.",
    });
  }

  let body: AdvisorBody;
  try {
    body = (await req.json()) as AdvisorBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Bad request." },
      { status: 400 },
    );
  }

  const situation = asString(body.situation).trim().slice(0, 4000);
  if (situation.length < 8) {
    return NextResponse.json({
      ok: false,
      message:
        "Tell the advisor a bit about your tax situation — your work, your " +
        "household, what you are trying to do — so it can find the " +
        "strategies that fit you.",
    });
  }

  const systemPrompt = buildSystemPrompt(CATALOG);
  const userPrompt =
    "Here is the person's tax situation, in their own words:\n\n" +
    `"""${situation}"""\n\n` +
    "Follow the task procedure and return the JSON object exactly as the " +
    "output contract specifies. Remember: ground every claim in the " +
    "catalog, copy each source verbatim, never promise a dollar figure, and " +
    "always include the disclaimer.";

  let text = "";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!r.ok) {
      return NextResponse.json({
        ok: false,
        message: "The advisor had trouble just now — please try again shortly.",
      });
    }
    const data: { content?: Array<{ text?: string }> } = await r.json();
    text = Array.isArray(data.content)
      ? data.content
          .map((c) => c.text || "")
          .join("")
          .trim()
      : "";
  } catch {
    return NextResponse.json({
      ok: false,
      message: "Could not reach the advisor right now — please try again.",
    });
  }

  if (!text) {
    return NextResponse.json({
      ok: false,
      message: "The advisor returned nothing — please try again.",
    });
  }

  let result: AdvisorResult;
  try {
    result = regroundResult(text);
  } catch {
    // The model produced something we cannot safely re-ground. Rather than
    // pass unverified tax content through, degrade to a sourced-but-safe
    // message that still carries the mandatory disclaimer.
    return NextResponse.json({
      ok: false,
      message:
        "The advisor could not put together a grounded answer this time — " +
        "please rephrase your situation and try again.",
      disclaimer: DISCLAIMER,
    });
  }

  return NextResponse.json({ ok: true, result });
}
