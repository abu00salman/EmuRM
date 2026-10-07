"use client";
import { create } from "zustand";

export type Theme = "dark" | "light";

const STORAGE_KEY = "emurm:theme";
/** Matches --color-ink in each theme; feeds <meta name="theme-color"> so the
 *  browser chrome / status bar follows the page. */
const CHROME: Record<Theme, string> = { dark: "#080c14", light: "#f4f6fb" };

export function applyDocumentTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", CHROME[theme]));
}

/**
 * Runs `update` inside a View Transition when the browser supports it, so a
 * theme or language switch cross-fades instead of snapping. Falls back to an
 * instant update (and always does so under prefers-reduced-motion).
 */
export function smoothSwitch(update: () => void) {
  if (typeof document === "undefined") return update();
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduced) return update();
  doc.startViewTransition(update);
}

interface ThemeState {
  theme: Theme;
  hydrated: boolean;
  setTheme: (t: Theme) => void;
  toggle: () => void;
  hydrateFromStorage: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // Dark is the official default; the static HTML is exported dark.
  theme: "dark",
  hydrated: false,
  setTheme: (t) => {
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* private mode */
    }
    applyDocumentTheme(t);
    set({ theme: t, hydrated: true });
  },
  toggle: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    smoothSwitch(() => get().setTheme(next));
  },
  hydrateFromStorage: () => {
    if (get().hydrated) return;
    let stored: Theme | null = null;
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "dark" || v === "light") stored = v;
    } catch {
      /* private mode */
    }
    const theme = stored ?? "dark";
    applyDocumentTheme(theme);
    set({ hydrated: true, theme });
  },
}));

/* The matching <head> boot script lives in @/lib/boot-scripts (server-safe module). */
