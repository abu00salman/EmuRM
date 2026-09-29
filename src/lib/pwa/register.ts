"use client";

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (process.env.NODE_ENV !== "production") return;
  window.addEventListener("load", () => {
    // Absolute from the site root's base path (not the current page's path, which
    // may be several levels deep), so it resolves whether the app is served from
    // the domain root or a subpath (e.g. GitHub Pages' /repo/).
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch((err) => {
      console.warn("[EmuRM] Service worker registration failed", err);
    });
  });
}
