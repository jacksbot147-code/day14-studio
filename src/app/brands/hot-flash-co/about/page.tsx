import { brandTheme as t } from "../theme";
import { fetchTenantAbout } from "@/lib/brand-data";

const ABOUT_DESCRIPTION =
  "About Hot Flash Co — who we are and why we make real goods for the seasons no one warns you about.";

export const metadata = {
  title: "About",
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: "/brands/hot-flash-co/about" },
  openGraph: {
    title: "About — Hot Flash Co",
    description: ABOUT_DESCRIPTION,
    type: "website",
    url: "/brands/hot-flash-co/about",
    siteName: "Hot Flash Co",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "About — Hot Flash Co",
    description: ABOUT_DESCRIPTION,
  },
};

export default async function AboutPage() {
  const about = await fetchTenantAbout("hot-flash-co");
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "60px 32px" }}>
      <h1 style={{ fontFamily: t.fonts.heading, fontSize: 40, letterSpacing: "-0.02em", marginBottom: 24 }}>About Hot Flash Co</h1>
      <div style={{ fontSize: 17, lineHeight: 1.7, color: t.colors.text }} dangerouslySetInnerHTML={{ __html: about }} />
    </main>
  );
}
