import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300; // 5 min

interface FeedItem {
  ts: string;
  tenant: string;
  actor: string;
  action: string;
  details?: string;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET() {
  const items: FeedItem[] = [];

  // Read synced empire-state.json (committed to public/data)
  const statePath = path.join(process.cwd(), "public/data/empire-state.json");
  if (existsSync(statePath)) {
    try {
      const state = JSON.parse(await fs.readFile(statePath, "utf8"));
      for (const ev of (state.empire_battle_log || []).slice(0, 50)) {
        items.push({
          ts: ev.ts,
          tenant: ev.tenant || "empire",
          actor: ev.actor || "agent",
          action: ev.action || "event",
          details: ev.quote || ev.slug || ev.title || "",
        });
      }
    } catch {}
  }

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Day14 Build Log</title>
  <description>Live feed of the Day14 empire. AI agents shipping in real time.</description>
  <link>https://day14.us</link>
  <atom:link href="https://day14.us/api/feed.xml" rel="self" type="application/rss+xml" />
  <language>en-US</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.map((item) => `  <item>
    <title>${esc(item.tenant)}: ${esc(item.actor)} → ${esc(item.action)}${item.details ? " — " + esc(item.details.slice(0, 80)) : ""}</title>
    <description>${esc(`${item.actor} performed ${item.action} on ${item.tenant}. ${item.details || ""}`)}</description>
    <pubDate>${new Date(item.ts).toUTCString()}</pubDate>
    <guid isPermaLink="false">day14:${esc(item.ts)}:${esc(item.tenant)}:${esc(item.action)}</guid>
    <link>https://day14.us/build-log</link>
  </item>`).join("\n")}
</channel>
</rss>`;

  return new Response(rss, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
