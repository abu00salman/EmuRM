import type { Locale } from "./i18n";

const WORDS: Record<Locale, { notPlayed: string; underMinute: string; never: string; justNow: string; min: string; h: string }> = {
  en: { notPlayed: "Not played yet", underMinute: "Under a minute", never: "Never", justNow: "Just now", min: "min", h: "h" },
  ar: { notPlayed: "لم تُلعب بعد", underMinute: "أقل من دقيقة", never: "أبدًا", justNow: "الآن", min: "د", h: "س" },
};

export function formatPlayTime(sec: number, locale: Locale = "en"): string {
  const w = WORDS[locale];
  if (!sec || sec < 60) return sec ? w.underMinute : w.notPlayed;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h} ${w.h} ${m} ${w.min}` : `${m} ${w.min}`;
}

export function formatRelative(ts: number, locale: Locale = "en"): string {
  const w = WORDS[locale];
  if (!ts) return w.never;
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return w.justNow;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (min < 60) return rtf.format(-min, "minute");
  const h = Math.round(min / 60);
  if (h < 24) return rtf.format(-h, "hour");
  const d = Math.round(h / 24);
  if (d < 7) return rtf.format(-d, "day");
  return new Date(ts).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
