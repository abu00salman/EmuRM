"use client";
import { LibraryBrowser } from "@/components/LibraryBrowser";
import { useT } from "@/lib/i18n";

export default function LibraryPage() {
  const t = useT();
  return (
    <div className="mx-auto max-w-[1600px] px-[max(1rem,var(--safe-l))] pb-24 pt-[calc(var(--safe-t)+6.5rem)] sm:px-8">
      <h1 className="mb-6 font-display text-[clamp(2.75rem,6vw,5.5rem)] font-extrabold leading-[0.85]">{t("library.title")}</h1>
      <LibraryBrowser />
    </div>
  );
}
