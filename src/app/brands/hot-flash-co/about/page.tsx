import { brandTheme as t } from "../theme";
import { fetchTenantAbout } from "@/lib/brand-data";

export const metadata = { title: "About" };

export default async function AboutPage() {
  const about = await fetchTenantAbout("hot-flash-co");
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 32px" }}>
      <h1 style={{ fontFamily: t.fonts.heading, fontSize: 40, letterSpacing: "-0.02em", marginBottom: 24 }}>About Hot Flash Co</h1>
      <div style={{ fontSize: 17, lineHeight: 1.7, color: t.colors.text }} dangerouslySetInnerHTML={{ __html: about }} />
    </main>
  );
}
