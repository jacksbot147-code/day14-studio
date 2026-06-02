import fs from "node:fs/promises";
import { AdminNav, ADMIN_CSS, PageHint } from "../layout-bits";
import { Button, Card, EmptyState } from "@/components/ui";
import { approveItem, skipItem } from "./actions";
import {
  TENANTS,
  SIGNOFF_KINDS,
  inboxPath,
  type InboxFile,
  type InboxItem,
  type SignoffKind,
  type Tenant,
} from "./types";

export const metadata = {
  title: "Bulk sign-off — Day14 Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

/* ─── Load ───────────────────────────────────────────────── */

interface LoadedItem extends InboxItem {
  tenantSlug: Tenant;
}

/**
 * Read every tenant's inbox, filter to the sign-off kinds we surface, drop
 * anything already resolved (approved/dismissed) so the page is just the
 * outstanding queue. Tenants whose inbox file is missing just contribute
 * zero items — we never throw at page load.
 */
async function loadOutstandingItems(): Promise<LoadedItem[]> {
  const out: LoadedItem[] = [];
  for (const tenant of TENANTS) {
    try {
      const raw = await fs.readFile(inboxPath(tenant), "utf8");
      const data = JSON.parse(raw) as InboxFile;
      for (const item of data.items ?? []) {
        if (!(SIGNOFF_KINDS as readonly string[]).includes(item.kind)) continue;
        const status = (item.status ?? "awaiting-jack") as string;
        if (status === "approved" || status === "dismissed") continue;
        out.push({ ...item, tenantSlug: tenant });
      }
    } catch {
      // Inbox missing or unreadable — silently skip. The empty state covers
      // the all-empty case; per-tenant misses don't need a banner.
    }
  }
  return out;
}

/** Friendly label for each sign-off kind — used as the group header. */
const KIND_LABEL: Record<SignoffKind, string> = {
  "headline-pick": "Loophole — headline picks",
  "hero-image-pick": "Loophole — hero image picks",
  "og-card-pick": "OG card picks",
  "social-variant-pick": "Loophole — social variant picks",
  "cs-body-pick": "CS template — body picks",
  "subject-line-pick": "Subject line picks",
  "brand-hero-pick": "Brand hero picks",
  "landing-headline-pick": "Landing headline picks",
};

/* ─── Render ─────────────────────────────────────────────── */

interface ItemCardProps {
  item: LoadedItem;
}

/**
 * One card per inbox item. Approve / Skip buttons are wired to the server
 * actions via the `<form action={fn.bind(null, ...)}>` pattern — no client
 * JS needed, the page re-renders on the next request after revalidatePath.
 */
function ItemCard({ item }: ItemCardProps) {
  const title = item.title ?? item.id;
  const summary = item.summary ?? null;
  const priority = (item.priority as string) ?? "medium";
  // `current_*` and `anchor_subject` fields appear across kinds — surface
  // whichever exists so the admin has the "what's the existing thing?"
  // context inline without opening the detail surface.
  const current =
    (item.current_subject as string | undefined) ??
    (item.anchor_subject as string | undefined) ??
    (item.current_body_excerpt as string | undefined) ??
    null;
  const variantCount =
    typeof item.variant_count === "number"
      ? (item.variant_count as number)
      : Array.isArray(item.candidates)
        ? (item.candidates as unknown[]).length
        : null;

  return (
    <Card
      title={
        <>
          <span style={{ opacity: 0.55 }}>{item.tenantSlug}</span>
          {" · "}
          {title}
        </>
      }
      aside={
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {priority} · {item.kind}
        </span>
      }
    >
      {summary ? <p style={{ marginTop: 0 }}>{summary}</p> : null}
      {current ? (
        <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, opacity: 0.85 }}>
          current: {current}
        </p>
      ) : null}
      {variantCount !== null ? (
        <p style={{ fontSize: 12, opacity: 0.7 }}>{variantCount} variant(s)</p>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <form action={approveItem.bind(null, item.tenantSlug, item.id)}>
          <Button type="submit" variant="primary" size="sm">
            Approve
          </Button>
        </form>
        <form action={skipItem.bind(null, item.tenantSlug, item.id)}>
          <Button type="submit" variant="secondary" size="sm">
            Skip
          </Button>
        </form>
      </div>
    </Card>
  );
}

interface GroupProps {
  kind: SignoffKind;
  items: LoadedItem[];
}

function KindGroup({ kind, items }: GroupProps) {
  if (items.length === 0) return null;
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ margin: "0 0 12px" }}>
        {KIND_LABEL[kind]}{" "}
        <span style={{ opacity: 0.55, fontWeight: 400 }}>({items.length})</span>
      </h2>
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((it) => (
          <ItemCard key={`${it.tenantSlug}:${it.id}`} item={it} />
        ))}
      </div>
    </section>
  );
}

/* ─── Page ───────────────────────────────────────────────── */

export default async function BulkSignoffPage() {
  const items = await loadOutstandingItems();

  // Group by kind in the canonical display order. The order is the order
  // SIGNOFF_KINDS is declared — Loophole headlines/hero first, CS picks
  // grouped near the end alongside subject lines.
  const grouped = new Map<SignoffKind, LoadedItem[]>();
  for (const kind of SIGNOFF_KINDS) grouped.set(kind, []);
  for (const it of items) {
    const bucket = grouped.get(it.kind as SignoffKind);
    if (bucket) bucket.push(it);
  }

  return (
    <>
      <style>{ADMIN_CSS}</style>
      <AdminNav active="bulk" />
      <main className="page">
        <h1>Bulk sign-off</h1>
        <PageHint>
          Clear the sign-off queue without bouncing between detail surfaces.
          Approve marks the item ready for Jack&apos;s final publish tap;
          Skip dismisses it from the queue. Both are reversible from{" "}
          <a href="/admin/inbox">/admin/inbox</a>.
        </PageHint>

        {items.length === 0 ? (
          <div style={{ marginTop: 24 }}>
            <EmptyState
              icon="✓"
              headline="Sign-off queue is clear."
              hint="Items will land here as scheduled tasks queue picks across the empire."
            />
          </div>
        ) : (
          <>
            <p style={{ opacity: 0.7, marginTop: 16 }}>
              {items.length} item(s) waiting across {TENANTS.length} tenants.
            </p>
            {SIGNOFF_KINDS.map((kind) => (
              <KindGroup key={kind} kind={kind} items={grouped.get(kind) ?? []} />
            ))}
          </>
        )}
      </main>
    </>
  );
}
