/**
 * /api/marque/asset/<product>/<file> — serve one asset out of the Marque
 * variant library.
 *
 * The library deliberately lives OUTSIDE this repo (see marque-library.ts): the
 * repo is public and auto-pushed every ~15 minutes, and a variant library
 * carries product names, offers and concepts. That means assets cannot sit in
 * public/ and be served statically, so this route is the only bridge.
 *
 * It is read-only and narrow on purpose. Everything below is a containment
 * check, because "read a path the caller supplied" is the shape of a directory
 * traversal, and this process can see the operator's whole home directory.
 */

import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

import { libraryDir } from "@/lib/marque-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Only these. No svg (scriptable), no html, no json. */
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
};

function deny(status: number, why: string) {
  return new Response(why, { status, headers: { "cache-control": "no-store" } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments = [] } = await params;

  if (segments.length === 0) return deny(404, "not found");

  // No traversal, no absolute segments, no NUL, no dotfiles. Reject rather than
  // sanitise: silently rewriting a hostile path teaches nobody anything and
  // tends to leave one encoding unhandled.
  for (const seg of segments) {
    if (
      !seg ||
      seg === "." ||
      seg === ".." ||
      seg.startsWith(".") ||
      seg.includes("\0") ||
      seg.includes("/") ||
      seg.includes("\\")
    ) {
      return deny(400, "bad path");
    }
  }

  const ext = path.extname(segments[segments.length - 1] ?? "").toLowerCase();
  const type = CONTENT_TYPES[ext];
  if (!type) return deny(415, "unsupported type");

  const root = path.resolve(libraryDir());
  const target = path.resolve(root, ...segments);

  // Belt and braces: even with the segment checks above, confirm containment on
  // the RESOLVED path. A symlink inside the library could still point out of it.
  if (target !== root && !target.startsWith(root + path.sep)) {
    return deny(400, "outside library");
  }

  let stat;
  try {
    // lstat, not stat: a symlink must be refused rather than followed.
    stat = await fs.lstat(target);
  } catch {
    return deny(404, "not found");
  }
  if (stat.isSymbolicLink()) return deny(400, "symlink refused");
  if (!stat.isFile()) return deny(404, "not found");

  const body = await fs.readFile(target);
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": type,
      "content-length": String(stat.size),
      // Immutable: an asset filename carries the variant id, which never changes
      // meaning. A re-cut gets a new seq and therefore a new filename.
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
      "content-disposition": "inline",
    },
  });
}
