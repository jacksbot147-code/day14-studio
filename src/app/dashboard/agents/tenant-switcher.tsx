"use client";

import { useRouter } from "next/navigation";

/**
 * God-view tenant switcher — hop into any business's scoped deck from a dropdown.
 * "God-view · all tenants" returns to /dashboard/agents.
 */
export function TenantSwitcher({ tenants, current }: { tenants: Array<{ slug: string; name: string }>; current?: string }) {
  const router = useRouter();
  return (
    <select
      value={current ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        router.push(v ? `/app/${v}/agents` : "/dashboard/agents");
      }}
      aria-label="Switch tenant"
      style={{
        background: "rgba(255,255,255,0.04)",
        color: "#f3f4f8",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        fontFamily: "var(--cin-font-mono)",
        fontSize: 11,
        letterSpacing: "0.12em",
        padding: "7px 10px",
      }}
      className="uppercase cursor-pointer hover:border-white/25 transition-colors"
    >
      <option value="" style={{ background: "#0a0a0c" }}>God-view · all tenants</option>
      {tenants.map((t) => (
        <option key={t.slug} value={t.slug} style={{ background: "#0a0a0c" }}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
