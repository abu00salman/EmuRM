import type { NextConfig } from "next";

/**
 * EmuRM ships as a fully static, local-first PWA:
 * no server holds ROMs, saves, or accounts. `output: "export"` lets it deploy to any
 * static host (Cloudflare Pages, GitHub Pages, Netlify, S3 + CDN).
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
