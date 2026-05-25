"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ *
 * Life Loophole — the full advisor agent surface.
 * (day14.us/brands/life-loophole/advisor)
 *
 * The visitor describes their tax situation in free text and gets back a
 * personalized, ranked, sourced strategy set: a situation read-back with
 * detected persona(s), strategy cards grouped into quick wins vs. bigger
 * moves, professional-needed banners, and the mandatory disclaimer.
 *
 * Educational content only — not tax advice. Every strategy is grounded in
 * the sourced Loophole Catalog by the /api/.../advisor-agent route.
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

const CSS = `
.ll-root{
  --bg:#fbfaf7;--bg2:#f1f0ea;--card:#ffffff;--ink:#13211d;--ink2:#3b4a44;
  --muted:#6a7872;--line:#e4e3db;--teal:#0f766e;--teal-dk:#0a4f49;
  --teal-soft:#e3f0ee;--teal-tint:#f0f7f5;--gold:#b07d2b;--gold-soft:#f6eddc;
  --red-soft:#fbe9e6;--red:#b3402f;
  --serif:Georgia,'Times New Roman',serif;
  --sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  background:var(--bg);color:var(--ink);font-family:var(--sans);line-height:1.6;
  -webkit-font-smoothing:antialiased;min-height:100vh;
}
.ll-root *{box-sizing:border-box;}
.ll-root h1,.ll-root h2,.ll-root h3{font-family:var(--serif);font-weight:400;
  letter-spacing:-0.01em;line-height:1.15;margin:0;}
.ll-root a{color:inherit;}
.ll-root .wrap{max-width:880px;margin:0 auto;padding:0 22px;}
.ll-root .eyebrow{font-family:var(--sans);font-size:12px;font-weight:700;
  letter-spacing:.14em;text-transform:uppercase;color:var(--teal);}
.ll-root nav{position:sticky;top:0;z-index:50;background:rgba(251,250,247,.93);
  backdrop-filter:blur(8px);border-bottom:1px solid var(--line);}
.ll-root nav .row{display:flex;align-items:center;gap:18px;height:62px;
  max-width:880px;margin:0 auto;padding:0 22px;}
.ll-root .brand{display:flex;align-items:center;gap:9px;font-family:var(--serif);
  font-size:20px;color:var(--ink);text-decoration:none;}
.ll-root .mark{width:26px;height:26px;border-radius:7px;background:var(--teal);
  display:flex;align-items:center;justify-content:center;color:#fff;
  font-family:var(--serif);font-size:15px;flex:none;}
.ll-root nav .back{margin-left:auto;font-size:13.5px;color:var(--ink2);
  text-decoration:none;font-weight:600;}
.ll-root nav .back:hover{color:var(--teal);}
.ll-root .head{padding:54px 0 28px;
  background:radial-gradient(800px 320px at 80% -10%,var(--teal-soft),transparent 70%);}
.ll-root .head h1{font-size:40px;max-width:18ch;margin:14px 0 0;}
.ll-root .head .sub{font-size:17px;color:var(--ink2);max-width:60ch;margin:16px 0 0;}
.ll-root section{padding:0 0 56px;}
.ll-root .panel{background:var(--card);border:1px solid var(--line);
  border-radius:16px;padding:24px;margin-top:8px;}
.ll-root .panel .q{font-size:13px;font-weight:700;color:var(--ink);margin-bottom:10px;}
.ll-root textarea{width:100%;min-height:130px;padding:13px 15px;font-size:14.5px;
  font-family:var(--sans);line-height:1.6;border:1px solid var(--line);
  border-radius:10px;background:var(--bg);color:var(--ink);resize:vertical;}
.ll-root textarea:focus{outline:2px solid var(--teal-soft);border-color:var(--teal);}
.ll-root .ex-label{font-size:12px;color:var(--muted);margin:14px 0 7px;}
.ll-root .ex-row{display:flex;flex-wrap:wrap;gap:7px;}
.ll-root .ex{font-size:12.5px;padding:7px 11px;border-radius:999px;cursor:pointer;
  background:var(--bg);color:var(--ink2);border:1px solid var(--line);
  user-select:none;transition:.12s;}
.ll-root .ex:hover{border-color:var(--teal);color:var(--teal);}
.ll-root .actions{display:flex;align-items:center;gap:14px;margin-top:16px;
  flex-wrap:wrap;}
.ll-root .btn{display:inline-block;background:var(--teal);color:#fff;
  text-decoration:none;font-size:14.5px;font-weight:700;padding:13px 24px;
  border-radius:9px;border:none;cursor:pointer;font-family:var(--sans);transition:.14s;}
.ll-root .btn:hover{background:var(--teal-dk);}
.ll-root .btn:disabled{opacity:.6;cursor:default;}
.ll-root .hint{font-size:12px;color:var(--muted);}
.ll-root .err{margin-top:16px;font-size:13.5px;color:var(--ink2);background:var(--card);
  border:1px solid var(--line);border-left:3px solid var(--gold);
  border-radius:9px;padding:13px 15px;}
.ll-root .result{margin-top:26px;}
.ll-root .intro-line{font-size:12.5px;color:var(--muted);font-style:italic;
  margin-bottom:14px;}
.ll-root .readback{background:var(--teal-tint);border:1px solid var(--line);
  border-left:3px solid var(--teal);border-radius:11px;padding:16px 18px;}
.ll-root .readback .rh{font-family:var(--serif);font-size:17px;
  color:var(--teal-dk);margin-bottom:6px;}
.ll-root .readback p{font-size:14px;color:var(--ink2);margin:0;}
.ll-root .pers{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px;}
.ll-root .ptag{font-size:10.5px;font-weight:700;text-transform:uppercase;
  letter-spacing:.04em;padding:4px 9px;border-radius:6px;
  background:var(--teal-soft);color:var(--teal-dk);}
.ll-root .notice{margin-top:16px;font-size:14px;color:var(--ink2);
  background:var(--card);border:1px solid var(--line);border-radius:11px;
  padding:16px 18px;}
.ll-root .notice.gap{border-left:3px solid var(--gold);}
.ll-root .notice.refuse{border-left:3px solid var(--red);}
.ll-root .notice.clarify{border-left:3px solid var(--teal);}
.ll-root .notice .nh{font-weight:700;color:var(--ink);margin-bottom:5px;}
.ll-root .group-h{font-family:var(--serif);font-size:22px;color:var(--ink);
  margin:28px 0 4px;}
.ll-root .group-sub{font-size:13px;color:var(--muted);margin-bottom:14px;}
.ll-root .scard{background:var(--card);border:1px solid var(--line);
  border-radius:13px;padding:18px 19px;margin-bottom:12px;}
.ll-root .scard.pro{border-left:3px solid var(--gold);}
.ll-root .scard .snm{font-size:17px;font-weight:700;letter-spacing:-0.01em;}
.ll-root .scard .ssm{font-size:13.5px;color:var(--muted);margin-top:4px;}
.ll-root .badges{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px;}
.ll-root .bdg{font-size:10px;font-weight:700;text-transform:uppercase;
  letter-spacing:.04em;padding:3px 7px;border-radius:5px;
  background:#eef1ef;color:var(--muted);}
.ll-root .bdg.pro{background:var(--gold-soft);color:var(--gold);}
.ll-root .bdg.r-low{background:#e3f1ee;color:#0f766e;}
.ll-root .bdg.r-medium{background:#fbf2dc;color:#9a6b00;}
.ll-root .bdg.r-high{background:var(--red-soft);color:var(--red);}
.ll-root .pro-banner{margin-top:12px;background:var(--gold-soft);
  border-radius:8px;padding:11px 13px;font-size:12.5px;color:#7a5417;}
.ll-root .pro-banner b{color:var(--gold);}
.ll-root .drow{margin-top:11px;}
.ll-root .drow .k{font-size:10.5px;font-weight:700;text-transform:uppercase;
  letter-spacing:.05em;color:var(--teal-dk);}
.ll-root .drow .v{font-size:13.5px;color:var(--ink2);margin-top:2px;}
.ll-root .drow .v.src{font-style:italic;color:var(--muted);font-size:12.5px;}
.ll-root .qlist{margin:4px 0 0;padding-left:18px;}
.ll-root .qlist li{font-size:13px;color:var(--ink2);margin-bottom:3px;}
.ll-root .disclaimer{margin-top:26px;font-size:12.5px;color:var(--ink2);
  background:var(--bg2);border:1px solid var(--line);border-radius:10px;
  padding:15px 17px;line-height:1.65;}
.ll-root .disclaimer b{color:var(--ink);}
.ll-root .foot{border-top:1px solid var(--line);padding:26px 0 40px;
  font-size:12px;color:var(--muted);}
@media(max-width:760px){
  .ll-root .head h1{font-size:29px;} .ll-root .head{padding:38px 0 22px;}
}
`;

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

export default function LifeLoopholeAdvisor() {
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
    <div className="ll-root">
      <style>{CSS}</style>

      <nav>
        <div className="row">
          <a className="brand" href="/brands/life-loophole">
            <span className="mark">L</span>Life Loophole
          </a>
          <a className="back" href="/brands/life-loophole">
            &larr; Back to the main site
          </a>
        </div>
      </nav>

      <header className="head">
        <div className="wrap">
          <div className="eyebrow">The Loophole Advisor</div>
          <h1>Describe your situation. Get the strategies that fit you.</h1>
          <p className="sub">
            Tell the advisor about your work, your household, and what you are
            trying to do — in plain words. It reads your situation, detects who
            you are as a taxpayer, and hands back the legal, IRS-sourced
            strategies that apply, ranked and broken into next steps.
          </p>
        </div>
      </header>

      <section>
        <div className="wrap">
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
        </div>
      </section>

      <footer className="foot">
        <div className="wrap">
          Life Loophole &middot; A Day14 company &middot; Tax strategy,
          decoded. Educational information only — not tax, legal, or financial
          advice.
        </div>
      </footer>
    </div>
  );
}
