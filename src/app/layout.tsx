import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { SITE, PITCH } from "@/lib/site";
import { ChatWidget } from "@/components/chat-widget";
import { RouteTransition } from "@/components/motion/route-transition";

// next/font self-hosts these and emits exactly the weights listed below with
// font-display: swap + a metric-matched system fallback (adjustFontFallback,
// on by default) to avoid layout shift. Only the weights actually used by the
// light theme AND the cinematic system are requested — nothing extra.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  // 300 added for the cinematic display type; 400-800 used by the light theme.
  weight: ["300", "400", "500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  // Cinematic uses 400/500; 600 retained for the light theme's bold mono labels.
  weight: ["400", "500", "600"],
});

// Newsreader — italic-only optical-size axis, for the cinematic theme's
// editorial accents (e.g. <em> phrases). Italic is the single style requested.
const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-newsreader",
  style: ["italic"],
  weight: ["300", "400"],
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
  appleWebApp: {
    capable: true,
    title: SITE.brand,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${mono.variable} ${newsreader.variable}`}
    >
      <body>
        <RouteTransition>{children}</RouteTransition>
        <ChatWidget />
        <Analytics />
      </body>
    </html>
  );
}
