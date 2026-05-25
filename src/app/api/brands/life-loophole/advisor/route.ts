/**
 * Life Loophole — "weave together" advisor endpoint.
 *
 * The brand-site Loophole Finder POSTs the visitor's selected situations and the
 * matched strategy ids here; this route asks Claude to synthesize how those
 * legal tax strategies stack and interact for that combined situation.
 *
 * Educational synthesis only — never tax advice. Grounded strictly in the
 * sourced Loophole Catalog. Degrades to a friendly message when no API key is
 * configured, and is rate-limited per IP to protect against abuse.
 */
import { NextRequest, NextResponse } from "next/server";
import { CATALOG } from "@/app/brands/life-loophole/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HITS = new Map<string, { n: number; t: number }>();
const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 6;

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

interface AdvisorBody {
  situations?: unknown;
  query?: unknown;
  strategies?: unknown;
}

function strList(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string").slice(0, max);
}

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json({
      ok: false,
      message:
        "The weave-together advisor switches on once the team connects it — your strategy list above is fully usable right now.",
    });
  }

  const ip = ((req.headers.get("x-forwarded-for") || "").split(",")[0] || "").trim() || "anon";
  if (rateLimited(ip)) {
    return NextResponse.json({
      ok: false,
      message: "You have run several analyses recently — give it a little while, then try again.",
    });
  }

  let body: AdvisorBody;
  try {
    body = (await req.json()) as AdvisorBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
  }

  const ids = strList(body.strategies, 14);
  const situations = strList(body.situations, 16);
  const picked = CATALOG.filter((e) => ids.includes(e.id));
  if (picked.length < 2) {
    return NextResponse.json({
      ok: false,
      message: "Pick at least two situations so there is something to weave together.",
    });
  }

  const stratText = picked
    .map((e) => `- ${e.name}: ${e.summary} (IRS source: ${e.source})`)
    .join("\n");

  const prompt =
    `A person describes their situation as: ${situations.join("; ") || "general taxpayer"}.\n\n` +
    `These legal US tax strategies were matched to them:\n${stratText}\n\n` +
    `Write a plain-English explanation of how these strategies WEAVE TOGETHER for someone in ` +
    `this combined situation: how they stack, what order to consider them in, where one affects ` +
    `another (for example how self-employment income interacts with retirement contributions ` +
    `and the QBI deduction, or how capital gains and bracket planning connect), and the combined ` +
    `opportunities that emerge from being in several of these situations at once. Be specific ` +
    `and genuinely useful. About 200-260 words, in a few short paragraphs.\n\n` +
    `Strict rules: This is educational information — never call it advice. Never promise a ` +
    `specific dollar amount or a guaranteed result; keep any figures qualitative. Only discuss ` +
    `the strategies listed above — do not introduce others. End with one sentence reminding the ` +
    `reader to confirm their situation with a licensed tax professional.`;

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
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) {
      return NextResponse.json({
        ok: false,
        message: "The advisor had trouble just now — please try again shortly.",
      });
    }
    const data: { content?: Array<{ text?: string }> } = await r.json();
    const text = Array.isArray(data.content)
      ? data.content
          .map((c) => c.text || "")
          .join("")
          .trim()
      : "";
    if (!text) {
      return NextResponse.json({
        ok: false,
        message: "The advisor returned nothing — please try again.",
      });
    }
    return NextResponse.json({ ok: true, reasoning: text });
  } catch {
    return NextResponse.json({
      ok: false,
      message: "Could not reach the advisor right now — please try again.",
    });
  }
}
