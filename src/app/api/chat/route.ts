/**
 * /api/chat — backs the floating ChatWidget on day14.us.
 *
 * Calls Anthropic when ANTHROPIC_API_KEY is configured; otherwise returns
 * a friendly demo-mode message so the widget still feels alive on local
 * dev and on prod-without-keys.
 *
 * Edge runtime for snappy first-byte. Non-streaming for now; switch to
 * streaming once the wire-format is settled (see workers/chat.js in
 * studio-template-site for the streaming variant).
 */

import { NextResponse } from "next/server";
import { SERVICE_TIERS, OS_TIERS } from "@/lib/pricing";

export const runtime = "edge";

const MODEL = "claude-haiku-4-5-20251001";
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
const OS_LINE = OS_TIERS.map((t) => `${t.name} $${t.monthly}/mo`).join(", ");

const SYSTEM = `You are the Day14 assistant — a chatbot on day14.us.

Day14 is a productized AI-leveraged build studio. One operator + Claude
agents ship full business platforms (marketing site + customer portal +
billing + admin app + AI chatbot + SMS/email) for small businesses, with
builds ranging ${PRICE_RANGE}. ${SERVICE_TIERS.length} service tiers:
${TIER_LINES}

Day-14-or-deposit-back guarantee: if not live and accepting payments by
day 14, the deposit refunds in full and the customer keeps everything
shipped.

There is also a Day14 OS (run multiple businesses on the same engine) —
waitlist-only founder pricing (${OS_LINE}), NOT purchasable yet. Only mention
it if the user asks about running more than one business.

Live case studies: Splash Jacks Pools (pool service, Platform,
splashjackspools.com), Casamoré (silent disco events, Local,
houseoflove.co), Buildbridge (contractor marketplace, Platform, preview).

Three target verticals: mobile-service (pool, lawn, HVAC, cleaning,
detailing, grooming), membership (salons, gyms, yoga, med spas, coaching),
food (restaurants, cafés, food trucks, bakeries).

Voice: plain, confident, slightly cocky, builder-y. Never consultant-y.
Short answers. Concrete details. If a prospect asks something off-topic
(weather, philosophy), redirect to whether they're considering a build.

If the user wants to book, send them to https://cal.com/day14/intro. A
deposit holds the build slot via Stripe; the exact amount depends on the
tier — confirm specifics on the call. Never quote a price that is not in
the tier list above. If they ask about something not in this prompt, say
you'll have Jack follow up and suggest emailing hello@day14.us.

Keep responses under 4 sentences unless the user explicitly asks for more
detail.`;

type ChatRequest = {
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
};

const EMOJI_NO_KEY =
  "Demo mode — I'm not wired to the AI backend right now. " +
  `What I can tell you: builds run ${PRICE_RANGE} across ${SERVICE_TIERS.length} tiers ` +
  `(${TIER_NAMES}). Live by day 14 or your deposit refunds. ` +
  "Book an intro call at https://cal.com/day14/intro to walk " +
  "through which one fits your business.";

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
    return NextResponse.json({ reply: EMOJI_NO_KEY }, { status: 200 });
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
      console.error("Anthropic upstream error", r.status, detail);
      return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
    }
    const data = (await r.json()) as { content?: Array<{ text?: string }> };
    const text =
      data?.content?.[0]?.text ??
      "Sorry — couldn't generate a response. Try again, or book a call at " +
        "https://cal.com/day14/intro.";
    return NextResponse.json({ reply: text }, { status: 200 });
  } catch (err) {
    console.error("/api/chat exception", err);
    return NextResponse.json({ error: "exception" }, { status: 500 });
  }
}
