import type { MetadataRoute } from "next";
import { CONSOLES } from "@/lib/consoles/registry";

export const dynamic = "force-static";

// Same per-deployment base as layout.tsx's metadataBase — GitHub Pages serves under
// /EmuRM/, the production domain from the root. Static export needs absolute URLs
// here regardless, since there's no request to derive the origin from at build time.
const SITE = process.env.NEXT_BASE_PATH ? "https://abu00salman.github.io/EmuRM" : "https://www.emurm.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/library/`, changeFrequency: "weekly", priority: 0.5 },
  ];
  for (const c of CONSOLES) {
    pages.push({ url: `${SITE}/console/${c.id}/`, changeFrequency: "monthly", priority: 0.8 });
  }
  return pages;
}
