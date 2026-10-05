"use client";
import { LibraryBrowser } from "@/components/LibraryBrowser";
import { useT } from "@/lib/i18n";

export default function LibraryPage() {
  const t = useT();
  return (
    <div className="mx-auto max-w-[1600px] px-[max(1rem,var(--safe-l))] pb-24 pt-[calc(var(--safe-t)+6.5rem)] sm:px-8">
      <h1 className="mb-6 font-display text-[clamp(2rem,4vw,3.5rem)] font-bold leading-[1.2]">{t("library.title")}</h1>
      <LibraryBrowser />
    </div>
  );
}
