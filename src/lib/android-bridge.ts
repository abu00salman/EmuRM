/**
 * Hooks for the native Android wrapper (android-app/). A no-op import on every other
 * platform — everything below only runs when `window.AndroidNative` exists, which is
 * true only inside that app's WebView (see android-app/.../MainActivity.kt). None of
 * this touches the web app's own behavior for browser/desktop/iOS/PWA users.
 */
import { importFiles } from "@/lib/library/import";
import { useUI } from "@/stores/ui";
import { getT } from "@/lib/i18n";

declare global {
  interface Window {
    AndroidNative?: {
      isNativeApp(): boolean;
      notifyPlaying(playing: boolean): void;
      notifyMenuOpen(open: boolean): void;
      saveBlob(base64Data: string, filename: string, mimeType: string): void;
    };
    __androidImportSharedFile?: (name: string, base64: string, mime: string) => void;
  }
}

if (typeof window !== "undefined" && window.AndroidNative) {
  const native = window.AndroidNative;

  // Tracks the two bits of state the native shell needs and can't see on its own:
  // whether a game is actively running (drives immersive fullscreen + audio focus)
  // and whether the pause menu is currently open (so a phone call arriving while
  // it's already open doesn't blindly toggle it shut via the same Escape dispatch
  // the back button uses). Both derive from DOM state Player.tsx already maintains
  // (document.body.dataset.playing, and the pause menu's own data-pause-menu-root
  // attribute), so this needs no changes to the player itself.
  let lastPlaying = false;
  let lastMenuOpen = false;
  const sync = () => {
    const playing = document.body.dataset.playing === "true";
    if (playing !== lastPlaying) {
      lastPlaying = playing;
      native.notifyPlaying(playing);
    }
    const menuOpen = document.querySelector("[data-pause-menu-root]") !== null;
    if (menuOpen !== lastMenuOpen) {
      lastMenuOpen = menuOpen;
      native.notifyMenuOpen(menuOpen);
    }
  };
  new MutationObserver(sync).observe(document.body, {
    attributes: true,
    attributeFilter: ["data-playing"],
    childList: true,
    subtree: true,
  });
  sync();

  // WebView can't resolve blob: URLs through its normal download path (a well-known
  // Chromium WebView gap — DownloadListener receives the URL string but has no way
  // to fetch page-local blob storage from outside the page). Intercept the exact
  // pattern the screenshot feature (and anything else using the same a[download]
  // + blob: URL convention) already uses, and hand the bytes to native instead.
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target as HTMLElement | null)?.closest("a[download]");
      if (!(a instanceof HTMLAnchorElement) || !a.href.startsWith("blob:")) return;
      e.preventDefault();
      fetch(a.href)
        .then((r) => r.blob())
        .then(
          (blob) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            }),
        )
        .then((base64) => native.saveBlob(base64, a.download || "download", a.href))
        .catch(() => useUI.getState().toast({ message: getT()("toast.downloadFailed"), tone: "error" }));
    },
    true,
  );

  // "Share to EmuRM" from a file manager or another app (see MainActivity's
  // ACTION_SEND handling). Reuses the exact same import pipeline and ambiguous-format
  // picker as the in-page "Add games" dialog — nothing import-specific is duplicated.
  window.__androidImportSharedFile = (name, base64, mime) => {
    void (async () => {
      try {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const file = new File([bytes], name, { type: mime });
        const result = await importFiles([file], {
          chooseConsole: (rom, candidates) => useUI.getState().askConsole(rom.title, candidates),
        });
        const added = result.added[0];
        if (added) {
          const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
          window.location.assign(`${base}/play/?game=${added.id}`);
        } else if (result.skipped[0]) {
          useUI.getState().toast({ message: `${result.skipped[0].name}: ${result.skipped[0].reason}`, tone: "error" });
        }
      } catch {
        useUI.getState().toast({ message: getT()("toast.importFailed"), tone: "error" });
      }
    })();
  };
}
