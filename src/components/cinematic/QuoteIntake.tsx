"use client";

/**
 * cinematic/QuoteIntake — the "booking" quote-intake widget (task 4/8, row 02).
 *
 * Port of the locked prototype's `.q` block: a customer types what they need in
 * plain language; the widget parses it into structured fields (service / area /
 * cadence / status) and reveals a "parsed · structured · booked" card — showing
 * what the platform does with an inbound request.
 *
 * ── Backend wiring (read before changing) ───────────────────────────────────
 * The real endpoint is POST /api/intake. It HARD-REQUIRES `fields.email` and
 * `fields.company_name` (it 400s otherwise — see src/app/api/intake/route.ts)
 * and writes a real event + tenant-inbox record + work-register entry. This
 * marketing widget only collects a single free-text line — it has neither an
 * email nor a company name — so its parsed shape does NOT satisfy the endpoint.
 *
 * Per the task guardrail ("POST … if it accepts this shape; otherwise run in
 * explicit demo-mode and stage the payload — never invent a backend"), this
 * widget runs in clearly-labelled DEMO mode: it parses locally, renders the
 * result, and STAGES a payload already shaped to the route's `IntakeBody`
 * contract (so a future real intake form can submit it unchanged) without
 * firing a network request. Nothing is sent. The staged payload is exposed on
 * `window.__day14StagedIntake` and console-logged for inspection/QA.
 *
 * Parser mirrors the prototype's keyword map and is extended to also emit the
 * `service_description` / `city` / `notes` fields the real route expects.
 */

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

/** Mirror of the relevant slice of /api/intake's IntakeBody contract. */
interface StagedIntakePayload {
  source: string;
  sku: string | null;
  fields: {
    service_description: string;
    city: string;
    // The route also wants email + company_name; this widget can't collect
    // them, which is exactly why we stage rather than POST.
    email?: string;
    company_name?: string;
    notes: string;
  };
  /** Parsed presentation fields (what the card shows). Not part of IntakeBody. */
  parsed: ParsedQuote;
  demo: true;
}

interface ParsedQuote {
  service: string;
  area: string;
  cadence: string;
  status: string;
}

const SAMPLE = "Need a deep clean for my salon every two weeks in Fort Myers";

const AREAS = [
  "naples",
  "bonita",
  "estero",
  "cape coral",
  "fort myers",
  "sarasota",
] as const;

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** Parse a free-text request into structured fields (mirrors the prototype). */
function parseQuote(raw: string): ParsedQuote {
  const v = raw.toLowerCase();

  const service = v.includes("pool")
    ? "Pool service"
    : v.includes("lawn")
      ? "Lawn care"
      : v.includes("clean")
        ? "Cleaning"
        : v.includes("hvac")
          ? "HVAC"
          : v.includes("wash")
            ? "Pressure washing"
            : v.includes("salon")
              ? "Salon / spa"
              : v.includes("food") || v.includes("truck") || v.includes("cater")
                ? "Food / events"
                : "Service request";

  const areaMatch = AREAS.find((a) => v.includes(a));
  const area = areaMatch ? titleCase(areaMatch) : "SWFL";

  const cadence =
    v.includes("two week") || v.includes("biweek") || v.includes("bi-week")
      ? "Every 2 weeks"
      : v.includes("week")
        ? "Weekly"
        : v.includes("month")
          ? "Monthly"
          : v.includes("event")
            ? "One-time event"
            : "One-time";

  return { service, area, cadence, status: "new lead" };
}

export function QuoteIntake() {
  const [value, setValue] = useState(SAMPLE);
  const [parsed, setParsed] = useState<ParsedQuote | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = useCallback(() => {
    const text = (inputRef.current?.value ?? value).trim();
    if (!text) return;
    const result = parseQuote(text);
    setParsed(result);

    // Stage (do NOT send) a payload shaped to /api/intake's IntakeBody.
    const staged: StagedIntakePayload = {
      source: "homepage-quote-widget",
      sku: null,
      fields: {
        service_description: text,
        city: result.area,
        notes: `cadence=${result.cadence}; parsed_service=${result.service}`,
      },
      parsed: result,
      demo: true,
    };
    if (typeof window !== "undefined") {
      (window as unknown as { __day14StagedIntake?: StagedIntakePayload }).__day14StagedIntake =
        staged;
      // eslint-disable-next-line no-console
      console.info(
        "[Day14 quote widget — DEMO] staged intake payload (not sent):",
        staged,
      );
    }
  }, [value]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        run();
      }
    },
    [run],
  );

  return (
    <div className="cin-q">
      <div className="cin-q-row">
        <label className="cin-sr-only" htmlFor="cin-q-input">
          Describe the service you need
        </label>
        <input
          id="cin-q-input"
          ref={inputRef}
          className="cin-q-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="What do you need, and how often?"
          autoComplete="off"
        />
        <button type="button" className="cin-q-go" onClick={run}>
          Send
        </button>
      </div>

      <div className="cin-q-hint cin-mono">
        try: “weekly pool service in Naples” · “monthly HVAC tune-up” · “food
        truck booking for an event”
      </div>

      <div
        className={`cin-q-card${parsed ? " cin-q-card-show" : ""}`}
        aria-live="polite"
      >
        {parsed ? (
          <>
            <div className="cin-q-card-head cin-mono">
              <span className="cin-dot" aria-hidden="true" />
              parsed · structured · staged
              <span className="cin-q-demo-tag">demo</span>
            </div>
            <div className="cin-q-card-body">
              <div className="cin-q-field">
                service
                <b>{parsed.service}</b>
              </div>
              <div className="cin-q-field">
                area
                <b>{parsed.area}</b>
              </div>
              <div className="cin-q-field">
                cadence
                <b>{parsed.cadence}</b>
              </div>
              <div className="cin-q-field">
                status
                <b className="cin-q-status">{parsed.status}</b>
              </div>
              <div className="cin-q-booked cin-mono">
                <span className="cin-dot" aria-hidden="true" />
                staged for the board · this is a live demo, nothing was sent
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default QuoteIntake;
