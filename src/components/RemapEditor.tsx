"use client";
import { useEffect, useState } from "react";
import type { ConsoleDef, PadButton } from "@/lib/consoles/types";
import type { InputBindings } from "@/lib/engine/types";
import { codeToRetroArch, DEFAULT_BINDINGS, gamepadLabel, keyLabel, mergeBindings, PAD_ORDER, RESERVED_CODES } from "@/lib/input/bindings";
import { setSetting } from "@/lib/db/repo";
import { useSetting } from "@/lib/db/hooks";
import { useT, type TFn } from "@/lib/i18n";

function padNames(t: TFn): Record<PadButton, string> {
  return {
    up: t("pad.up"), down: t("pad.down"), left: t("pad.left"), right: t("pad.right"),
    a: t("pad.a"), b: t("pad.b"), x: t("pad.x"), y: t("pad.y"),
    l: t("pad.l"), r: t("pad.r"), l2: t("pad.l2"), r2: t("pad.r2"),
    start: t("pad.start"), select: t("pad.select"),
  };
}

function relevant(t: TFn, c?: ConsoleDef): { pad: PadButton; label: string }[] {
  const names = padNames(t);
  if (!c) return PAD_ORDER.map((p) => ({ pad: p, label: names[p] }));
  const out: { pad: PadButton; label: string }[] = (["up", "down", "left", "right"] as PadButton[]).map((p) => ({ pad: p, label: names[p] }));
  for (const b of [...c.faceButtons, ...c.shoulderButtons]) out.push({ pad: b.pad, label: b.label });
  out.push({ pad: "start", label: c.id === "ngp" ? t("pad.option") : c.id === "pce" ? t("pad.run") : t("pad.start") });
  if (c.hasSelect) out.push({ pad: "select", label: t("pad.select") });
  return out;
}

type Capture = { pad: PadButton; kind: "keyboard" | "gamepad" } | null;

export function RemapEditor({ console: c, onChange }: { console?: ConsoleDef; onChange?: () => void }) {
  const saved = useSetting<Partial<InputBindings> | undefined>("bindings", undefined);
  const bindings = mergeBindings(saved);
  const t = useT();
  const [capture, setCapture] = useState<Capture>(null);
  const [hint, setHint] = useState<string | null>(null);

  const save = async (next: InputBindings) => {
    await setSetting("bindings", next);
    onChange?.();
  };

  useEffect(() => {
    if (!capture) return;
    setHint(null);
    if (capture.kind === "keyboard") {
      const onKey = (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.code === "Escape") return setCapture(null);
        if (RESERVED_CODES.has(e.code)) return setHint(t("remap.reservedKey", { key: e.key }));
        const ra = codeToRetroArch(e.code);
        if (!ra) return setHint(t("remap.unsupportedKey", { key: e.key }));
        const keyboard = { ...bindings.keyboard };
        for (const k of Object.keys(keyboard) as PadButton[]) if (keyboard[k] === ra) keyboard[k] = "nul";
        keyboard[capture.pad] = ra;
        void save({ ...bindings, keyboard });
        setCapture(null);
      };
      window.addEventListener("keydown", onKey, true);
      return () => window.removeEventListener("keydown", onKey, true);
    }
    // Gamepad: wait for a button that wasn't already held
    let raf = 0;
    const held = new Set<string>();
    const first = navigator.getGamepads?.() ?? [];
    for (const gp of first) gp?.buttons.forEach((b, i) => b.pressed && held.add(`${gp.index}:${i}`));
    const loop = () => {
      raf = requestAnimationFrame(loop);
      for (const gp of navigator.getGamepads?.() ?? []) {
        if (!gp) continue;
        gp.buttons.forEach((b, i) => {
          const id = `${gp.index}:${i}`;
          if (b.pressed && !held.has(id)) {
            cancelAnimationFrame(raf);
            const gamepad = { ...bindings.gamepad };
            for (const k of Object.keys(gamepad) as PadButton[]) if (gamepad[k] === i) delete gamepad[k];
            gamepad[capture.pad] = i;
            void save({ ...bindings, gamepad });
            setCapture(null);
          } else if (!b.pressed) held.delete(id);
        });
      }
    };
    raf = requestAnimationFrame(loop);
    const esc = (e: KeyboardEvent) => e.code === "Escape" && setCapture(null);
    window.addEventListener("keydown", esc, true);
    const noPad = setTimeout(() => {
      if (!(navigator.getGamepads?.() ?? []).some(Boolean)) setHint(t("remap.noController"));
    }, 600);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(noPad);
      window.removeEventListener("keydown", esc, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capture]);

  const names = padNames(t);
  const rows = relevant(t, c);

  return (
    <div>
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2 gap-y-1 text-sm">
        <span className="pb-1 text-xs text-faint">{t("remap.header.button")}</span>
        <span className="w-32 pb-1 text-xs text-faint">{t("remap.header.keyboard")}</span>
        <span className="w-32 pb-1 text-xs text-faint">{t("remap.header.controller")}</span>
        {rows.map(({ pad, label }) => {
          const kbActive = capture?.pad === pad && capture.kind === "keyboard";
          const gpActive = capture?.pad === pad && capture.kind === "gamepad";
          const gp = bindings.gamepad[pad];
          return (
            <div key={pad} className="contents">
              <span className="py-1">{label}{label !== names[pad] && <span className="ms-2 text-xs text-faint">{t("remap.retroPadPrefix", { name: names[pad] })}</span>}</span>
              <button
                data-nav
                onClick={() => setCapture({ pad, kind: "keyboard" })}
                className={`w-32 truncate rounded-lg border px-3 py-1.5 text-start transition-colors ${kbActive ? "border-white bg-white text-black" : "border-line hover:border-white/30"}`}
              >
                {kbActive ? t("remap.pressKey") : keyLabel(t, bindings.keyboard[pad])}
              </button>
              <button
                data-nav
                onClick={() => setCapture({ pad, kind: "gamepad" })}
                className={`w-32 truncate rounded-lg border px-3 py-1.5 text-start transition-colors ${gpActive ? "border-white bg-white text-black" : "border-line hover:border-white/30"}`}
              >
                {gpActive ? t("remap.pressButton") : gp === undefined ? t("remap.none") : gamepadLabel(t, gp)}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-3 min-h-5 text-xs text-amber-200/80" aria-live="polite">{hint}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-faint">
        <span>{t("remap.footer")}</span>
        <button onClick={() => void save(DEFAULT_BINDINGS)} className="rounded-full px-3 py-1.5 text-muted hover:bg-white/10 hover:text-white">
          {t("remap.reset")}
        </button>
      </div>
    </div>
  );
}
