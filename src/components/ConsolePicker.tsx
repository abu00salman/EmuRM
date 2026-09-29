"use client";
import { useUI } from "@/stores/ui";
import { CONSOLES, getConsole } from "@/lib/consoles/registry";
import { useT } from "@/lib/i18n";
import { Modal } from "./Modal";
import { DeviceGlyph } from "./DeviceGlyph";

export function ConsolePicker() {
  const pick = useUI((s) => s.pick);
  const answer = useUI((s) => s.answerPick);
  const t = useT();
  const list = pick?.candidates.length ? pick.candidates.map((id) => getConsole(id)!).filter(Boolean) : CONSOLES;

  return (
    <Modal open={!!pick} onClose={() => answer(null)} label={t("picker.label")}>
      <h2 className="font-display text-3xl font-bold">{t("picker.question")}</h2>
      <p className="mt-1 text-sm text-muted" dir="auto">
        {t("picker.subtitle", { title: pick?.title ?? "" })}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {list.map((c) => (
          <button
            key={c.id}
            data-nav
            onClick={() => answer(c.id)}
            style={{ ["--accent" as string]: c.accent }}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-line bg-white/[0.03] p-3 text-left transition-colors hover:border-[color:var(--accent)]"
          >
            <DeviceGlyph form={c.form} className="h-10 w-14 text-[color:var(--accent)]" />
            <span className="text-sm font-semibold">{c.name}</span>
            <span className="text-xs text-muted">{c.maker.split(" · ")[0]}, {c.year}</span>
          </button>
        ))}
      </div>
      <button onClick={() => answer(null)} className="mt-4 w-full rounded-full py-2 text-sm text-muted hover:text-white">
        {t("picker.skip")}
      </button>
    </Modal>
  );
}
