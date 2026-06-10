import { AdvisorPanel } from "./advisor-panel";

/* ------------------------------------------------------------------ *
 * Life Loophole — the full advisor agent surface.
 * (day14.us/brands/life-loophole/advisor)
 *
 * Server-rendered page chrome (nav, header, footer, CSS); the
 * interactive panel + results live in ./advisor-panel.tsx.
 *
 * The visitor describes their tax situation in free text and gets back a
 * personalized, ranked, sourced strategy set: a situation read-back with
 * detected persona(s), strategy cards grouped into quick wins vs. bigger
 * moves, professional-needed banners, and the mandatory disclaimer.
 *
 * Educational content only — not tax advice. Every strategy is grounded in
 * the sourced Loophole Catalog by the /api/.../advisor-agent route.
 * ------------------------------------------------------------------ */

const CSS = `
.ll-root{
  --bg:#fbfaf7;--bg2:#f1f0ea;--card:#ffffff;--ink:#13211d;--ink2:#3b4a44;
  --muted:#5a685f;--line:#e4e3db;--teal:#0f766e;--teal-dk:#0a4f49;
  --teal-soft:#e3f0ee;--teal-tint:#f0f7f5;--gold:#b07d2b;--gold-dk:#8a5b1d;--gold-soft:#f6eddc;
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
.ll-root .bdg.pro{background:var(--gold-soft);color:var(--gold-dk);}
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

export default function LifeLoopholeAdvisor() {
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
          <AdvisorPanel />
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
