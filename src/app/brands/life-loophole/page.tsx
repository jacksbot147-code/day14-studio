import { CATALOG } from "./catalog";
import type { LoopholeEntry } from "./catalog";
import { StaggerCtas } from "@/components/motion/stagger-ctas";
import { LoopholeFinder } from "./finder";
import { ChecklistForm } from "./checklist-form";

/* ------------------------------------------------------------------ *
 * Life Loophole — brand landing site (day14.us/brands/life-loophole)
 * Server-rendered marketing page. Educational content only — not tax
 * advice. Every strategy is grounded in the sourced catalog.
 *
 * Interactive pieces live in small client leaves:
 *   - ./finder.tsx          — the Loophole Finder (toggles, search, weave)
 *   - ./checklist-form.tsx  — the checklist email capture
 * ------------------------------------------------------------------ */

const CSS = `
.ll-root{
  --bg:#fbfaf7;--bg2:#f1f0ea;--card:#ffffff;--ink:#13211d;--ink2:#3b4a44;
  --muted:#5a685f;--line:#e4e3db;--teal:#0f766e;--teal-dk:#0a4f49;
  --teal-soft:#e3f0ee;--teal-tint:#f0f7f5;--gold:#b07d2b;--gold-dk:#8a5b1d;--gold-soft:#f6eddc;
  --serif:Georgia,'Times New Roman',serif;
  --sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  background:var(--bg);color:var(--ink);font-family:var(--sans);line-height:1.6;
  -webkit-font-smoothing:antialiased;
}
html{scroll-behavior:smooth;}
.ll-root *{box-sizing:border-box;}
.ll-root h1,.ll-root h2,.ll-root h3{font-family:var(--serif);font-weight:400;
  letter-spacing:-0.01em;line-height:1.15;margin:0;}
.ll-root a{color:inherit;}
.ll-root .wrap{max-width:1060px;margin:0 auto;padding:0 22px;}
.ll-root .eyebrow{font-family:var(--sans);font-size:12px;font-weight:700;
  letter-spacing:.14em;text-transform:uppercase;color:var(--teal);}
.ll-root nav{position:sticky;top:0;z-index:50;background:rgba(251,250,247,.93);
  backdrop-filter:blur(8px);border-bottom:1px solid var(--line);}
.ll-root nav .row{display:flex;align-items:center;gap:18px;height:62px;}
.ll-root .brand{display:flex;align-items:center;gap:9px;font-family:var(--serif);
  font-size:20px;color:var(--ink);}
.ll-root .mark{width:26px;height:26px;border-radius:7px;background:var(--teal);
  display:flex;align-items:center;justify-content:center;color:#fff;
  font-family:var(--serif);font-size:15px;flex:none;}
.ll-root nav .links{display:flex;gap:22px;margin-left:auto;}
.ll-root nav .links a{font-size:13.5px;color:var(--ink2);text-decoration:none;font-weight:600;}
.ll-root nav .links a:hover{color:var(--teal);}
.ll-root .btn{display:inline-block;background:var(--teal);color:#fff;text-decoration:none;
  font-size:13.5px;font-weight:700;padding:10px 18px;border-radius:8px;border:none;
  cursor:pointer;font-family:var(--sans);transition:.14s;}
.ll-root .btn:hover{background:var(--teal-dk);}
.ll-root .btn.ghost{background:transparent;color:var(--teal);border:1px solid var(--teal);}
.ll-root .btn.ghost:hover{background:var(--teal-soft);}
.ll-root .btn.lg{padding:14px 26px;font-size:15px;}
.ll-root nav .btn{padding:9px 15px;}
.ll-root .hero{padding:78px 0 64px;
  background:radial-gradient(900px 380px at 78% -8%,var(--teal-soft),transparent 70%);}
.ll-root .hero-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:40px;align-items:center;}
.ll-root .hero-copy{min-width:0;}
.ll-root .hero-art{min-width:0;display:flex;justify-content:center;}
.ll-root .hero-art img{width:100%;max-width:480px;height:auto;display:block;
  border-radius:18px;border:1px solid var(--line);background:var(--card);
  box-shadow:0 1px 0 rgba(15,118,110,.04);}
.ll-root .hero h1{font-size:52px;max-width:15ch;margin:16px 0 0;}
.ll-root .hero .sub{font-size:18px;color:var(--ink2);max-width:54ch;margin:20px 0 26px;}
.ll-root .hero .cta{display:flex;gap:12px;flex-wrap:wrap;}
.ll-root .hero .trust{margin-top:24px;font-size:13px;color:var(--muted);
  display:flex;gap:18px;flex-wrap:wrap;}
.ll-root .hero .trust b{color:var(--teal-dk);font-weight:700;}
.ll-root section{padding:62px 0;}
.ll-root .sec-head{max-width:62ch;}
.ll-root .sec-head h2{font-size:34px;margin:10px 0 0;}
.ll-root .sec-head p{font-size:16px;color:var(--ink2);margin-top:12px;}
.ll-root .finder{background:var(--bg2);border-top:1px solid var(--line);
  border-bottom:1px solid var(--line);}
.ll-root .finder-panel{background:var(--card);border:1px solid var(--line);
  border-radius:16px;padding:24px;margin-top:24px;}
.ll-root .finder-panel .q{font-size:13px;font-weight:700;color:var(--ink);margin-bottom:11px;}
.ll-root .toggles{display:flex;flex-wrap:wrap;gap:9px;}
.ll-root .toggle{font-size:13.5px;padding:9px 14px;border-radius:999px;cursor:pointer;
  background:var(--bg);color:var(--ink2);border:1px solid var(--line);
  user-select:none;transition:background-color .16s ease-out,border-color .16s ease-out,color .16s ease-out,transform .12s ease-out;}
.ll-root .toggle:hover{border-color:var(--teal);}
.ll-root .toggle:active{transform:scale(.96);}
.ll-root .toggle.on{background:var(--teal);color:#fff;border-color:var(--teal);}
.ll-root .finder-bar{display:flex;align-items:baseline;gap:8px;margin:22px 0 6px;
  padding-top:18px;border-top:1px solid var(--line);}
.ll-root .finder-bar .n{font-family:var(--serif);font-size:30px;color:var(--teal);}
.ll-root .finder-bar .t{font-size:14px;color:var(--ink2);}
.ll-root .finder-note{font-size:12px;color:var(--muted);margin-bottom:14px;}
.ll-root .finder-search{width:100%;padding:11px 14px;font-size:14px;font-family:var(--sans);
  border:1px solid var(--line);border-radius:9px;background:var(--bg);color:var(--ink);margin-bottom:14px;}
.ll-root .finder-search:focus{outline:2px solid var(--teal-soft);border-color:var(--teal);}
.ll-root .advisor-cta{margin-top:20px;background:var(--teal-dk);color:#eaf3f1;
  border-radius:14px;padding:22px 24px;display:flex;align-items:center;
  gap:20px;flex-wrap:wrap;}
.ll-root .advisor-cta .ac-h{font-family:var(--serif);font-size:21px;color:#fff;
  margin-bottom:6px;}
.ll-root .advisor-cta .ac-p{font-size:13.5px;color:#cfe4e0;max-width:60ch;}
.ll-root .advisor-cta>div{flex:1;min-width:260px;}
.ll-root .advisor-cta .btn{background:var(--gold);flex:none;}
.ll-root .advisor-cta .btn:hover{background:#946523;}
.ll-root .weave{margin-top:18px;padding-top:16px;border-top:1px solid var(--line);}
.ll-root .weave-btn{background:var(--gold);}
.ll-root .weave-btn:hover{background:#946523;}
.ll-root .weave-btn:disabled{opacity:.6;cursor:default;}
.ll-root .weave-intro{font-size:12.5px;color:var(--muted);margin-bottom:10px;}
.ll-root .weave-out{margin-top:14px;background:var(--teal-tint);border:1px solid var(--line);
  border-left:3px solid var(--teal);border-radius:10px;padding:16px 18px;
  animation:weave-rise .36s cubic-bezier(.2,.65,.3,1);}
@keyframes weave-rise{
  from{opacity:0;transform:translateY(8px);}
  to{opacity:1;transform:translateY(0);}
}
.ll-root .weave-h{font-family:var(--serif);font-size:18px;color:var(--teal-dk);margin-bottom:8px;}
.ll-root .weave-body p{font-size:13.5px;color:var(--ink2);margin:0 0 9px;}
.ll-root .weave-disc{font-size:11.5px;color:var(--muted);font-style:italic;margin-top:4px;}
.ll-root .weave-err{margin-top:12px;font-size:13px;color:var(--ink2);background:var(--card);
  border:1px solid var(--line);border-radius:8px;padding:12px 14px;}
.ll-root .cards{display:grid;grid-template-columns:1fr 1fr;gap:11px;}
.ll-root .card{background:var(--card);border:1px solid var(--line);border-radius:12px;
  padding:15px 16px;cursor:pointer;
  transition:border-color .14s ease-out,box-shadow .14s ease-out;
  animation:card-rise .32s cubic-bezier(.2,.65,.3,1) backwards;}
.ll-root .card:hover{border-color:var(--teal);}
@keyframes card-rise{
  from{opacity:0;transform:translateY(6px);}
  to{opacity:1;transform:translateY(0);}
}
.ll-root .card .nm{font-size:15px;font-weight:700;letter-spacing:-0.01em;}
.ll-root .card .sm{font-size:13px;color:var(--muted);margin-top:5px;}
.ll-root .badges{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px;}
.ll-root .bdg{font-size:10px;font-weight:700;text-transform:uppercase;
  letter-spacing:.04em;padding:3px 7px;border-radius:5px;background:#eef1ef;color:var(--muted);}
.ll-root .bdg.p{background:var(--teal-soft);color:var(--teal-dk);}
.ll-root .bdg.pro{background:var(--gold-soft);color:var(--gold-dk);}
.ll-root .bdg.r-low{background:#e3f1ee;color:#0f766e;}
.ll-root .bdg.r-medium{background:#fbf2dc;color:#9a6b00;}
.ll-root .bdg.r-high{background:#fbe9e6;color:#b3402f;}
.ll-root .card .detail{max-height:0;opacity:0;overflow:hidden;
  margin-top:0;padding-top:0;border-top:1px solid transparent;
  transition:max-height .34s ease-out,opacity .22s ease-out .04s,
    margin-top .34s ease-out,padding-top .34s ease-out,border-top-color .34s ease-out;}
.ll-root .card.open .detail{max-height:1200px;opacity:1;
  margin-top:12px;padding-top:12px;border-top-color:var(--line);}
.ll-root .card.open{cursor:default;}
.ll-root .detail .drow{margin-bottom:9px;}
.ll-root .detail .k{font-size:10.5px;font-weight:700;text-transform:uppercase;
  letter-spacing:.05em;color:var(--teal-dk);}
.ll-root .detail .v{font-size:13px;color:var(--ink2);margin-top:2px;}
.ll-root .detail .src{font-style:italic;color:var(--muted);}
.ll-root .empty{grid-column:1/-1;text-align:center;padding:30px 10px;
  font-size:14px;color:var(--muted);}
.ll-root .reframe{background:var(--teal-dk);color:#eaf3f1;}
.ll-root .reframe h2{color:#fff;font-size:30px;}
.ll-root .reframe .lede{font-size:17px;color:#cfe4e0;max-width:62ch;margin-top:14px;}
.ll-root .three{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:34px;}
.ll-root .three .tt{font-family:var(--serif);font-size:19px;color:#fff;margin-bottom:6px;}
.ll-root .three p{font-size:14px;color:#bcd6d1;}
.ll-root .three .num{font-family:var(--serif);font-size:14px;color:var(--gold);
  border:1px solid rgba(255,255,255,.25);width:30px;height:30px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;margin-bottom:12px;}
.ll-root .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:30px;}
.ll-root .step{background:var(--card);border:1px solid var(--line);border-radius:13px;padding:22px;}
.ll-root .step .s-n{font-family:var(--serif);font-size:15px;color:#fff;background:var(--teal);
  width:32px;height:32px;border-radius:9px;display:flex;align-items:center;
  justify-content:center;margin-bottom:14px;}
.ll-root .step h3{font-size:18px;margin-bottom:7px;}
.ll-root .step p{font-size:14px;color:var(--ink2);}
.ll-root .who{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:30px;}
.ll-root .persona{background:var(--card);border:1px solid var(--line);
  border-radius:13px;padding:20px;}
.ll-root .persona .pn{font-family:var(--serif);font-size:19px;margin-bottom:5px;}
.ll-root .persona .pp{font-size:13.5px;color:var(--muted);margin-bottom:9px;}
.ll-root .persona .pd{font-size:13.5px;color:var(--ink2);}
.ll-root .persona .pd b{color:var(--teal-dk);}
.ll-root .proof{background:var(--teal-tint);border-top:1px solid var(--line);
  border-bottom:1px solid var(--line);}
.ll-root .proof-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-top:26px;}
.ll-root .pcard{background:var(--card);border:1px solid var(--line);
  border-radius:12px;padding:16px;}
.ll-root .pcard .pcn{font-size:14.5px;font-weight:700;margin-bottom:6px;}
.ll-root .pcard .pcs{font-size:12.5px;color:var(--muted);margin-bottom:10px;}
.ll-root .pcard .pcsrc{font-size:11px;color:var(--teal-dk);font-style:italic;
  border-top:1px dashed var(--line);padding-top:8px;}
.ll-root .honest{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:28px;}
.ll-root .honest .h{background:var(--card);border:1px solid var(--line);
  border-radius:12px;padding:18px;}
.ll-root .honest .h .x{font-family:var(--serif);font-size:17px;color:var(--teal-dk);margin-bottom:6px;}
.ll-root .honest .h p{font-size:13.5px;color:var(--ink2);}
.ll-root .honest-note{margin-top:22px;font-size:13.5px;color:var(--ink2);
  background:var(--card);border:1px solid var(--line);border-left:3px solid var(--teal);
  border-radius:8px;padding:14px 16px;max-width:76ch;}
.ll-root .get{background:var(--teal-dk);color:#fff;text-align:center;}
.ll-root .get h2{color:#fff;font-size:34px;}
.ll-root .get p{font-size:16px;color:#cfe4e0;max-width:52ch;margin:14px auto 0;}
.ll-root .signup{display:flex;gap:9px;justify-content:center;margin:26px auto 0;
  max-width:440px;flex-wrap:wrap;}
.ll-root .signup input{flex:1;min-width:220px;padding:13px 15px;font-size:14px;
  border:1px solid rgba(255,255,255,.3);border-radius:8px;background:rgba(255,255,255,.1);
  color:#fff;font-family:var(--sans);}
.ll-root .signup input::placeholder{color:#9fc2bd;}
.ll-root .signup .btn{background:var(--gold);}
.ll-root .signup .btn:hover{background:#946523;}
.ll-root .get-ok{font-size:14px;color:#aee0d8;margin-top:14px;}
.ll-root .get-fine{font-size:12px;color:#94b6b1;margin-top:16px;}
.ll-root .foot{background:#0a1d1a;color:#9fb3ae;padding:40px 0;font-size:12.5px;}
.ll-root .foot .frow{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.ll-root .foot .fbrand{font-family:var(--serif);font-size:17px;color:#fff;}
.ll-root .foot .disc{margin-top:16px;line-height:1.7;max-width:80ch;}
@media(max-width:860px){
  .ll-root .hero-grid{grid-template-columns:1fr;gap:24px;}
  .ll-root .hero-art{order:-1;}
  .ll-root .hero-art img{max-width:360px;}
}
@media(max-width:760px){
  .ll-root .hero h1{font-size:34px;} .ll-root .hero{padding:50px 0 40px;}
  .ll-root .sec-head h2{font-size:25px;} .ll-root section{padding:44px 0;}
  .ll-root .cards,.ll-root .who,.ll-root .honest{grid-template-columns:1fr;}
  .ll-root .three,.ll-root .steps,.ll-root .proof-cards{grid-template-columns:1fr;}
  .ll-root nav .links{display:none;}
  .ll-root .get h2{font-size:25px;}
  /* Mobile tap targets — WCAG 2.5.5 / Apple HIG 44px minimum (T14 refire). */
  .ll-root .btn{padding:13px 20px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;}
  .ll-root nav .btn{padding:12px 18px;min-height:44px;}
  .ll-root .toggle{padding:12px 16px;min-height:44px;display:inline-flex;align-items:center;}
  .ll-root .finder-search{padding:14px 15px;min-height:44px;}
  .ll-root .signup input{min-height:44px;}
}
@media(prefers-reduced-motion:reduce){
  .ll-root .card,.ll-root .weave-out{animation:none!important;}
  .ll-root .toggle:active{transform:none!important;}
  .ll-root .card .detail{transition:none!important;}
}
`;

const PROOF_IDS = ["augusta-rule", "qbi-deduction", "tax-loss-harvesting"];

export default function LifeLoopholeSite() {
  const proof = PROOF_IDS.map((id) => CATALOG.find((e) => e.id === id)).filter(
    (e): e is LoopholeEntry => Boolean(e),
  );

  return (
    <div className="ll-root">
      <style>{CSS}</style>

      <nav>
        <div className="wrap row">
          <div className="brand"><span className="mark">L</span>Life Loophole</div>
          <div className="links">
            <a href="#finder">Find your loopholes</a>
            <a href="/brands/life-loophole/advisor">Ask the advisor</a>
            <a href="#how">How it works</a>
            <a href="#who">Who it is for</a>
            <a href="#strategies">The strategies</a>
          </div>
          <a href="/brands/life-loophole/advisor" className="btn">Ask the advisor</a>
        </div>
      </nav>

      {/* HERO */}
      <header className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">Tax strategy, decoded &middot; A Day14 company</div>
            <h1>Legal advantages hide in the tax code. Most people never find theirs.</h1>
            <p className="sub">
              Life Loophole shows you the legitimate, IRS-sourced strategies that fit your life —
              explained in plain English — so you can stop overpaying and start using the system
              the way it was actually built to be used.
            </p>
            <StaggerCtas className="cta">
              <a href="/brands/life-loophole/advisor" className="btn lg">Ask the advisor</a>
              <a href="#finder" className="btn ghost lg">Browse the finder</a>
            </StaggerCtas>
            <div className="trust">
              <span><b>48</b> sourced strategies</span>
              <span><b>Every one legal</b> — and growing</span>
              <span><b>Built on the IRS code</b>, not opinions</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <img src="/brands/life-loophole/hero.svg" alt="" loading="eager" />
          </div>
        </div>
      </header>

      {/* FINDER */}
      <section id="finder" className="finder">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">The Loophole Finder</div>
            <h2>Tell us about yourself. See your strategies — instantly.</h2>
            <p>
              No signup, no form. Tap what is true about you and the legal strategies that fit
              appear right away — each in plain English, each citing the IRS rule it stands on.
            </p>
          </div>
          <LoopholeFinder />
          <div className="advisor-cta">
            <div>
              <div className="ac-h">Want it done for you instead of by hand?</div>
              <div className="ac-p">
                The Loophole Advisor reads your situation in plain English,
                detects who you are as a taxpayer, and hands back a ranked,
                sourced strategy set with next steps — quick wins and bigger
                moves, each citing the IRS rule behind it.
              </div>
            </div>
            <a href="/brands/life-loophole/advisor" className="btn lg">
              Ask the advisor
            </a>
          </div>
        </div>
      </section>

      {/* REFRAME */}
      <section className="reframe">
        <div className="wrap">
          <div className="eyebrow" style={{ color: "var(--gold)" }}>
            The honest truth about loopholes
          </div>
          <h2>A loophole is not a trick. It is an incentive Congress wrote on purpose.</h2>
          <p className="lede">
            The tax code rewards specific choices — saving for retirement, running a business,
            investing, raising a family. Those rewards are legal and intentional. The only catch
            is that nobody hands you the list.
          </p>
          <div className="three">
            <div>
              <div className="num">1</div>
              <div className="tt">The code is a map of incentives</div>
              <p>Every deduction and credit exists to nudge a behavior. Use the ones meant for you.</p>
            </div>
            <div>
              <div className="num">2</div>
              <div className="tt">The people who win have a guide</div>
              <p>Wealthy taxpayers do not know secrets — they have advisors who know the map.</p>
            </div>
            <div>
              <div className="num">3</div>
              <div className="tt">Everyone else overpays quietly</div>
              <p>Not from cheating — from never being shown what was legal and available all along.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">How it works</div>
            <h2>Three steps from no idea to a clear plan.</h2>
          </div>
          <div className="steps">
            <div className="step">
              <div className="s-n">1</div>
              <h3>Tell us your situation</h3>
              <p>A few plain questions — no jargon, no documents. Just what is true about your
                work, your family, and your money.</p>
            </div>
            <div className="step">
              <div className="s-n">2</div>
              <h3>See your strategies</h3>
              <p>Get the legal strategies that actually fit you, each explained simply, ranked by
                relevance, and sourced to the real IRS rule behind it.</p>
            </div>
            <div className="step">
              <div className="s-n">3</div>
              <h3>Take the plan and act</h3>
              <p>Walk away with a short, concrete action list — the moves to make and exactly what
                to bring to your accountant.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHO */}
      <section id="who" style={{ background: "var(--bg2)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">Who it is for</div>
            <h2>If you pay taxes, the code has something for you.</h2>
          </div>
          <div className="who">
            <div className="persona">
              <div className="pn">Individuals &amp; families</div>
              <div className="pp">W-2 earners and households</div>
              <div className="pd">Missed credits, retirement and HSA strategy, education savings,
                withholding that has been wrong all year. <b>We surface what you have been leaving on the table.</b></div>
            </div>
            <div className="persona">
              <div className="pn">Freelancers &amp; creators</div>
              <div className="pp">Self-employed, solo, gig</div>
              <div className="pd">Schedule C deductions, self-employment tax, the home office, the
                when-to-become-an-LLC question. <b>We make your independence pay off at tax time.</b></div>
            </div>
            <div className="persona">
              <div className="pn">Small business owners</div>
              <div className="pp">LLCs, S-corps, contractors</div>
              <div className="pd">Entity structure, owner pay, quarterly taxes, hiring family,
                retirement plans. <b>We find the structure-level moves that change everything.</b></div>
            </div>
            <div className="persona">
              <div className="pn">Investors &amp; high earners</div>
              <div className="pp">Equity, real estate, capital</div>
              <div className="pd">Capital-gains timing, tax-loss harvesting, depreciation, charitable
                strategy. <b>We help your money keep more of what it earns.</b></div>
            </div>
            <div className="persona" style={{ gridColumn: "1 / -1" }}>
              <div className="pn">Legal entities</div>
              <div className="pp">LLCs, S-corps, C-corps, partnerships, trusts</div>
              <div className="pd">The structure decisions that ripple through everything downstream —
                elections, pass-through treatment, the entity that fits the goal.
                <b> We make the entity-level choices legible.</b></div>
            </div>
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section id="strategies" className="proof">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">Every strategy, sourced to the law</div>
            <h2>48 legal strategies. Each one cites the rule it stands on.</h2>
            <p>
              This is not opinion or hearsay. Every strategy in Life Loophole points to the exact
              IRS code section, publication, or form behind it — so you can verify it, and so can
              your accountant.
            </p>
          </div>
          <div className="proof-cards">
            {proof.map((e) => (
              <div key={e.id} className="pcard">
                <div className="pcn">{e.name}</div>
                <div className="pcs">{e.summary}</div>
                <div className="pcsrc">Source: {e.source}</div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 22, fontSize: 13.5, color: "var(--muted)" }}>
            …and 45 more, spanning every kind of taxpayer. Open the{" "}
            <a href="#finder" style={{ color: "var(--teal)", fontWeight: 700 }}>Loophole Finder</a>{" "}
            to see the ones that fit you.
          </p>
        </div>
      </section>

      {/* HONESTY */}
      <section>
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">Straight with you</div>
            <h2>What Life Loophole is — and what it is not.</h2>
            <p>The fine print most sites bury, said plainly — because being straight with you is
              the whole point.</p>
          </div>
          <div className="honest">
            <div className="h">
              <div className="x">We do not file your taxes.</div>
              <p>Life Loophole is not a filing tool. It is the strategy layer that comes long
                before the return is ever prepared.</p>
            </div>
            <div className="h">
              <div className="x">We are not your accountant.</div>
              <p>We are the part that has been missing: the guide that tells you what is possible
                and exactly what to ask a professional.</p>
            </div>
            <div className="h">
              <div className="x">We show you the law.</div>
              <p>Every strategy is legal and cites where it is written — nothing hidden, nothing
                invented, nothing shady.</p>
            </div>
          </div>
          <div className="honest-note">
            Everything on Life Loophole is <b>educational information, not tax, legal, or financial
            advice.</b> Tax rules change every year — strategies shown here are current as of the
            2026 tax year, and the specific dollar limits move annually. Always confirm your own
            situation with a licensed CPA, Enrolled Agent, or tax attorney before you act —
            especially on anything marked <b>Pro</b>.
          </div>
        </div>
      </section>

      {/* GET */}
      <section id="get" className="get">
        <div className="wrap">
          <div className="eyebrow" style={{ color: "var(--gold)" }}>Start free</div>
          <h2>Get The Loophole Checklist.</h2>
          <p>
            A free, plain-English checklist of the legal strategies worth knowing — organized by
            who you are. The fastest way to see what you have been missing.
          </p>
          <ChecklistForm />
          <div className="get-fine">
            Free. No spam. Join the waitlist for the full advisor while you are here.
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap">
          <div className="frow">
            <div>
              <div className="fbrand">Life Loophole</div>
              <div style={{ marginTop: 4 }}>A Day14 company &middot; Tax strategy, decoded.</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div>Find your loopholes &middot; How it works &middot; Who it is for</div>
              <div style={{ marginTop: 4 }}>Get the checklist</div>
            </div>
          </div>
          <div className="disc">
            <b style={{ color: "#c4d6d2" }}>Educational information only — not tax, legal, or
            financial advice.</b> Life Loophole helps you understand legal, legitimate tax
            strategies the U.S. tax code allows; it does not prepare returns, represent taxpayers,
            or guarantee any result. Every strategy cites a real IRS source and is current as of
            the 2026 tax year; figures change annually. Always consult a licensed tax professional
            about your specific situation before acting. © 2026 Day14.
          </div>
        </div>
      </footer>
    </div>
  );
}
