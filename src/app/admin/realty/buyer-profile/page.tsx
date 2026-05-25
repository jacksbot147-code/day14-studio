import Link from "next/link";
import { loadTenantOps } from "@/lib/admin-state";
import { DEFAULT_BUYER_PROFILE } from "@/lib/realty-acquisition";
import { AdminNav, ADMIN_CSS } from "../../layout-bits";
import { BuyerProfileForm } from "./buyer-profile-form";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Buyer profile — Realty — Day14 Admin",
  robots: { index: false, follow: false },
};

export default async function BuyerProfilePage() {
  const ops = await loadTenantOps("day14-realty");
  const profile = ops.buyerprofile || DEFAULT_BUYER_PROFILE;

  return (
    <div className="admin-shell">
      <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />
      <AdminNav active="realty" />
      <div className="crumb">
        <Link href="/admin/realty">Realty</Link> &nbsp;/&nbsp; Buyer profile
      </div>
      <h1>Buyer profile</h1>
      <div className="sub">
        This is &ldquo;least money <i>for you</i>&rdquo; — every property gameplan ranks its
        acquisition routes against the cash, credit, and goals you set here.
      </div>
      <BuyerProfileForm initial={profile} />
    </div>
  );
}
