"use client";
import { useEffect } from "react";

/**
 * The catastrophic fallback: only fires when the ROOT LAYOUT itself fails to render
 * (AppShell or something it depends on), which error.tsx structurally cannot catch —
 * so this has to supply its own <html>/<body> and can't lean on anything from the
 * rest of the app (i18n, Tailwind's build output, stores) in case that's implicated
 * in whatever broke. Deliberately plain, inline-styled, dependency-free.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" dir="ltr">
      <body style={{ margin: 0, background: "#000", color: "#fff", minHeight: "100dvh", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif", padding: 24, textAlign: "center" }}>
        <div>
          <p style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Something went wrong</p>
          <p style={{ opacity: 0.7, marginTop: 8 }}>EmuRM hit an unexpected error. Reloading usually fixes it.</p>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 8 }}>
            <a href="/" style={{ border: "1px solid rgba(255,255,255,0.2)", borderRadius: 999, padding: "10px 20px", fontSize: 14, color: "#fff", textDecoration: "none" }}>
              Home
            </a>
            <button
              onClick={reset}
              style={{ background: "#fff", color: "#000", border: "none", borderRadius: 999, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
