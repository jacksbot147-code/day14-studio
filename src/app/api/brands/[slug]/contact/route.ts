/**
 * Contact-form endpoint for every brand site.
 * Generated brand pages POST their contact form here:
 *   /api/brands/<slug>/contact
 * Delivery is best-effort: Resend email -> Telegram -> server log.
 */
import { NextRequest, NextResponse } from "next/server";
import { writeBrandInbox } from "@/lib/brand-inbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9][a-z0-9._-]*$/i;

function slugFromPath(req: NextRequest): string {
  const raw = req.nextUrl.pathname.split("/")[3] || "unknown";
  return SLUG_RE.test(raw) ? raw : "unknown";
}

function page(title: string, message: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>` +
      `<body style="font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;` +
      `justify-content:center;min-height:100vh;margin:0;background:#FAF8F4;color:#1f1c24">` +
      `<div style="text-align:center;max-width:440px;padding:32px">` +
      `<div style="font-size:46px">&#10003;</div>` +
      `<h1 style="font-size:22px;margin:14px 0 8px">${title}</h1>` +
      `<p style="color:#666;line-height:1.6;margin:0">${message}</p>` +
      `<a href="javascript:history.back()" style="display:inline-block;margin-top:22px;color:#7A6F8F;` +
      `text-decoration:none">&larr; Back to the site</a></div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

async function deliver(slug: string, name: string, email: string, message: string): Promise<boolean> {
  // 1. Resend email to the operator, if a real key is configured.
  const key = process.env.RESEND_API_KEY;
  if (key && !key.includes("...")) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${slug} contact <${process.env.RESEND_FROM_ADDRESS || "hello@day14.us"}>`,
          to: [process.env.DAY14_OPERATOR_EMAIL || "jacksbot147@gmail.com"],
          reply_to: email,
          subject: `New ${slug} contact — ${name}`,
          text: `Brand: ${slug}\nFrom: ${name} <${email}>\n\n${message}`,
        }),
      });
      if (res.ok) return true;
    } catch {
      /* fall through */
    }
  }
  // 2. Telegram, if the bot is configured.
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (token && chat) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chat,
          text: `New ${slug} contact\nFrom: ${name} (${email})\n\n${message}`,
        }),
      });
      if (res.ok) return true;
    } catch {
      /* fall through */
    }
  }
  // 3. Last resort: server log (visible in Vercel logs).
  console.log(`[brand-contact:${slug}] ${name} <${email}>: ${message.slice(0, 500)}`);
  return false;
}

export async function POST(req: NextRequest) {
  const slug = slugFromPath(req);
  const ct = req.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");

  let name = "";
  let email = "";
  let message = "";
  if (isJson) {
    const b = (await req.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      message?: string;
    };
    name = b.name || "";
    email = b.email || "";
    message = b.message || "";
  } else {
    const form = await req.formData();
    name = String(form.get("name") || "");
    email = String(form.get("email") || "");
    message = String(form.get("message") || "");
  }

  if (!email || !message) {
    if (!isJson) return page("Almost there", "Add your email and a message, then send again.");
    return NextResponse.json({ ok: false, error: "email and message are required" }, { status: 400 });
  }

  const delivered = await deliver(slug, name || "(no name)", email, message);

  // Land the submission in the per-tenant inbox so it surfaces in
  // /admin/inbox. Best-effort: a failed write must not break the user's
  // "thanks, we'll be in touch" experience. Kennum's contact form is the
  // quote-request entry point; the others are general contact.
  const inboxKind = slug === "kennum-lawn-care" ? "quote" : "contact";
  const inboxResult = await writeBrandInbox({
    tenant: slug,
    kind: inboxKind,
    payload: {
      name: name || "(no name)",
      email,
      message,
      delivered_via_external: delivered,
    },
  });
  if (!inboxResult.ok) {
    console.log(`[brand-contact:${slug}] inbox write failed: ${inboxResult.error || "unknown"}`);
  }

  if (!isJson) return page("Message sent", "Thanks for reaching out &mdash; we'll get back to you soon.");
  return NextResponse.json({ ok: true, delivered, inbox: inboxResult.ok }, { status: 200 });
}
