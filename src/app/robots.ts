import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const SITE = process.env.NEXT_BASE_PATH ? "https://abu00salman.github.io/EmuRM" : "https://www.emurm.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // /play/ and /settings/ are per-visitor app state (which ROM is loaded, local
      // preferences) — nothing there is a landing page worth indexing, and crawling it
      // would just waste budget on URLs that mean nothing out of context.
      { userAgent: "*", allow: "/", disallow: ["/play", "/settings"] },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
