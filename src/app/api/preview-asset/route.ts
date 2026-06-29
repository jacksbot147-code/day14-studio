import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import {
  decodePreview,
  tradeContent,
  titleCasePreview,
  brandKit,
} from "@/lib/preview";
import { generateImage, isImageGenEnabled } from "@/lib/image-gen";

/**
 * /api/preview-asset — on-demand, cached generation of a preview's logo (and,
 * later, social graphics). Returns {enabled:false} unless OPENAI_API_KEY is set,
 * so the UI stays text-only until the image provider is switched on. Generations
 * are CACHED per token+kind to a file, so a logo is created at most once per
 * business — keeps cost bounded and avoids fan-out on page load.
 */

export const runtime = "nodejs";

const CACHE_DIR = path.join(
  homedir(),
  "Documents/businesses/_shared/growth/preview-assets",
);

export async function POST(req: Request) {
  if (!isImageGenEnabled()) {
    return NextResponse.json({ enabled: false });
  }

  let body: { token?: unknown; kind?: unknown };
  try {
    body = (await req.json()) as { token?: unknown; kind?: unknown };
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const kind = body.kind === "logo" ? "logo" : "logo";
  const d = token ? decodePreview(token) : null;
  if (!d) return NextResponse.json({ error: "bad token" }, { status: 400 });

  const safeToken = token.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 220);
  const file = path.join(CACHE_DIR, `${safeToken}-${kind}.txt`);

  // Serve cache if present.
  try {
    const cached = await fs.readFile(file, "utf8");
    if (cached) return NextResponse.json({ dataUrl: cached, cached: true });
  } catch {
    // not cached yet
  }

  const name = titleCasePreview(d.name);
  const tc = tradeContent(d.trade);
  const bk = brandKit(d.trade);
  const prompt =
    `A clean, modern, minimal vector-style logo for "${name}", a ` +
    `${tc.label.toLowerCase()} business. A simple iconic mark plus the business ` +
    `name "${name}" set in a confident sans-serif. Primary color ${bk.palette.primary}, ` +
    `accent ${bk.palette.accent}. Flat, professional, highly legible, transparent ` +
    `background, no photographic elements, no extra words or taglines.`;

  const dataUrl = await generateImage({
    prompt,
    size: "1024x1024",
    transparent: true,
  });
  if (!dataUrl) return NextResponse.json({ enabled: true, dataUrl: null });

  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(file, dataUrl, "utf8");
  } catch {
    // cache write best-effort
  }
  return NextResponse.json({ dataUrl });
}
