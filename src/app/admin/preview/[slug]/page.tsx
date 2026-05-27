import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadBrandSites, type BrandSite } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS, SITE_URL } from "../../layout-bits";

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Day14 brand-site preview — render a brand's live local route inside an
 * iframe so Jack can sanity-check a brand site without leaving the admin.
 *
 * Ownership is not yet a field on the brand-sites manifest. The current
 * roster (hot-flash-co, kennum-lawn-care, life-loophole) is all day14-owned,
 * so the badge defaults to "day14-owned" until the manifest gains an
 * `ownership` field — at which point this resolver can read it.
 */
type Ownership = "day14-owned" | "client" | "partner";
type SiteWithOwnership = BrandSite & { ownership?: Ownership };

function ownershipFor(site: SiteWithOwnership): Ownership {
  return site.ownership ?? "day14-owned";
}

function ownershipLabel(o: Ownership): string {
  if (o === "client") return "Client";
  if (o === "partner") return "Partner";
  return "Day14-owned";
}

function ownershipTone(o: Ownership): { bg: string; fg: string; border: string } {
  if (o === "client") return { bg: "var(--amber-soft)", fg: "var(--amber)", border: "#e9d3a3" };
  if (o === "partner") return { bg: "var(--surface-2)", fg: "var(--text-2)", border: "var(--border-strong)" };
  return { bg: "var(--accent-soft)", fg: "var(--accent-text)", border: "var(--border-strong)" };
}

const QUICK_LINK_CANDIDATES: Array<{ segment: string; label: string }> = [
  { segment: "about", label: "About" },
  { segment: "blog", label: "Blog" },
  { segment: "products", label: "Products" },
  { segment: "services", label: "Services" },
  { segment: "advisor", label: "Advisor" },
  { segment: "contact", label: "Contact" },
];

async function quickLinksFor(slug: string): Promise<Array<{ segment: string; label: string }>> {
  const base = path.join(process.cwd(), "src/app/brands", slug);
  const found: Array<{ segment: string; label: string }> = [];
  for (const candidate of QUICK_LINK_CANDIDATES) {
    try {
      const stat = await fs.stat(path.join(base, candidate.segment));
      if (stat.isDirectory()) found.push(candidate);
    } catch {
      // segment doesn't exist for this brand — skip
    }
  }
  return found;
}

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  const sites = await loadBrandSites();
  return sites.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sites = await loadBrandSites();
  const site = sites.find((s) => s.slug === slug);
  return {
    title: site ? `${site.display_name} — Preview — Day14 Admin` : "Preview — Day14 Admin",
    robots: { index: false, follow: false },
  };
}

export default async function BrandSitePreview({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const sites = await loadBrandSites();
  const site = sites.find((s) => s.slug === slug) as SiteWithOwnership | undefined;
  if (!site) notFound();

  const ownership = ownershipFor(site);
  const tone = ownershipTone(ownership);
  const localUrl = `/brands/${slug}`;
  const prodUrl = `${SITE_URL}/brands/${slug}`;
  const links = await quickLinksFor(slug);

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS + PREVIEW_CSS }} />
      <AdminNav active="preview" />
      <div className="crumb">
        <Link href="/admin/preview">Preview</Link> · {site.display_name}
      </div>
      <div className="prev-head">
        <div className="prev-headmain">
          <h1>{site.display_name}</h1>
          {site.tagline ? (
            <p className="page-hint" style={{ maxWidth: 720 }}>{site.tagline}</p>
          ) : null}
          <div className="prev-badges">
            <span
              className="prev-badge"
              style={{ background: tone.bg, color: tone.fg, borderColor: tone.border }}
            >
              {ownershipLabel(ownership)}
            </span>
            <code>{slug}</code>
          </div>
        </div>
        <div className="prev-headactions">
          <Link href={localUrl} target="_blank" rel="noopener noreferrer" className="prev-btn">
            Open local ↗
          </Link>
          <a
            href={prodUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="prev-btn prev-btn-accent"
          >
            Open production ↗
          </a>
        </div>
      </div>

      <div className="prev-urls">
        <div className="prev-urlrow">
          <span className="prev-urlrow-label">Local</span>
          <Link href={localUrl} target="_blank" rel="noopener noreferrer" className="prev-urlrow-val">
            {localUrl}
          </Link>
        </div>
        <div className="prev-urlrow">
          <span className="prev-urlrow-label">Production</span>
          <a
            href={prodUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="prev-urlrow-val"
          >
            {prodUrl}
          </a>
        </div>
      </div>

      {links.length > 0 ? (
        <>
          <div className="section-header"><div className="section-title">Quick links</div></div>
          <div className="prev-quicklinks">
            {links.map((l) => {
              const href = `/brands/${slug}/${l.segment}`;
              return (
                <Link
                  key={l.segment}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="prev-quicklink"
                >
                  <span className="prev-quicklink-label">{l.label}</span>
                  <span className="prev-quicklink-url">{href}</span>
                </Link>
              );
            })}
          </div>
        </>
      ) : null}

      <div className="section-header"><div className="section-title">Live preview</div></div>
      <div className="prev-frame">
        <div className="prev-frame-bar">
          <span className="prev-frame-dots" aria-hidden>
            <i /><i /><i />
          </span>
          <span className="prev-frame-url">{localUrl}</span>
          <Link
            href={localUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="prev-frame-open"
          >
            Open in new tab ↗
          </Link>
        </div>
        <iframe
          src={localUrl}
          title={`${site.display_name} preview`}
          className="prev-iframe"
          loading="lazy"
        />
      </div>
    </div>
  );
}

const PREVIEW_CSS = `
.admin-shell .prev-head { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; flex-wrap:wrap; margin-bottom:18px; }
.admin-shell .prev-headmain { flex:1; min-width:240px; }
.admin-shell .prev-headactions { display:flex; gap:8px; flex-wrap:wrap; align-self:flex-start; }
.admin-shell .prev-badges { margin-top:10px; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.admin-shell .prev-badge { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; padding:3px 9px; border:1px solid var(--border-strong); border-radius:var(--r-sm); }
.admin-shell .prev-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 14px; background:var(--surface); border:1px solid var(--border-strong); border-radius:var(--r-sm); font-size:12px; font-weight:700; color:var(--text); transition:border-color 0.13s ease, color 0.13s ease, background 0.13s ease; }
.admin-shell .prev-btn:hover { border-color:var(--accent); color:var(--accent-text); }
.admin-shell .prev-btn-accent { background:var(--accent); border-color:var(--accent); color:#fff; }
.admin-shell .prev-btn-accent:hover { background:var(--accent-text); border-color:var(--accent-text); color:#fff; }
.admin-shell .prev-urls { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); margin-bottom:6px; }
.admin-shell .prev-urlrow { display:flex; gap:14px; align-items:baseline; padding:10px 16px; border-bottom:1px solid var(--border); }
.admin-shell .prev-urlrow:last-child { border-bottom:none; }
.admin-shell .prev-urlrow-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:var(--muted); min-width:88px; }
.admin-shell .prev-urlrow-val { font-family:var(--mono); font-size:12px; color:var(--accent-text); word-break:break-all; }
.admin-shell .prev-urlrow-val:hover { color:var(--accent); text-decoration:underline; }
.admin-shell .prev-quicklinks { display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:8px; }
.admin-shell .prev-quicklink { display:flex; flex-direction:column; gap:3px; padding:10px 12px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-sm); transition:border-color 0.13s ease, background 0.13s ease; }
.admin-shell .prev-quicklink:hover { border-color:var(--accent); background:var(--accent-soft); }
.admin-shell .prev-quicklink-label { font-size:13px; font-weight:700; color:var(--text); }
.admin-shell .prev-quicklink-url { font-family:var(--mono); font-size:11px; color:var(--muted); }
.admin-shell .prev-frame { background:var(--surface); border:1px solid var(--border-strong); border-radius:var(--r-md); overflow:hidden; }
.admin-shell .prev-frame-bar { display:flex; align-items:center; gap:12px; padding:8px 12px; background:var(--surface-2); border-bottom:1px solid var(--border); }
.admin-shell .prev-frame-dots { display:inline-flex; gap:5px; }
.admin-shell .prev-frame-dots i { width:9px; height:9px; border-radius:50%; background:var(--border-strong); display:inline-block; }
.admin-shell .prev-frame-url { flex:1; font-family:var(--mono); font-size:12px; color:var(--text-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.admin-shell .prev-frame-open { font-size:11px; font-weight:700; color:var(--accent-text); text-transform:uppercase; letter-spacing:0.06em; }
.admin-shell .prev-frame-open:hover { color:var(--accent); }
.admin-shell .prev-iframe { width:100%; height:80vh; border:0; display:block; background:#fff; }
`;
