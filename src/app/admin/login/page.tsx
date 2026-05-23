interface Props {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export const metadata = {
  title: "Day14 Admin — Login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const { error, next } = await searchParams;

  return (
    <div style={{ minHeight: "100vh", background: "#0B0B0A", color: "#F8F6F1", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", backgroundImage: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)", backgroundSize: "56px 56px" }}>
      <div style={{ width: 372, padding: 36, background: "#0F0E0C", border: "1px solid #2A2826", borderRadius: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, paddingBottom: 18, borderBottom: "1px solid #211F1C" }}>
          <span style={{ display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: 2, background: "#FF5C28", color: "#0B0B0A", fontWeight: 800, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>14</span>
          <div>
            <h1 style={{ fontSize: 21, margin: 0, letterSpacing: "-0.04em", fontWeight: 800, color: "#F8F6F1" }}>Day14 Admin</h1>
            <p style={{ fontSize: 11, color: "#8A847C", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600 }}>Empire access</p>
          </div>
        </div>
        <form action="/api/admin/auth" method="POST">
          <input type="hidden" name="next" value={next || "/admin"} />
          <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, color: "#8A847C", marginBottom: 7 }}>Password</label>
          <input
            type="password"
            name="password"
            required
            autoFocus
            style={{ width: "100%", padding: "12px 14px", background: "#0B0B0A", border: `1px solid ${error ? "#E04617" : "#2A2826"}`, borderRadius: 2, color: "#F8F6F1", fontSize: 14, fontFamily: "inherit", marginBottom: error ? 8 : 20, outline: "none", boxSizing: "border-box" }}
          />
          {error ? (
            <div style={{ fontSize: 12, color: "#FF8A66", marginBottom: 16 }}>Incorrect password.</div>
          ) : null}
          <button type="submit" style={{ width: "100%", padding: "13px 20px", background: "#FF5C28", border: "1px solid #FF5C28", borderRadius: 2, color: "#0B0B0A", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            Enter empire →
          </button>
        </form>
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #211F1C", fontSize: 11, color: "#8A847C", textAlign: "center" }}>
          Session lasts 30 days · single-user mode
        </div>
      </div>
    </div>
  );
}
