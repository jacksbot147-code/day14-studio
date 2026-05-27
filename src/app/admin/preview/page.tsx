import Link from "next/link";
import { loadBrandSites, type BrandSite } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS, PageHint, SITE_URL } from "../layout-bits";
import { Card, EmptyState } from "@/components/ui";

export const metadata = { title: "Preview — Day14 Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Ownership = "day14-owned" | "client" | "partner";
type SiteWithOwnership = BrandSite & { ownership?: Ownership };

function ownershipFor(site: SiteWithOwnership): Ownership {
  // Brand-sites.json has no ownership field yet; the current roster is all
  // day14-owned. Default here so the badge resolves cleanly until a future
  // manifest expansion adds the field.
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

export default async function PreviewIndex() {
  const sites = (await loadBrandSites()) as SiteWithOwnership[];
  const sorted = [...sites].sort((a, b) =>
    a.display_name.localeCompare(b.display_name)
  );

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS + INDEX_CSS }} />
      <AdminNav active="preview" />
      <h1>Preview</h1>
      <PageHint>
        Live previews of every brand site, embedded inside the admin — open one
        to sanity-check the layout and content without leaving Day14.
      </PageHint>
      <div className="sub">
        {sorted.length} brand site{sorted.length === 1 ? "" : "s"} · sourced from{" "}
        <code>public/data/brand-sites.json</code>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon="🪟"
          headline="No brand sites registered yet."
          hint={
            <>
              Brand sites land in <code>public/data/brand-sites.json</code> when
              they ship. Once one appears in the manifest, it lights up here as
              a clickable preview card.
            </>
          }
        />
      ) : (
        <div className="prev-cards">
          {sorted.map((site) => {
            const ownership = ownershipFor(site);
            const tone = ownershipTone(ownership);
            const localUrl = `/brands/${site.slug}`;
            const prodUrl = `${SITE_URL}/brands/${site.slug}`;
            const previewHref = `/admin/preview/${site.slug}`;
            return (
              <Card
                key={site.slug}
                className="prev-card"
                title={
                  <Link href={previewHref} className="prev-card-title">
                    {site.display_name}
                  </Link>
                }
                aside={
                  <span
                    className="prev-badge"
                    style={{ background: tone.bg, color: tone.fg, borderColor: tone.border }}
                  >
                    {ownershipLabel(ownership)}
                  </span>
                }
              >
                {site.tagline ? (
                  <p className="prev-card-tagline">{site.tagline}</p>
                ) : null}
                <div className="prev-card-urls">
                  <div className="prev-card-urlrow">
                    <span className="prev-card-urlrow-label">Local</span>
                    <code className="prev-card-urlrow-val">{localUrl}</code>
                  </div>
                  <div className="prev-card-urlrow">
                    <span className="prev-card-urlrow-label">Production</span>
                    <code className="prev-card-urlrow-val">{prodUrl}</code>
                  </div>
                </div>
                <div className="prev-card-actions">
                  <Link href={previewHref} className="prev-card-cta">
                    Open preview →
                  </Link>
                  <Link
                    href={localUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="prev-card-link"
                  >
                    Local ↗
                  </Link>
                  <a
                    href={prodUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="prev-card-link"
                  >
                    Production ↗
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

const INDEX_CSS = `
.admin-shell .prev-cards { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:14px; }
.admin-shell .prev-card { display:flex; flex-direction:column; }
.admin-shell .prev-card-title { color:var(--text); font-size:15px; font-weight:700; letter-spacing:-0.02em; text-transform:none; }
.admin-shell .prev-card-title:hover { color:var(--accent-text); }
.admin-shell .prev-badge { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; padding:2px 8px; border:1px solid var(--border-strong); border-radius:var(--r-sm); }
.admin-shell .prev-card-tagline { font-size:13px; color:var(--muted); line-height:1.55; margin:0 0 12px; }
.admin-shell .prev-card-urls { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
.admin-shell .prev-card-urlrow { display:flex; gap:10px; align-items:baseline; }
.admin-shell .prev-card-urlrow-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:var(--muted); min-width:68px; }
.admin-shell .prev-card-urlrow-val { font-size:11px; word-break:break-all; }
.admin-shell .prev-card-actions { display:flex; gap:12px; align-items:center; margin-top:auto; padding-top:6px; border-top:1px solid var(--border); flex-wrap:wrap; }
.admin-shell .prev-card-cta { font-size:12px; font-weight:700; color:var(--accent-text); }
.admin-shell .prev-card-cta:hover { color:var(--accent); }
.admin-shell .prev-card-link { font-size:11px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:0.08em; }
.admin-shell .prev-card-link:hover { color:var(--accent-text); }
`;
