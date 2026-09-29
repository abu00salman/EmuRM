"use client";
import Link from "next/link";
import { useT } from "@/lib/i18n";

export default function NotFound() {
  const t = useT();
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="font-display text-6xl font-extrabold">{t("notFound.title")}</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black">{t("notFound.back")}</Link>
      </div>
    </div>
  );
}
