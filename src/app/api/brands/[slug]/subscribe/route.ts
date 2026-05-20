/**
 * Newsletter signup endpoint for every brand site.
 * Generated brand pages POST their newsletter form here:
 *   /api/brands/<slug>/subscribe
 * Routes the email to MailerLite, tagged with the brand as the source.
 */
import { NextRequest, NextResponse } from "next/server";
import { subscribe } from "@/lib/mailerlite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugFromPath(req: NextRequest): string {
  return req.nextUrl.pathname.split("/")[3] || "unknown";
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

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: NextRequest) {
  const slug = slugFromPath(req);
  const ct = req.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");

  let email = "";
  if (isJson) {
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    email = body.email || "";
  } else {
    const form = await req.formData();
    email = String(form.get("email") || "");
  }

  if (!email || !EMAIL_RE.test(email)) {
    if (!isJson) return page("That email looked off", "Head back and double-check the address, then try again.");
    return NextResponse.json({ ok: false, error: "invalid email" }, { status: 400 });
  }

  const result = await subscribe({ email, source: `brand:${slug}` });

  if (!isJson) {
    return result.ok
      ? page("You're on the list", "Thanks for subscribing &mdash; keep an eye on your inbox.")
      : page("We saved your spot", "Your email is noted. If anything's off, it's on our end &mdash; not you.");
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
