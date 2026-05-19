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
    <div style={{ minHeight: "100vh", background: "#08070d", color: "#e8e6ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'SF Mono', Menlo, Monaco, monospace", backgroundImage: "radial-gradient(at 80% 0%, rgba(168, 85, 247, 0.15) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(6, 182, 212, 0.1) 0px, transparent 50%)" }}>
      <div style={{ width: 360, padding: 40, background: "#13111a", border: "1px solid #2a2535", borderRadius: 16 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8, letterSpacing: "-0.02em", background: "linear-gradient(135deg,#fff,#b39ddb 50%,#06b6d4)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>⚔ Day14 Admin</h1>
        <p style={{ fontSize: 13, color: "#847a92", marginBottom: 28 }}>Empire access</p>
        <form action="/api/admin/auth" method="POST">
          <input type="hidden" name="next" value={next || "/admin"} />
          <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#847a92", marginBottom: 6 }}>Password</label>
          <input
            type="password"
            name="password"
            required
            autoFocus
            style={{ width: "100%", padding: "12px 14px", background: "#1a1825", border: "1px solid #2a2535", borderRadius: 8, color: "#e8e6ea", fontSize: 14, fontFamily: "inherit", marginBottom: error ? 8 : 20 }}
          />
          {error ? (
            <div style={{ fontSize: 12, color: "#ff6b6b", marginBottom: 16 }}>Incorrect password.</div>
          ) : null}
          <button type="submit" style={{ width: "100%", padding: "14px 20px", background: "linear-gradient(135deg,#a855f7,#06b6d4)", border: "none", borderRadius: 8, color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Enter empire →
          </button>
        </form>
        <div style={{ marginTop: 24, fontSize: 11, color: "#847a92", textAlign: "center" }}>
          Session lasts 30 days · single-user mode
        </div>
      </div>
    </div>
  );
}
