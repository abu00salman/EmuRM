/**
 * Hooks for the native app wrappers (android-app/, ios-app/). A no-op import on every
 * other platform — everything below only runs when a native bridge object is actually
 * present, which is true only inside one of those apps' WebViews. None of this touches
 * the web app's own behavior for browser/desktop/PWA users.
 *
 * Android (android-app/.../MainActivity.kt) injects `window.AndroidNative` directly via
 * addJavascriptInterface, with synchronous method calls. iOS (ios-app/.../WebViewCoordinator.swift)
 * registers a WKScriptMessageHandler under the name "emurmNative", reachable only via
 * `postMessage(payload)` — one-way, no return value. getNative() below normalizes both
 * into the same three-method shape so the rest of this file doesn't care which platform
 * it's running on.
 */
import { importFiles } from "@/lib/library/import";
import { useUI } from "@/stores/ui";
import { getT } from "@/lib/i18n";

interface NativeBridge {
  notifyPlaying(playing: boolean): void;
  notifyMenuOpen(open: boolean): void;
  saveBlob(base64Data: string, filename: string, mimeType: string): void;
}

declare global {
  interface Window {
    AndroidNative?: NativeBridge & { isNativeApp(): boolean };
    webkit?: { messageHandlers?: Record<string, { postMessage(message: unknown): void }> };
    __androidImportSharedFile?: (name: string, base64: string, mime: string) => void;
  }
}

function getNative(): NativeBridge | null {
  if (typeof window === "undefined") return null;
  if (window.AndroidNative) return window.AndroidNative;
  const ios = window.webkit?.messageHandlers?.emurmNative;
  if (ios) {
    return {
      notifyPlaying: (playing) => ios.postMessage({ action: "notifyPlaying", playing }),
      notifyMenuOpen: (open) => ios.postMessage({ action: "notifyMenuOpen", open }),
      saveBlob: (base64Data, filename, mimeType) => ios.postMessage({ action: "saveBlob", base64Data, filename, mimeType }),
    };
  }
  return null;
}

const native = getNative();

if (native) {
  // Tracks the two bits of state the native shell needs and can't see on its own:
  // whether a game is actively running (drives immersive fullscreen + audio focus)
  // and whether the pause menu is currently open (so a phone call arriving while
  // it's already open doesn't blindly toggle it shut via the same Escape dispatch
  // the back button / audio-interruption handling uses). Both derive from DOM state
  // Player.tsx already maintains (document.body.dataset.playing, and the pause menu's
  // own data-pause-menu-root attribute), so this needs no changes to the player itself.
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

  // Neither WebView can resolve blob: URLs through its normal download path — a
  // well-known gap in both Chromium WebView and WKWebView, not an EmuRM bug.
  // Intercept the exact pattern the screenshot feature (and anything else using the
  // same a[download] + blob: URL convention) already uses, and hand the bytes to
  // native instead.
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

  // "Share to EmuRM" from a file manager or another app — Android only for now (see
  // MainActivity's ACTION_SEND handling); iOS has no equivalent yet (would need a
  // separate Share Extension target, out of scope for the first iOS build). Reuses the
  // exact same import pipeline and ambiguous-format picker as the in-page "Add games"
  // dialog — nothing import-specific is duplicated.
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
