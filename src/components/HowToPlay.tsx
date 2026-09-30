"use client";
import { CONSOLES } from "@/lib/consoles/registry";
import { useT } from "@/lib/i18n";
import { DeviceGlyph } from "./DeviceGlyph";
import { Modal } from "./Modal";

/** One numbered step in the walkthrough: an icon badge, a title, and a body line. */
function Step({ icon, title, body, children }: { icon: string; title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-line bg-white/[0.02] p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.06] text-xl" aria-hidden>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-bold">{title}</p>
        <p className="mt-1 text-sm text-muted">{body}</p>
        {children}
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span dir="ltr" className="rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[11px] font-medium text-muted">
      {children}
    </span>
  );
}

export function HowToPlay({ open, onClose, onChooseDevice }: { open: boolean; onClose: () => void; onChooseDevice: () => void }) {
  const t = useT();

  return (
    <Modal open={open} onClose={onClose} label={t("howToPlay.title")} wide>
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-display text-3xl font-bold">🎮 {t("howToPlay.title")}</h2>
        <button onClick={onClose} aria-label={t("import.close")} className="rounded-full p-2 text-muted hover:bg-white/10 hover:text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <Step icon="🕹️" title={t("howToPlay.step1Title")} body={t("howToPlay.step1Body")} />
        <Step icon="📥" title={t("howToPlay.step2Title")} body={t("howToPlay.step2Body")} />
        <Step icon="⬆️" title={t("howToPlay.step3Title")} body={t("howToPlay.step3Body")}>
          <span dir="auto" className="mt-2 inline-block rounded-full border border-white/20 px-3 py-1 text-xs font-medium">
            {t("howToPlay.importLabel")}
          </span>
        </Step>

        <Step icon="🗂️" title={t("howToPlay.step4Title")} body={t("howToPlay.step4Body")}>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CONSOLES.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-xl border border-line bg-black/20 p-2.5" style={{ ["--accent" as string]: c.accent }}>
                <DeviceGlyph form={c.form} className="h-6 w-8 shrink-0 text-[color:var(--accent)]" strokeWidth={1.6} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{c.short}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Array.from(new Set([...c.extensions, "zip"])).map((ext) => (
                      <Badge key={ext}>.{ext}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-faint">{t("howToPlay.zipNote")}</p>
        </Step>

        <Step icon="▶️" title={t("howToPlay.step5Title")} body={t("howToPlay.step5Body")}>
          <span dir="auto" className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
            {t("howToPlay.playLabel")}
          </span>
        </Step>

        <p dir="auto" className="mt-1 text-center text-sm font-medium text-muted">{t("howToPlay.summary")}</p>
      </div>

      <button
        data-nav
        data-autofocus
        onClick={() => {
          onClose();
          onChooseDevice();
        }}
        className="mt-5 w-full rounded-full bg-white py-3 text-sm font-semibold text-black transition-transform active:scale-[0.98]"
      >
        🎮 {t("howToPlay.cta")}
      </button>
    </Modal>
  );
}
