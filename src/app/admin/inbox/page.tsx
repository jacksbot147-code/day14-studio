import { loadEmpireState } from "@/lib/admin-state";
import { AdminNav, ADMIN_CSS } from "../layout-bits";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

export const metadata = { title: "Inbox — Day14 Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const HOME = homedir();
const BIZ = path.join(HOME, "Documents/businesses");
const STUDIO_DRAFTS = path.join(HOME, "Documents/studio/docs/seeds/skills/_drafts");
const EXPANSION_INBOX = path.join(BIZ, "_shared/expansion-requests");

interface InboxItem {
  category: string;
  tenant?: string;
  title: string;
  preview: string;
  action_hint: string;
  age_min: number;
  icon: string;
}

async function collectItems(state: Awaited<ReturnType<typeof loadEmpireState>>): Promise<InboxItem[]> {
  const items: InboxItem[] = [];
  const now = Date.now();

  // CS drafts per tenant
  for (const t of state.tenants) {
    const dir = path.join(BIZ, t.slug, "cs-drafts");
    if (!existsSync(dir)) continue;
    for (const f of (await fs.readdir(dir)).filter((f) => f.endsWith(".md")).slice(0, 10)) {
      const stat = await fs.stat(path.join(dir, f));
      const ageMin = Math.round((now - stat.mtime.getTime()) / 60_000);
      const text = (await fs.readFile(path.join(dir, f), "utf8")).slice(0, 250);
      items.push({ category: "cs", tenant: t.slug, title: `CS draft — ${t.display_name}`, preview: text, action_hint: "Review + send manually", age_min: ageMin, icon: "📨" });
    }
  }

  // Social queue items per tenant
  for (const t of state.tenants) {
    const sqRoot = path.join(BIZ, t.slug, "social-queue");
    if (!existsSync(sqRoot)) continue;
    for (const p of await fs.readdir(sqRoot)) {
      const platformDir = path.join(sqRoot, p);
      const files = (await fs.readdir(platformDir).catch(() => [])).filter((f) => f.endsWith(".json")).slice(0, 5);
      for (const f of files) {
        try {
          const data = JSON.parse(await fs.readFile(path.join(platformDir, f), "utf8"));
          if (data.status !== "queued") continue;
          const ageMin = Math.round((now - new Date(data.queued_at).getTime()) / 60_000);
          items.push({
            category: "social",
            tenant: t.slug,
            title: `${p} — ${data.content?.slug || data.id}`,
            preview: data.angle || data.content?.text?.slice(0, 200) || "",
            action_hint: `Telegram: approve post ${data.id || data.content?.slug}`,
            age_min: ageMin,
            icon: "📤",
          });
        } catch {}
      }
    }
  }

  // Skill drafts
  if (existsSync(STUDIO_DRAFTS)) {
    const drafts = (await fs.readdir(STUDIO_DRAFTS, { withFileTypes: true })).filter((e) => e.isDirectory() && !e.name.startsWith("_"));
    for (const d of drafts.slice(0, 10)) {
      const skillMd = path.join(STUDIO_DRAFTS, d.name, "SKILL.md");
      if (!existsSync(skillMd)) continue;
      const stat = await fs.stat(skillMd);
      const text = (await fs.readFile(skillMd, "utf8")).slice(0, 300);
      const ageMin = Math.round((now - stat.mtime.getTime()) / 60_000);
      items.push({ category: "skill", title: `Skill draft — ${d.name}`, preview: text, action_hint: `Telegram: approve ${d.name}`, age_min: ageMin, icon: "🧬" });
    }
  }

  // Opportunity pitches
  for (const o of (state.opportunities || []).filter((o) => o.pitched && o.status === "open").slice(0, 10)) {
    items.push({
      category: "opportunity",
      title: `Pitch — ${o.niche}`,
      preview: o.rationale,
      action_hint: `Telegram: bootstrap-pitch ${o.id}`,
      age_min: 0,
      icon: "💡",
    });
  }

  // Pending expansion requests
  if (existsSync(EXPANSION_INBOX)) {
    const files = (await fs.readdir(EXPANSION_INBOX)).filter((f) => f.endsWith(".json"));
    for (const f of files.slice(0, 10)) {
      try {
        const data = JSON.parse(await fs.readFile(path.join(EXPANSION_INBOX, f), "utf8"));
        if (data.status !== "pending") continue;
        const ageMin = Math.round((now - new Date(data.requested_at).getTime()) / 60_000);
        items.push({
          category: "request",
          title: data.type === "new-business" ? `New business request` : `New skill request`,
          preview: data.description || JSON.stringify(data.extracted),
          action_hint: data.type === "new-business" ? "Telegram: bootstrap now" : "Auto-handled by recursive-expansion",
          age_min: ageMin,
          icon: data.type === "new-business" ? "🏛" : "🧬",
        });
      } catch {}
    }
  }

  items.sort((a, b) => a.age_min - b.age_min);
  return items;
}

export default async function InboxPage() {
  const state = await loadEmpireState();
  const items = await collectItems(state);

  const byCategory = {
    cs: items.filter((i) => i.category === "cs"),
    social: items.filter((i) => i.category === "social"),
    skill: items.filter((i) => i.category === "skill"),
    opportunity: items.filter((i) => i.category === "opportunity"),
    request: items.filter((i) => i.category === "request"),
  };

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="empire" />
      <h1>📬 Operator Inbox</h1>
      <div className="sub">{items.length} items waiting on Jack — sorted newest first</div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <div className="kpi"><div className="kpi-label">📨 CS</div><div className="kpi-value">{byCategory.cs.length}</div></div>
        <div className="kpi"><div className="kpi-label">📤 Social</div><div className="kpi-value">{byCategory.social.length}</div></div>
        <div className="kpi"><div className="kpi-label">🧬 Skills</div><div className="kpi-value">{byCategory.skill.length}</div></div>
        <div className="kpi"><div className="kpi-label">💡 Ideas</div><div className="kpi-value">{byCategory.opportunity.length}</div></div>
        <div className="kpi"><div className="kpi-label">🏛 Requests</div><div className="kpi-value">{byCategory.request.length}</div></div>
      </div>

      {items.length === 0 ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 60, textAlign: "center", color: "var(--muted)" }}>
          ✨ Inbox zero. Empire's caught up.
        </div>
      ) : (
        <div>
          <div className="section-header"><div className="section-title">All items ({items.length})</div></div>
          {items.map((item, i) => (
            <div key={i} className="opp-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {item.icon} {item.tenant || "empire"} · {item.age_min}m ago
                  </div>
                  <h3 style={{ fontSize: 15, marginBottom: 6 }}>{item.title}</h3>
                  <div style={{ fontSize: 12, color: "var(--text)", opacity: 0.85, lineHeight: 1.5, whiteSpace: "pre-line", maxHeight: 80, overflow: "hidden" }}>
                    {item.preview}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--accent)", textAlign: "right", flexShrink: 0, maxWidth: 220 }}>
                  {item.action_hint}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
