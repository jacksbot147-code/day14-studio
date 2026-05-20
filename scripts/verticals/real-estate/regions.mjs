/**
 * regions.mjs — region -> counties expansion for the realty scout.
 *
 * Jack can Telegram a single county ("Travis County, TX") or a whole metro
 * ("Tampa Bay area"). This module parses either form into a clean list of
 * { county, state } targets and expands known metros into their counties.
 * An unrecognized region returns { type: "unknown-region" } so the bot can
 * ask Jack to name the counties explicitly.
 *
 * Self-contained — Node builtins only.
 */

// US state name -> USPS abbreviation (+ DC).
const STATE_NAMES = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY", "district of columbia": "DC",
};
const STATE_ABBRS = new Set(Object.values(STATE_NAMES));

/** Resolve a state name or abbreviation to its USPS code, or "" if unknown. */
export function normalizeState(s) {
  const v = String(s || "").trim().toLowerCase();
  if (!v) return "";
  if (STATE_ABBRS.has(v.toUpperCase())) return v.toUpperCase();
  return STATE_NAMES[v] || "";
}

// Major US metros -> their core counties. Not exhaustive — an unrecognized
// region falls back to "name the counties yourself".
export const METRO_COUNTIES = {
  "tampa bay": [
    { county: "Hillsborough", state: "FL" }, { county: "Pinellas", state: "FL" },
    { county: "Pasco", state: "FL" }, { county: "Hernando", state: "FL" },
  ],
  "southwest florida": [
    { county: "Lee", state: "FL" }, { county: "Collier", state: "FL" },
    { county: "Charlotte", state: "FL" },
  ],
  "orlando": [
    { county: "Orange", state: "FL" }, { county: "Seminole", state: "FL" },
    { county: "Osceola", state: "FL" }, { county: "Lake", state: "FL" },
  ],
  "south florida": [
    { county: "Miami-Dade", state: "FL" }, { county: "Broward", state: "FL" },
    { county: "Palm Beach", state: "FL" },
  ],
  "jacksonville": [
    { county: "Duval", state: "FL" }, { county: "Clay", state: "FL" },
    { county: "St. Johns", state: "FL" }, { county: "Nassau", state: "FL" },
  ],
  "phoenix": [{ county: "Maricopa", state: "AZ" }, { county: "Pinal", state: "AZ" }],
  "tucson": [{ county: "Pima", state: "AZ" }],
  "atlanta": [
    { county: "Fulton", state: "GA" }, { county: "DeKalb", state: "GA" },
    { county: "Cobb", state: "GA" }, { county: "Gwinnett", state: "GA" },
    { county: "Clayton", state: "GA" },
  ],
  "dallas-fort worth": [
    { county: "Dallas", state: "TX" }, { county: "Tarrant", state: "TX" },
    { county: "Collin", state: "TX" }, { county: "Denton", state: "TX" },
  ],
  "houston": [
    { county: "Harris", state: "TX" }, { county: "Fort Bend", state: "TX" },
    { county: "Montgomery", state: "TX" },
  ],
  "austin": [
    { county: "Travis", state: "TX" }, { county: "Williamson", state: "TX" },
    { county: "Hays", state: "TX" },
  ],
  "san antonio": [{ county: "Bexar", state: "TX" }, { county: "Comal", state: "TX" }],
  "charlotte": [
    { county: "Mecklenburg", state: "NC" }, { county: "Union", state: "NC" },
    { county: "Cabarrus", state: "NC" }, { county: "Gaston", state: "NC" },
  ],
  "raleigh": [
    { county: "Wake", state: "NC" }, { county: "Durham", state: "NC" },
    { county: "Johnston", state: "NC" },
  ],
  "nashville": [
    { county: "Davidson", state: "TN" }, { county: "Williamson", state: "TN" },
    { county: "Rutherford", state: "TN" }, { county: "Wilson", state: "TN" },
  ],
  "memphis": [{ county: "Shelby", state: "TN" }],
  "las vegas": [{ county: "Clark", state: "NV" }],
  "denver": [
    { county: "Denver", state: "CO" }, { county: "Arapahoe", state: "CO" },
    { county: "Jefferson", state: "CO" }, { county: "Adams", state: "CO" },
    { county: "Douglas", state: "CO" },
  ],
  "columbus": [{ county: "Franklin", state: "OH" }, { county: "Delaware", state: "OH" }],
  "indianapolis": [{ county: "Marion", state: "IN" }, { county: "Hamilton", state: "IN" }],
  "kansas city": [
    { county: "Jackson", state: "MO" }, { county: "Clay", state: "MO" },
    { county: "Johnson", state: "KS" },
  ],
  "birmingham": [{ county: "Jefferson", state: "AL" }, { county: "Shelby", state: "AL" }],
  "salt lake city": [{ county: "Salt Lake", state: "UT" }, { county: "Utah", state: "UT" }],
};

// Aliases -> canonical metro key.
const METRO_ALIASES = {
  "swfl": "southwest florida",
  "sw florida": "southwest florida",
  "fort myers": "southwest florida",
  "naples": "southwest florida",
  "dfw": "dallas-fort worth",
  "dallas fort worth": "dallas-fort worth",
  "dallas": "dallas-fort worth",
  "fort worth": "dallas-fort worth",
  "miami": "south florida",
  "the triangle": "raleigh",
  "triangle": "raleigh",
  "vegas": "las vegas",
  "kc": "kansas city",
  "tampa": "tampa bay",
  "st petersburg": "tampa bay",
};

function titleCase(s) {
  return String(s)
    .split(/\s+/)
    .map((w) =>
      w
        .split("-")
        .map((x) => (x ? x[0].toUpperCase() + x.slice(1) : x))
        .join("-")
    )
    .join(" ")
    .trim();
}

/** Look up a metro by name (handles aliases + "area"/"metro"/"region" suffixes). */
export function expandRegion(name) {
  let key = String(name || "").toLowerCase().trim();
  key = key.replace(/\b(greater|metro(?:politan)?|area|region)\b/g, "").replace(/\s+/g, " ").trim();
  if (METRO_ALIASES[key]) key = METRO_ALIASES[key];
  if (METRO_COUNTIES[key]) {
    return { region: titleCase(key), counties: METRO_COUNTIES[key].map((c) => ({ ...c })) };
  }
  // Substring match — catches "the dallas fort worth housing market".
  for (const [alias, canon] of Object.entries(METRO_ALIASES)) {
    if (key.includes(alias)) return { region: titleCase(canon), counties: METRO_COUNTIES[canon].map((c) => ({ ...c })) };
  }
  for (const metro of Object.keys(METRO_COUNTIES)) {
    if (key.includes(metro)) return { region: titleCase(metro), counties: METRO_COUNTIES[metro].map((c) => ({ ...c })) };
  }
  return null;
}

const TRIGGER_WORDS = /^(realty|scout|watch|add|find|source|look|looking|start|begin|please|in|into|on|the|a|an|at|for|me|county-records|properties|deals)\b/i;

/** Strip a trailing state name/abbr from a piece; returns { text, state }. */
function splitTrailingState(piece) {
  const words = piece.trim().split(/\s+/);
  if (words.length >= 2) {
    const two = `${words[words.length - 2]} ${words[words.length - 1]}`.toLowerCase();
    if (STATE_NAMES[two]) return { text: words.slice(0, -2).join(" ").trim(), state: STATE_NAMES[two] };
  }
  if (words.length >= 1) {
    const one = words[words.length - 1].toLowerCase();
    const ab = normalizeState(one);
    if (ab && (STATE_NAMES[one] || STATE_ABBRS.has(one.toUpperCase()))) {
      return { text: words.slice(0, -1).join(" ").trim(), state: ab };
    }
  }
  return { text: piece.trim(), state: "" };
}

/**
 * Parse a free-text request into realty targets.
 * Returns one of:
 *   { type: "counties", counties: [{county,state}] }
 *   { type: "region",   region, counties: [{county,state}] }
 *   { type: "unknown-region", region }
 *   { type: "empty" }
 */
export function parseTargetRequest(raw) {
  let s = String(raw || "").toLowerCase().trim();
  // Strip leading trigger words repeatedly.
  let prev;
  do {
    prev = s;
    s = s.replace(TRIGGER_WORDS, "").trim();
  } while (s !== prev && s.length);
  s = s.replace(/[?.!,]+$/g, "").trim();
  // Drop region-suffix words so "Tampa Bay area" and a bare "Springfield
  // area" both resolve cleanly (no US county name contains these).
  s = s.replace(/\b(metropolitan|metro|greater|area|region)\b/gi, " ").replace(/\s+/g, " ").trim();
  if (!s) return { type: "empty" };

  const hasCountyWord = /\bcount(y|ies)\b/.test(s);

  // Try a known metro first (unless it's explicitly phrased as counties).
  if (!hasCountyWord) {
    const region = expandRegion(s);
    if (region) return { type: "region", region: region.region, counties: region.counties };
  } else {
    // Even with "county" wording, a metro name may still resolve.
    const region = expandRegion(s.replace(/\bcount(y|ies)\b/g, " "));
    if (region && region.counties.length > 1) {
      return { type: "region", region: region.region, counties: region.counties };
    }
  }

  // County parse. Remove the word "county"/"counties", split on separators.
  const cleaned = s.replace(/\bcount(y|ies)\b/g, " ").replace(/\s+/g, " ").trim();
  const pieces = cleaned
    .split(/\s*(?:,|;|\/|&|\band\b|\bplus\b)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);

  let defaultState = "";
  const parsed = [];
  for (const piece of pieces) {
    const { text, state } = splitTrailingState(piece);
    if (state) defaultState = state;
    if (text) parsed.push({ countyText: text, state });
  }
  const counties = parsed
    .map((p) => ({ county: titleCase(p.countyText), state: p.state || defaultState }))
    .filter((c) => c.county);

  // Accept as counties only when we're confident: the word "county" was
  // present, or a state pinned it down. A bare ambiguous name -> ask Jack.
  const hasState = !!defaultState || counties.some((c) => c.state);
  if (counties.length && (hasCountyWord || hasState)) {
    return { type: "counties", counties };
  }
  if (!hasCountyWord) return { type: "unknown-region", region: titleCase(s) };
  return { type: "empty" };
}
