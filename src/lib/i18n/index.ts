"use client";
import { create } from "zustand";
import { en, ar, type TranslationKey } from "./translations";

export type Locale = "en" | "ar";

const DICTS: Record<Locale, Record<TranslationKey, string>> = { en, ar };
const STORAGE_KEY = "emurm:locale";

function detectStored(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "ar") return saved;
  } catch {
    /* private mode */
  }
  return navigator.language?.toLowerCase().startsWith("ar") ? "ar" : null;
}

export function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}

interface LocaleState {
  locale: Locale;
  hydrated: boolean;
  setLocale: (l: Locale) => void;
  /** Reconciles store state with localStorage/navigator after mount, once, without
   *  touching the value used for the very first client render (which must match
   *  the statically-exported "en" HTML to avoid a hydration mismatch). */
  hydrateFromStorage: () => void;
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: "en",
  hydrated: false,
  setLocale: (l) => {
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* private mode */
    }
    applyDocumentLocale(l);
    set({ locale: l, hydrated: true });
  },
  hydrateFromStorage: () => {
    if (get().hydrated) return;
    const stored = detectStored();
    set({ hydrated: true });
    if (stored && stored !== get().locale) get().setLocale(stored);
  },
}));

/* The matching <head> boot script lives in @/lib/boot-scripts (server-safe module). */

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function useLocale(): Locale {
  return useLocaleStore((s) => s.locale);
}

export type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export function useT(): TFn {
  const locale = useLocaleStore((s) => s.locale);
  return (key, vars) => interpolate(DICTS[locale][key] ?? DICTS.en[key], vars);
}

/** Same lookup as useT(), for plain modules (e.g. the importer) that aren't components. */
export function getT(): TFn {
  const locale = useLocaleStore.getState().locale;
  return (key, vars) => interpolate(DICTS[locale][key] ?? DICTS.en[key], vars);
}

/** Plural-ish helper for the two English/Arabic forms this app needs ("game"/"games"). */
export function usePlural() {
  const t = useT();
  return (count: number, oneKey: TranslationKey, otherKey: TranslationKey) => t(count === 1 ? oneKey : otherKey);
}
