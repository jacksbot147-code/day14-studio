"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Silently re-pulls live server state every `seconds` so the deck stays current. */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), Math.max(5, seconds) * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
