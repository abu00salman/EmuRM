"use client";
import { usePwa, type BeforeInstallPromptEvent } from "@/stores/pwa";

/** iPadOS 13+ reports as "MacIntel" but with touch support; real Macs have none. */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Wires up `beforeinstallprompt`/`appinstalled` capture and initial standalone detection. */
export function initPwaInstall() {
  if (typeof window === "undefined") return;
  if (isStandalone()) usePwa.getState().markInstalled();
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    usePwa.getState().capture(e as BeforeInstallPromptEvent);
  });
  window.addEventListener("appinstalled", () => usePwa.getState().markInstalled());
}
