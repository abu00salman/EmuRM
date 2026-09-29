import type { NextConfig } from "next";

/**
 * EmuRM ships as a fully static, local-first PWA:
 * no server holds ROMs, saves, or accounts. `output: "export"` lets it deploy to any
 * static host (Cloudflare Pages, GitHub Pages, Netlify, S3 + CDN).
 *
 * GitHub Pages project sites are served under /<repo>/ instead of the domain root.
 * Set NEXT_BASE_PATH (e.g. "/EmuRM") only for that build; every other host serves
 * from "/" and leaves this unset. Everything that isn't rewritten automatically by
 * Next (the service worker, its registration, and manifest.webmanifest) uses
 * scope-relative paths instead, so it works unmodified either way.
 */
const basePath = process.env.NEXT_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  basePath,
  assetPrefix: basePath,
  // Mirrors `basePath` into the client bundle: Next doesn't expose it to app code
  // on its own, and the service worker needs an absolute (not page-relative) path.
  env: { NEXT_PUBLIC_BASE_PATH: basePath ?? "" },
};

export default nextConfig;
