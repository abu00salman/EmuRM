"use client";
import { useState } from "react";
import Link from "next/link";
import { CONSOLES } from "@/lib/consoles/registry";
import { useCountsByConsole } from "@/lib/db/hooks";
import { useLocale, useT } from "@/lib/i18n";
import { Icon } from "./player/Icon";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
type Filter = "all" | "home" | "portable";
export function ConsoleHall() {
  const counts = useCountsByConsole();
  const t = useT();
  const ar = useLocale() === "ar";
  const [filter, setFilter] = useState<Filter>("all");
  const systems = CONSOLES.filter(c => filter === "all" || (c.form.startsWith("handheld") ? filter === "portable" : filter === "home"));
  return <>
    <div className="rm-filter-row" role="group" aria-label={ar ? "نوع الأجهزة" : "Console type"}>
      {([ ["all", ar ? "كل الأجهزة" : "All systems"], ["home", ar ? "أجهزة منزلية" : "Home consoles"], ["portable", ar ? "أجهزة محمولة" : "Handhelds"] ] as const).map(([id, label]) => <button data-nav key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
    </div>
    <div className="rm-console-grid">
      {systems.map(c => <Link data-nav key={c.id} href={`/console/${c.id}/`} className="rm-console-card" style={{ "--console-accent": c.accent } as React.CSSProperties}>
        <div className="rm-console-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE}/images/consoles/${c.photo}`} loading="lazy" alt="" />
          <span className="rm-console-year">{c.year}</span>
          {c.status === "experimental" && <span className="rm-experimental">{t("consoleCase.experimental")}</span>}
        </div>
        <div className="rm-console-info"><div><span className="rm-console-maker">{ar ? c.nicknameAr || c.maker : c.maker}</span><h3 dir="ltr">{c.short}</h3><p>{ar ? `${counts?.[c.id] ?? 0} لعبة في مكتبتك` : `${counts?.[c.id] ?? 0} games in your library`}</p></div><span className="rm-console-arrow"><Icon name="arrow" /></span></div>
      </Link>)}
    </div>
  </>;
}
