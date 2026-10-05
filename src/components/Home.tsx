"use client";
import { useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { CONSOLES } from "@/lib/consoles/registry";
import { useUI } from "@/stores/ui";
import { useT, useLocale } from "@/lib/i18n";
import { ConsoleHall } from "./ConsoleHall";
import { HowToPlay } from "./HowToPlay";
import { QuickResume } from "./QuickResume";
import { Icon } from "./player/Icon";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const FEATURED = ["psx", "nes", "msx", "md", "gba"];

export function Home() {
  const [selected, setSelected] = useState("psx");
  const [howToPlay, setHowToPlay] = useState(false);
  const reduce = useReducedMotion();
  const openImport = useUI((s) => s.openImport);
  const total = useLiveQuery(() => db().games.count());
  const t = useT();
  const ar = useLocale() === "ar";
  const c = CONSOLES.find((item) => item.id === selected)!;
  return (
    <div className="rm-home rm-container">
      <section className="rm-hero" aria-labelledby="home-heading" style={{ "--console-accent": c.accent } as React.CSSProperties}>
        <div className="rm-hero-art" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={c.id} src={`${BASE}/images/consoles/${c.photo}`} alt="" fetchPriority="high" />
          <span className="rm-hardware-label" dir="ltr">{c.maker} / {c.year}</span>
        </div>
        <div className="rm-hero-copy">
          <p className="rm-eyebrow"><span /> {ar ? "أجيال من اللعب. مكان واحد." : "GENERATIONS OF PLAY. ONE PLACE."}</p>
          <h1 id="home-heading">{ar ? <>ذكرياتك.<br /><em>جاهزة للّعب.</em></> : <>Your classics.<br /><em>Ready to play.</em></>}</h1>
          <p className="rm-hero-description">{ar ? "من صخر إلى بلايستيشن. أضف ألعابك، اختر جهازك، وارجع للحظة التي تحبّها." : "From MSX to PlayStation. Bring your games, choose your console, and return to a moment you love."}</p>
          <div className="rm-actions">
            <button data-nav className="rm-button rm-button-primary" onClick={() => openImport("device")}><Icon name="plus" />{t("nav.addGames")}</button>
            <button data-nav className="rm-button rm-button-secondary" onClick={() => setHowToPlay(true)}><Icon name="play" />{t("howToPlay.button")}</button>
          </div>
          <div className="rm-hero-meta"><span>{CONSOLES.length} {ar ? "نظامًا" : "systems"}</span><span>{ar ? "مكتبتك على جهازك" : "Your library, on your device"}</span></div>
        </div>
        <div className="rm-hero-bottom">
          <div className="rm-system-switch" role="group" aria-label={ar ? "الجهاز المعروض" : "Featured console"}>
            {FEATURED.map(id => { const system = CONSOLES.find(x => x.id === id)!; return <button key={id} data-nav aria-pressed={selected === id} onClick={() => setSelected(id)}>{system.short}</button>; })}
          </div>
          <Link data-nav href={`/console/${c.id}/`} className="rm-feature-link"><span><small>{ar ? "اكتشف الجهاز" : "EXPLORE THE SYSTEM"}</small><strong dir="auto">{ar ? c.nicknameAr || c.name : c.name}</strong></span><Icon name="arrow" /></Link>
        </div>
      </section>

      <QuickResume />

      <section className="rm-systems" id="console-hall" aria-labelledby="systems-heading">
        <div className="rm-section-heading"><div><p className="rm-eyebrow">{ar ? "عالمك الكلاسيكي" : "YOUR RETRO UNIVERSE"}</p><h2 id="systems-heading">{t("home.headline")}</h2></div><span className="rm-count">{CONSOLES.length} {ar ? "نظامًا" : "systems"} · {total ?? 0} {ar ? "لعبة" : "games"}</span></div>
        <ConsoleHall />
      </section>
      <section className="rm-start-banner">
        <span className="rm-start-symbol"><Icon name="gamepad" /></span>
        <div><h2>{ar ? "الخطوة الأولى؟ لعبة واحدة." : "It starts with one game."}</h2><p>{ar ? "استورد ملف لعبتك، وسيُضاف إلى مكتبتك على هذا الجهاز." : "Import a game file and make yourself at home."}</p></div>
        <button data-nav className="rm-button rm-button-secondary" onClick={() => openImport("device")}>{t("library.chooseFiles")}<Icon name="plus" /></button>
      </section>
      <HowToPlay open={howToPlay} onClose={() => setHowToPlay(false)} onChooseDevice={() => document.getElementById("console-hall")?.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "start" })} />
    </div>
  );
}
