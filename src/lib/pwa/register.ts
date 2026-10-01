"use client";
import { getT } from "@/lib/i18n";
import { useUI } from "@/stores/ui";

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (process.env.NODE_ENV !== "production") return;

  // The worker calls skipWaiting()+clients.claim() on its own as soon as it activates
  // (see sw.js), so an already-open tab's *fetches* start hitting the new version right
  // away — but its React tree/JS chunks already in memory are still the old build's.
  // If that old code then asks the browser for a chunk the new deploy didn't ship (every
  // Next.js build renames its chunks), the request 404s and the page is stuck broken
  // with no way back short of knowing to hard-reload — exactly the "loads, then goes
  // blank/frozen" failure this is here to prevent. controllerchange fires exactly at
  // that handoff, so reload there, before any old code gets the chance to ask for
  // something that no longer exists. The one case that must NOT be yanked out from
  // under the player is mid-game — the toast still offers a manual reload there
  // instead, and it stays reachable since the running game itself is untouched.
  let seenController = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!seenController) {
      seenController = true; // the very first control (fresh registration), not an update
      return;
    }
    if (document.body.dataset.playing !== "true") {
      window.location.reload();
      return;
    }
    const t = getT();
    useUI.getState().toast({
      message: t("pwa.updateReady"),
      action: { label: t("pwa.reload"), run: () => window.location.reload() },
    });
  });

  const register = () => {
    // Absolute from the site root's base path (not the current page's path, which
    // may be several levels deep), so it resolves whether the app is served from
    // the domain root or a subpath (e.g. GitHub Pages' /repo/).
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch((err) => {
      console.warn("[EmuRM] Service worker registration failed", err);
    });
  };
  // React mounts and runs this well after the page's own `load` event in practice, so
  // waiting for "load" here almost never fires — it already happened. Register right
  // away once the document is actually ready; only defer if it somehow isn't yet.
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register);
}
