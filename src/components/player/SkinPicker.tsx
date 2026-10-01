"use client";
import { AnimatePresence, motion } from "motion/react";
import type { ConsoleDef } from "@/lib/consoles/types";
import { DEFAULT_SKIN_ID, getSkinsForConsole, skinThumbUrl } from "@/lib/skins";
import { useT } from "@/lib/i18n";
import { Icon } from "./Icon";

interface Props {
  open: boolean;
  onClose: () => void;
  console: ConsoleDef | undefined;
  currentSkinId: string;
  onSelect: (skinId: string) => void;
}

/**
 * A bottom sheet, not a side panel like the pause menu — this is a quick, in-the-
 * moment pick (one tap, immediate preview) rather than a settings dive, so it opens
 * from the bottom like the skin pickers in third-party emulator apps while staying
 * EmuRM's own look (glass panel, accent rings) rather than copying one verbatim.
 */
export function SkinPicker({ open, onClose, console: c, currentSkinId, onSelect }: Props) {
  const t = useT();
  const skins = c ? getSkinsForConsole(c.id) : [];
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-[6px]"
          onPointerDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-label={t("skins.title")}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="glass-strong flex max-h-[78vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl pb-[max(1.25rem,var(--safe-b))] pt-5 sm:rounded-3xl sm:pb-6"
          >
            <div className="flex items-center justify-between px-5">
              <div>
                <h2 className="font-display text-2xl font-bold">{t("skins.title")}</h2>
                <p className="mt-0.5 text-xs text-muted">{c?.name}</p>
              </div>
              <button data-nav onClick={onClose} aria-label={t("pauseMenu.close")} className="rounded-full p-1.5 text-muted hover:bg-white/10 hover:text-white">
                <Icon name="close" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 overflow-y-auto px-5 pb-1 sm:grid-cols-4">
              <SkinCard
                name={t("skins.default")}
                selected={currentSkinId === DEFAULT_SKIN_ID}
                onClick={() => onSelect(DEFAULT_SKIN_ID)}
              />
              {skins.map((skin) => (
                <SkinCard key={skin.id} name={skin.name} thumb={skinThumbUrl(skin)} selected={currentSkinId === skin.id} onClick={() => onSelect(skin.id)} />
              ))}
            </div>
            {skins.length === 0 && <p className="mt-3 px-5 text-xs text-faint">{t("skins.noneYet")}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SkinCard({ name, thumb, selected, onClick }: { name: string; thumb?: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      data-nav
      onClick={onClick}
      aria-pressed={selected}
      className={`group flex flex-col gap-1.5 rounded-2xl border p-1.5 text-start transition-colors ${selected ? "border-[color:var(--accent)] bg-white/10" : "border-line hover:border-white/30"}`}
    >
      <div className="relative aspect-[941/1672] w-full overflow-hidden rounded-xl bg-white/5">
        {thumb ? (
          // Skin thumbnails are plain decorative previews, not meaningful content —
          // no useful alt text beyond the name already printed below the tile.
          <img src={thumb} alt="" className="h-full w-full object-cover transition-transform duration-200 group-active:scale-95" draggable={false} />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <Icon name="stick" className="h-7 w-7 text-faint" />
          </div>
        )}
        {selected && (
          <span className="absolute end-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[color:var(--accent)] text-black shadow">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-9" /></svg>
          </span>
        )}
      </div>
      <span className="truncate text-[11px] leading-tight text-muted">{name}</span>
    </button>
  );
}
