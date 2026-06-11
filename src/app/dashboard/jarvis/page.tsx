import JarvisClient from "./JarvisClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "JARVIS — Day14 Mission Control",
};

export default function JarvisPage() {
  return <JarvisClient />;
}
