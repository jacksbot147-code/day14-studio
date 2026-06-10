import { brandTheme as t } from "../theme";
import { fetchTenantAbout } from "@/lib/brand-data";
import { BrandMain } from "@/components/brand/section";

export const metadata = { title: "About" };
export const revalidate = 300;

export default async function AboutPage() {
  const about = await fetchTenantAbout("hot-flash-co");
  return (
    <BrandMain maxWidth={720}>
      <h1 style={{ fontFamily: t.fonts.heading, fontSize: 40, letterSpacing: "-0.02em", marginBottom: 24 }}>About Hot Flash Co</h1>
      <div style={{ fontSize: 17, lineHeight: 1.7, color: t.colors.text }} dangerouslySetInnerHTML={{ __html: about }} />
    </BrandMain>
  );
}
