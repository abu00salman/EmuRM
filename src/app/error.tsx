"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n";

/**
 * Next's App Router boundary for an unexpected render crash anywhere below the root
 * layout (so AppShell's own header/nav stays up around this, rather than losing the
 * whole page) — previously missing entirely, which meant any uncaught exception (a
 * bad record read from IndexedDB, a browser API missing on some device, …) unmounted
 * the entire app with nothing on screen and no way back short of knowing to navigate
 * the URL bar by hand. See global-error.tsx for the rarer case where the layout
 * itself is what crashed.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center bg-black p-6 text-center text-white">
      <div>
        <p className="font-display text-4xl font-bold">{t("app.error.title")}</p>
        <p className="mt-2 text-muted">{t("app.error.body")}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/" className="rounded-full border border-white/20 px-5 py-2.5 text-sm hover:bg-white/10">
            {t("app.error.home")}
          </Link>
          <button onClick={reset} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black">
            {t("app.error.reload")}
          </button>
        </div>
      </div>
    </div>
  );
}
