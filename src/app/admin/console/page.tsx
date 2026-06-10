import { AdminNav, ADMIN_CSS, PageHint } from "../layout-bits";
import { ConsoleClient } from "./console-client";

/**
 * /admin/console — single pane of glass into the runtime (Mac mini):
 * live poller vitals + a prompt box that commands bot-brain remotely
 * via the Supabase events table. Spec: docs/admin-console-spec.md.
 */

export const metadata = { title: "Console — Day14 Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function ConsolePage() {
  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="console" />
      <h1>Console</h1>
      <p className="sub">
        Command the runtime from anywhere. Prompts ride the events table to the Mac mini, run
        through the same brain as the Telegram bridge, and reply here within ~10 seconds.
      </p>
      <PageHint>
        Consequential actions still queue approval cards — the console can ask for anything, but
        nothing customer-facing ships without your tap in the Inbox.
      </PageHint>
      <ConsoleClient />
    </div>
  );
}
