"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ *
 * Life Loophole — advisor input panel + results (client leaf).
 * Free-text situation → POST /api/.../advisor-agent → ranked, sourced
 * strategy set. Extracted from advisor/page.tsx so the page chrome
 * (nav, header, footer, CSS) stays server-rendered.
 * ------------------------------------------------------------------ */

const PLABEL: Record<string, string> = {
  "individuals-families": "Individuals & Families",
  "freelancers-creators": "Freelancers & Creators",
  "small-business": "Small Business",
  "investors-high-earners": "Investors & High Earners",
  "legal-entities": "Legal Entities",
};

interface StrategyCard {
  id: string;
  name: string;
  summary: string;
  what_it_is: string;
  does_it_fit_you: string;
  rough_impact: string;
  effort: string;
  risk: string;
  action_steps: string;
  source: string;
  current_as_of: string;
  professional_needed: boolean;
  group: string;
  professional_banner: string;
  questions_for_a_pro: string[];
}

interface AdvisorResult {
  readback: string;
  personas: string[];
  intro: string;
  clarifying_question: string;
  out_of_catalog: boolean;
  refused: boolean;
  message: string;
  strategies: StrategyCard[];
  disclaimer: string;
  tax_year: string;
}

const EXAMPLES: string[] = [
  "I freelance as a designer, make about $90k on 1099s, work from a spare " +
    "room, and have no retirement savings yet. What should I be doing?",
  "We are a married couple with two young kids, both W-2, and we pay for " +
    "daycare. I also have a small brokerage account.",
  "I run an LLC that nets around $150k. People keep telling me to become " +
    "an S-corp — does that make sense and what else am I missing?",
  "I sold a rental property this year for a big gain and I am about to " +
    "buy another one.",
];

function RiskBadge({ risk }: { risk: string }) {
  const cls =
    risk === "low" ? "r-low" : risk === "high" ? "r-high" : "r-medium";
  return <span className={"bdg " + cls}>{risk} risk</span>;
}

function Card({ s }: { s: StrategyCard }) {
  const flagged = s.professional_needed || s.risk === "high";
  return (
    <div className={flagged ? "scard pro" : "scard"}>
      <div className="snm">{s.name}</div>
      <div className="ssm">{s.summary}</div>
      <div className="badges">
        <span className="bdg">{s.effort} effort</span>
        <RiskBadge risk={s.risk} />
        {s.professional_needed ? (
          <span className="bdg pro">Pro needed</span>
        ) : null}
      </div>
      {s.professional_banner ? (
        <div className="pro-banner">
          <b>This one needs a licensed professional before you act.</b>{" "}
          {s.professional_banner}
        </div>
      ) : null}
      <div className="drow">
        <div className="k">What it is</div>
        <div className="v">{s.what_it_is}</div>
      </div>
      <div className="drow">
        <div className="k">Does it fit you</div>
        <div className="v">{s.does_it_fit_you}</div>
      </div>
      <div className="drow">
        <div className="k">Rough impact</div>
        <div className="v">{s.rough_impact}</div>
      </div>
      <div className="drow">
        <div className="k">What you actually do</div>
        <div className="v">{s.action_steps}</div>
      </div>
      {s.questions_for_a_pro.length > 0 ? (
        <div className="drow">
          <div className="k">What to ask a professional</div>
          <ul className="qlist">
            {s.questions_for_a_pro.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="drow">
        <div className="k">Source</div>
        <div className="v src">
          {s.source} &middot; current as of {s.current_as_of}
        </div>
      </div>
    </div>
  );
}

function ResultView({ result }: { result: AdvisorResult }) {
  const quick = result.strategies.filter((s) => s.group === "quick-win");
  const bigger = result.strategies.filter((s) => s.group !== "quick-win");

  return (
    <div className="result">
      <div className="intro-line">{result.intro}</div>

      {result.readback ? (
        <div className="readback">
          <div className="rh">Here is how we read your situation</div>
          <p>{result.readback}</p>
          {result.personas.length > 0 ? (
            <div className="pers">
              {result.personas.map((p) => (
                <span key={p} className="ptag">
                  {PLABEL[p] || p}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {result.clarifying_question ? (
        <div className="notice clarify">
          <div className="nh">One quick question first</div>
          {result.clarifying_question}
        </div>
      ) : null}

      {result.refused ? (
        <div className="notice refuse">
          <div className="nh">Life Loophole cannot help with that</div>
          {result.message ||
            "Life Loophole only covers legal, code-sanctioned tax strategy. " +
              "It cannot help with evasion, hiding income, or anything that " +
              "bends the law."}
        </div>
      ) : null}

      {result.out_of_catalog && !result.refused ? (
        <div className="notice gap">
          <div className="nh">Outside the sourced catalog</div>
          {result.message ||
            "I do not have a sourced strategy for that in the Loophole " +
              "Catalog, so I cannot give you a grounded answer. This is a " +
              "good one to take to a licensed tax professional."}
        </div>
      ) : null}

      {quick.length > 0 ? (
        <>
          <h2 className="group-h">Quick wins</h2>
          <div className="group-sub">
            Lower-effort, lower-risk strategies worth a close look first.
          </div>
          {quick.map((s) => (
            <Card key={s.id} s={s} />
          ))}
        </>
      ) : null}

      {bigger.length > 0 ? (
        <>
          <h2 className="group-h">Bigger moves</h2>
          <div className="group-sub">
            Higher-impact strategies that take more effort or licensed
            professional input — explained fully so you know what to weigh.
          </div>
          {bigger.map((s) => (
            <Card key={s.id} s={s} />
          ))}
        </>
      ) : null}

      <div className="disclaimer">
        <b>Educational information only.</b> {result.disclaimer}
      </div>
    </div>
  );
}

export function AdvisorPanel() {
  const [situation, setSituation] = useState("");
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    if (situation.trim().length < 8) {
      setErr(
        "Tell the advisor a bit more about your situation so it can find " +
          "the strategies that fit you.",
      );
      return;
    }
    setLoading(true);
    setErr("");
    setResult(null);
    try {
      const res = await fetch("/api/brands/life-loophole/advisor-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation }),
      });
      const data: {
        ok?: boolean;
        result?: AdvisorResult;
        message?: string;
      } = await res.json();
      if (data.ok && data.result) {
        setResult(data.result);
      } else {
        setErr(data.message || "The advisor is not available right now.");
      }
    } catch {
      setErr("Could not reach the advisor right now — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="panel">
        <div className="q">
          Your tax situation — the more you say, the sharper the answer.
        </div>
        <textarea
          value={situation}
          onChange={(ev) => setSituation(ev.target.value)}
          placeholder={
            "For example: I freelance, made around $80k last year on " +
            "1099s, work from home, and have no retirement account yet…"
          }
          aria-label="Describe your tax situation"
        />
        <div className="ex-label">
          Not sure where to start? Try one of these:
        </div>
        <div className="ex-row">
          {EXAMPLES.map((ex, i) => (
            <div
              key={i}
              className="ex"
              onClick={() => setSituation(ex)}
            >
              {ex.length > 58 ? ex.slice(0, 56) + "…" : ex}
            </div>
          ))}
        </div>
        <div className="actions">
          <button className="btn" onClick={run} disabled={loading}>
            {loading
              ? "Reading your situation…"
              : "Find my strategies"}
          </button>
          <span className="hint">
            Educational only &middot; no signup &middot; we never ask for
            a Social Security number or account numbers.
          </span>
        </div>
        {err ? <div className="err">{err}</div> : null}
      </div>

      {result ? <ResultView result={result} /> : null}
    </>
  );
}
