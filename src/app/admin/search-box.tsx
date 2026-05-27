"use client";

/**
 * search-box.tsx — the client-side input for the empire-wide search surface.
 *
 * Sits inside `AdminNav` so every admin page has one always-visible search
 * affordance. Submits to `/admin/search?q=…` and lets the server-rendered
 * results page do the actual matching — there is no client-side fetch of
 * empire data.
 */

import { useState } from "react";

interface Props {
  /** The current query, so the box echoes back what the user just searched. */
  initialQuery?: string;
}

export function SearchBox({ initialQuery = "" }: Props) {
  const [value, setValue] = useState(initialQuery);

  return (
    <form action="/admin/search" method="GET" className="nav-search-form" role="search">
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search empire…"
        aria-label="Search across the empire"
        className="search-input nav-search-input"
        autoComplete="off"
        spellCheck={false}
      />
    </form>
  );
}
