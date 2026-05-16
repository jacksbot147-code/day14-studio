import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SITE, PITCH } from "@/lib/site";
import { ChatWidget } from "@/components/chat-widget";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

const TITLE = `${SITE.brand} — ${SITE.tagline}`;
const DESCRIPTION = PITCH.oneLiner;

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? `https://${SITE.domain}`,
  ),
  title: {
    default: TITLE,
    template: `%s · ${SITE.brand}`,
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE.brand,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    // Indexable in production; preview deploys stay stealth via the
    // VERCEL_ENV env var check below (preview/development → noindex).
    index: process.env.VERCEL_ENV === "production",
    follow: process.env.VERCEL_ENV === "production",
  },
  themeColor: "#0B0B0A",
  appleWebApp: {
    capable: true,
    title: SITE.brand,
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
