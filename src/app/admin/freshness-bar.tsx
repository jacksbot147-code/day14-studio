import { loadEmpireState } from "@/lib/admin-state";

/**
 * FreshnessBar — global empire-state age indicator for every /admin page.
 *
 * Why: cloud /admin silently served 4-week-old state for most of June (the
 * admin-sync push leg died and nothing surfaced it). This bar makes staleness
 * impossible to miss: green under 30 min (the sync cadence is 15 min), amber
 * to 24 h, red beyond — with the exact timestamp on hover.
 *
 * Server component, mounted once in the admin layout; inline styles only so
 * it renders identically on every page regardless of per-page CSS.
 */
export async function FreshnessBar() {
  const state = await loadEmpireState();
  const ts = state.generated_at ? new Date(state.generated_at) : null;
  const ageMin = ts ? Math.round((Date.now() - ts.getTime()) / 60_000) : null;

  let color = "#4ade80";
  let label = "state fresh";
  if (ageMin === null || Number.isNaN(ageMin)) {
    color = "#f87171";
    label = "state age unknown";
  } else if (ageMin >= 60 * 24) {
    color = "#f87171";
    label = `state ${Math.round(ageMin / 60 / 24)}d old — admin-sync push leg likely dead`;
  } else if (ageMin >= 30) {
    color = "#facc15";
    label = `state ${ageMin >= 120 ? `${Math.round(ageMin / 60)}h` : `${ageMin}m`} old`;
  } else {
    label = `state ${ageMin}m old`;
  }

  return (
    <div
      title={ts ? `empire-state.json generated_at: ${ts.toISOString()}` : "no generated_at in empire-state.json"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        justifyContent: "flex-end",
        padding: "4px 14px 0",
        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
        fontSize: 11,
        letterSpacing: "0.04em",
        color: "rgba(160,163,177,0.9)",
        userSelect: "none",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 8px ${color}`,
          flex: "none",
        }}
      />
      {label}
    </div>
  );
}
