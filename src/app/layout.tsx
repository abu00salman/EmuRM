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

export const metadata: Metadata = {
  // The canonical origin social crawlers resolve og:image/og:url against. Update this
  // (and re-deploy) once a custom domain is live — see AGENTS/session notes.
  metadataBase: new URL("https://abu00salman.github.io/EmuRM/"),
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
    description: DESCRIPTION,
    url: "/",
    siteName: "EmuRM",
    type: "website",
    images: [{ url: `${BASE}/og-image.png`, width: 1200, height: 630, alt: "EmuRM" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EmuRM",
    description: DESCRIPTION,
    images: [`${BASE}/og-image.png`],
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
