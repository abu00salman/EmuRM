import type { Metadata, Viewport } from "next";
import "@fontsource-variable/big-shoulders-display";
import "@fontsource-variable/instrument-sans";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { LOCALE_INIT_SCRIPT } from "@/lib/i18n";

// Next doesn't rewrite metadata.manifest/icons with `basePath` on its own, unlike
// next/link and next/image — so this mirrors it manually (see next.config.ts).
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const DESCRIPTION = "Your classic console collection, playable in the browser. Local-first, installable, no downloads.";
// Share-preview text (WhatsApp/Twitter/etc.) is a single static snapshot — it can't
// negotiate language per viewer — so this is set to Arabic to match the site's audience.
const SHARE_DESCRIPTION = "مجموعتك من الأجهزة الكلاسيكية، تلعبها من المتصفح مباشرة. محفوظة على جهازك، قابلة للتثبيت، بدون تنزيلات.";

// Two live deployments share this repo: GitHub Pages (only build that sets
// NEXT_BASE_PATH, served under /EmuRM/) and Cloudflare at the production
// custom domain (root path). Social crawlers need og:image/og:url resolved
// against whichever origin actually served the page.
const metadataBase = process.env.NEXT_BASE_PATH ? "https://abu00salman.github.io/EmuRM/" : "https://www.emurm.com/";

export const metadata: Metadata = {
  metadataBase: new URL(metadataBase),
  title: { default: "EmuRM", template: "%s — EmuRM" },
  description: DESCRIPTION,
  applicationName: "EmuRM",
  manifest: `${BASE}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: "EmuRM", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: `${BASE}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${BASE}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: `${BASE}/icons/apple-touch-icon.png`, sizes: "180x180" }],
  },
  openGraph: {
    title: "EmuRM",
    description: SHARE_DESCRIPTION,
    url: "/",
    siteName: "EmuRM",
    type: "website",
    locale: "ar_SA",
    // Relative (no BASE prefix): Next concatenates this onto metadataBase's full
    // href, path included, so a leading "/EmuRM/" here would double up with the
    // "/EmuRM/" metadataBase already carries on the GitHub Pages build.
    images: [{ url: "og-image.png", width: 1200, height: 630, alt: "EmuRM" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EmuRM",
    description: SHARE_DESCRIPTION,
    images: ["og-image.png"],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: LOCALE_INIT_SCRIPT }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
