"use client";

import { useState } from "react";
import { CATALOG } from "./catalog";
import type { LoopholeEntry } from "./catalog";

/* ------------------------------------------------------------------ *
 * Life Loophole — the interactive Loophole Finder (client leaf).
 * Situation toggles + free-text search → scored strategy cards, plus
 * the "weave" synthesis call to the advisor API. Extracted from
 * page.tsx so the landing page itself stays a server component.
 * ------------------------------------------------------------------ */

const PLABEL: Record<string, string> = {
  "individuals-families": "Individuals & Families",
  "freelancers-creators": "Freelancers & Creators",
  "small-business": "Small Business",
  "investors-high-earners": "Investors & High Earners",
  "legal-entities": "Legal Entities",
};

interface Situation {
  id: string;
  label: string;
  personas: string[];
  kw: string[];
}

const SITUATIONS: Situation[] = [
  { id: "w2", label: "I have a regular job (W-2)", personas: ["individuals-families"], kw: ["employee", "withhold", "workplace", "wages", "401(k)", "403(b)"] },
  { id: "free", label: "I freelance or have a side hustle", personas: ["freelancers-creators"], kw: ["self-employ", "freelanc", "schedule c", "side", "1099", "gig", "sole propriet"] },
  { id: "biz", label: "I run a business", personas: ["small-business"], kw: ["business", "employer", "payroll", "employee"] },
  { id: "kids", label: "I have kids or dependents", personas: ["individuals-families"], kw: ["child", "dependent", "care", "family"] },
  { id: "edu", label: "I’m paying for education", personas: ["individuals-families", "freelancers-creators"], kw: ["education", "tuition", "student", "529", "school", "learning"] },
  { id: "home", label: "I own a home", personas: ["individuals-families"], kw: ["home", "mortgage", "augusta", "residence"] },
  { id: "inv", label: "I invest — stocks, funds, crypto", personas: ["investors-high-earners"], kw: ["capital gain", "investment", "brokerage", "loss", "dividend", "stock", "harvest"] },
  { id: "re", label: "I own real estate or rentals", personas: ["investors-high-earners"], kw: ["real estate", "rental", "depreciation", "1031", "property", "cost segregation"] },
  { id: "ent", label: "I have an LLC, S-corp, or entity", personas: ["legal-entities", "small-business"], kw: ["llc", "s-corp", "s corporation", "c-corp", "entity", "corporation", "partnership", "trust", "election"] },
  { id: "highearner", label: "I’m a high earner", personas: ["investors-high-earners"], kw: ["high earner", "high income", "backdoor", "net investment", "phase-out", "phase out"] },
  { id: "retire", label: "I’m saving for retirement", personas: [], kw: ["retirement", "ira", "401(k)", "403(b)", "sep", "simple", "roth", "pension", "catch-up"] },
  { id: "charity", label: "I give to charity", personas: [], kw: ["charit", "donor", "donation", "qcd", "qualified charitable"] },
  { id: "health", label: "I have medical or health costs", personas: [], kw: ["hsa", "medical", "health", "fsa", "premium"] },
  { id: "estate", label: "I’m planning my estate or gifting", personas: ["legal-entities"], kw: ["estate", "gift", "trust", "exemption", "inherit"] },
  { id: "sold", label: "I sold investments or property this year", personas: ["investors-high-earners"], kw: ["capital gain", "sale", "sold", "1031", "exchange", "harvest", "loss"] },
];

function hay(e: LoopholeEntry): string {
  return (e.name + " " + e.summary + " " + e.explanation + " " + e.eligibility).toLowerCase();
}

function StrategyCard({ e, idx }: { e: LoopholeEntry; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={open ? "card open" : "card"}
      onClick={() => setOpen((o) => !o)}
      style={{ animationDelay: `${Math.min(idx, 12) * 35}ms` }}
    >
      <div className="nm">{e.name}</div>
      <div className="sm">{e.summary}</div>
      <div className="badges">
        {e.personas.map((p) => (
          <span key={p} className="bdg p">{PLABEL[p] || p}</span>
        ))}
        <span className={"bdg r-" + e.risk_level}>{e.risk_level} risk</span>
        {e.professional_needed ? <span className="bdg pro">Pro</span> : null}
      </div>
      <div className="detail">
        <div className="drow"><div className="k">How it works</div><div className="v">{e.explanation}</div></div>
        <div className="drow"><div className="k">Who qualifies</div><div className="v">{e.eligibility}</div></div>
        <div className="drow"><div className="k">Potential impact</div><div className="v">{e.estimated_impact}</div></div>
        <div className="drow"><div className="k">What you do</div><div className="v">{e.action_steps}</div></div>
        <div className="drow"><div className="k">IRS source</div><div className="v src">{e.source} &middot; current as of {e.current_as_of}</div></div>
      </div>
    </div>
  );
}

export function LoopholeFinder() {
  const [picked, setPicked] = useState<string[]>(["w2"]);
  const [query, setQuery] = useState("");
  const [weave, setWeave] = useState("");
  const [weaveErr, setWeaveErr] = useState("");
  const [weaveLoading, setWeaveLoading] = useState(false);

  const resetWeave = () => {
    setWeave("");
    setWeaveErr("");
  };
  const toggle = (id: string) => {
    resetWeave();
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const sits = SITUATIONS.filter((s) => picked.includes(s.id));
  const q = query.trim().toLowerCase();
  const words = q ? q.split(/\s+/).filter((w) => w.length > 1) : [];

  let results: LoopholeEntry[] = [];
  if (sits.length || q) {
    const scored = CATALOG.map((e) => {
      const h = hay(e);
      let toggleScore = 0;
      sits.forEach((s) => {
        if (e.personas.some((p) => s.personas.includes(p))) toggleScore += 3;
        s.kw.forEach((k) => {
          if (h.includes(k)) toggleScore += 1;
        });
      });
      let searchScore = 0;
      words.forEach((w) => {
        if (h.includes(w)) searchScore += 1;
      });
      if (q && h.includes(q)) searchScore += 3;
      return { e, toggleScore, searchScore };
    });
    const filtered = q
      ? scored.filter((x) => x.searchScore > 0)
      : scored.filter((x) => x.toggleScore > 0);
    results = filtered
      .sort(
        (a, b) =>
          b.searchScore * 2 + b.toggleScore - (a.searchScore * 2 + a.toggleScore) ||
          a.e.name.localeCompare(b.e.name),
      )
      .slice(0, 24)
      .map((x) => x.e);
  }

  async function runWeave() {
    setWeaveLoading(true);
    setWeave("");
    setWeaveErr("");
    try {
      const res = await fetch("/api/brands/life-loophole/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situations: sits.map((s) => s.label),
          query: q,
          strategies: results.slice(0, 12).map((e) => e.id),
        }),
      });
      const data: { ok?: boolean; reasoning?: string; message?: string } = await res.json();
      if (data.ok && data.reasoning) setWeave(data.reasoning);
      else setWeaveErr(data.message || "The advisor is not available right now.");
    } catch {
      setWeaveErr("Could not reach the advisor right now — please try again.");
    } finally {
      setWeaveLoading(false);
    }
  }

  const emptyMsg = q
    ? "No strategies match that search — try a simpler word, or tap a situation below."
    : "Search above, or tap what is true for you, to see your strategies.";

  return (
    <div className="finder-panel">
      <div className="q">Search the 48 strategies — or tap what is true for you.</div>
      <input
        className="finder-search"
        type="search"
        value={query}
        onChange={(ev) => {
          resetWeave();
          setQuery(ev.target.value);
        }}
        placeholder="Search — e.g. crypto, retirement, home office, S-corp, child…"
        aria-label="Search tax strategies"
      />
      <div className="toggles">
        {SITUATIONS.map((s) => (
          <div
            key={s.id}
            className={picked.includes(s.id) ? "toggle on" : "toggle"}
            onClick={() => toggle(s.id)}
          >
            {s.label}
          </div>
        ))}
      </div>
      <div className="finder-bar">
        <span className="n">{results.length}</span>
        <span className="t">{results.length === 1 ? "strategy found" : "strategies found"}</span>
      </div>
      <div className="finder-note">
        Educational only — not tax advice. Every strategy here is legal and IRS-sourced;
        confirm your situation with a licensed professional before you act. Tap any card to open it.
      </div>
      <div className="cards">
        {results.length === 0 ? (
          <div className="empty">{emptyMsg}</div>
        ) : (
          results.map((e, i) => <StrategyCard key={e.id} e={e} idx={i} />)
        )}
      </div>
      {results.length >= 2 ? (
        <div className="weave">
          <div className="weave-intro">
            Picked a few situations? See how these strategies actually fit together for you —
            how they stack, what order to consider them in, and where one affects another.
          </div>
          <button className="btn weave-btn" onClick={runWeave} disabled={weaveLoading}>
            {weaveLoading
              ? "Thinking through how these fit together…"
              : "See how these strategies weave together"}
          </button>
          {weave ? (
            <div className="weave-out">
              <div className="weave-h">How your strategies weave together</div>
              <div className="weave-body">
                {weave
                  .split("\n")
                  .map((para) => para.trim())
                  .filter((para) => para.length > 0)
                  .map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
              </div>
              <div className="weave-disc">
                Educational synthesis only — not tax advice. Confirm with a licensed professional.
              </div>
            </div>
          ) : null}
          {weaveErr ? <div className="weave-err">{weaveErr}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
