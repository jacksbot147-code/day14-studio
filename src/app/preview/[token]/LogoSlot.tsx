"use client";

/**
 * LogoSlot — optional generated-logo island for the preview's brand starter.
 *
 * On mount it asks /api/preview-asset for a logo. That route returns nothing
 * unless OPENAI_API_KEY is set, so this renders NOTHING by default (text-only
 * brand starter stays as-is). The moment image generation is switched on, a
 * generated logo appears here — no other change needed. Never blocks render.
 */

import { useEffect, useState } from "react";

export default function LogoSlot({ token }: { token: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/preview-asset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, kind: "logo" }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { dataUrl?: string | null } | null) => {
        if (alive && j && j.dataUrl) setSrc(j.dataUrl);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [token]);

  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      style={{
        width: 112,
        height: 112,
        objectFit: "contain",
        display: "block",
        margin: "0 0 16px",
      }}
    />
  );
}
