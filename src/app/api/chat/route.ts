/**
 * /api/chat — backs the floating ChatWidget on day14.us.
 *
 * Calls Anthropic when ANTHROPIC_API_KEY is configured. Model comes from
 * ANTHROPIC_MODEL. If the key is missing or Anthropic rejects the call,
 * the route still returns 200 with a customer-facing reply.
 *
 * Node runtime. Non-streaming.
 */

import { NextResponse } from "next/server";
import { SERVICE_TIERS } from "@/lib/pricing";
import { SITE } from "@/lib/site";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const MAX_TOKENS = 600;

// All prices derive from pricing.ts — never hard-code a price in this prompt.
// (The chatbot is prospect-facing; a stale literal here quotes a dead price live.)
const TIER_LINES = SERVICE_TIERS.map(
  (t) => `- ${t.name} (${t.setupLabel} + ${t.monthlyLabel}) — ${t.bestFor}`,
).join("\n");

const ENTRY_TIER = SERVICE_TIERS[0]!;
const TOP_TIER = SERVICE_TIERS[SERVICE_TIERS.length - 1]!;
const PRICE_RANGE = `$${(ENTRY_TIER.setup ?? 0).toLocaleString()}–${TOP_TIER.setupLabel.replace(/^from\s+/i, "")}+`;
const TIER_NAMES = SERVICE_TIERS.map((t) => t.name).join(", ");

const SYSTEM = `You are the Day14 assistant on day14.us.

Day14 builds the software that runs a local service business, live in 14 days:
site, booking and quoting, customer portal, Stripe payments, scheduling, admin,
an AI assistant, and SMS/email. Builds range ${PRICE_RANGE}. ${SERVICE_TIERS.length} tiers:
${TIER_LINES}

If the build is not live and accepting payments by day 14, the deposit refunds
in full and the customer keeps everything shipped.

Proof you can name: Splash Jacks Pools (pool service, splashjackspools.com) and
AlignMD (alignmd.vercel.app). GEO is a separate AI-search visibility service.
Marque / AdForge is a separate product at https://ad-forge-amber.vercel.app —
mention it only if they ask about ads.

Voice: plain, confident, short. If they want to book, send ${SITE.bookingUrl}.
Never quote a price that is not in the tier list above. If you don't know,
say Jack will follow up and give ${SITE.email}.

Keep responses under 4 sentences unless the user explicitly asks for more
detail.`;

function fallbackReply(): string {
  return (
    `I can't answer live right now. Builds run ${PRICE_RANGE} across ${SERVICE_TIERS.length} tiers ` +
    `(${TIER_NAMES}), live in 14 days or the deposit comes back. ` +
    `Book a 15-minute look at ${SITE.bookingUrl} or email ${SITE.email}.`
  );
}

type ChatRequest = {
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
};

export async function POST(req: Request) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "missing_messages" }, { status: 400 });
  }

  // Cap context length so a malicious caller can't run up the bill.
  const trimmed = messages
    .slice(-12)
    .filter(
      (m) =>
        m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.length > 0 &&
        m.content.length < 3000,
    );
  if (trimmed.length === 0) {
    return NextResponse.json({ error: "no_valid_messages" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("/api/chat: ANTHROPIC_API_KEY unset");
    return NextResponse.json({ reply: fallbackReply() }, { status: 200 });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM,
        messages: trimmed,
      }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("Anthropic upstream error", r.status, detail.slice(0, 300));
      return NextResponse.json({ reply: fallbackReply() }, { status: 200 });
    }
    const data = (await r.json()) as { content?: Array<{ text?: string }> };
    const text = data?.content?.[0]?.text?.trim() || fallbackReply();
    return NextResponse.json({ reply: text }, { status: 200 });
  } catch (err) {
    console.error("/api/chat exception", err);
    return NextResponse.json({ reply: fallbackReply() }, { status: 200 });
  }
}
