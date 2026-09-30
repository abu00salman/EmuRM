"use client";
import { useRef, useState } from "react";
import { useUI } from "@/stores/ui";
import { ALL_EXTENSIONS, getConsole } from "@/lib/consoles/registry";
import { DEMO_GAMES, type DemoGame } from "@/lib/library/demo-catalog";
import { useGames } from "@/lib/db/hooks";
import { useT } from "@/lib/i18n";
import { Modal } from "./Modal";
import { useImport } from "./useImport";

const ACCEPT = ALL_EXTENSIONS.map((e) => `.${e}`).join(",");

export function ImportDialog() {
  const open = useUI((s) => s.importOpen);
  const tab = useUI((s) => s.importTab);
  const consoleId = useUI((s) => s.importConsole);
  const openImport = useUI((s) => s.openImport);
  const close = useUI((s) => s.closeImport);
  const target = consoleId ? getConsole(consoleId) : undefined;
  const t = useT();

  const tabs = [
    { id: "device", label: t("import.tabDevice") },
    { id: "link", label: t("import.tabLink") },
    { id: "demo", label: t("import.tabDemo") },
  ] as const;

  return (
    <Modal open={open} onClose={close} label={t("import.title")} wide>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold">{target ? t("import.titleTo", { system: target.short }) : t("import.title")}</h2>
          <p className="mt-1 max-w-md text-sm text-muted">{t("import.subtitle")}</p>
        </div>
        <button onClick={close} aria-label={t("import.close")} className="rounded-full p-2 text-muted hover:bg-white/10 hover:text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      <div role="tablist" className="mt-5 flex gap-1 rounded-full bg-white/[0.04] p-1 text-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            data-nav
            aria-selected={tab === t.id}
            onClick={() => openImport(t.id, consoleId)}
            className={`flex-1 rounded-full px-3 py-2 transition-colors ${tab === t.id ? "bg-white text-black" : "text-muted hover:text-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "device" && <DeviceTab />}
        {tab === "link" && <LinkTab />}
        {tab === "demo" && <DemoTab />}
      </div>
    </Modal>
  );
}

function DeviceTab() {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const consoleId = useUI((s) => s.importConsole);
  const close = useUI((s) => s.closeImport);
  const { busy, fromFiles } = useImport();
  const t = useT();
  // Scoped to the console's own extensions when opened from its page — the OS file
  // picker then only shows compatible files. Native `accept` is advisory (drag-and-drop
  // still lands in the same handler either way), so this only ever helps, never blocks.
  const target = consoleId ? getConsole(consoleId) : undefined;
  const accept = target ? Array.from(new Set([...target.extensions, "zip"])).map((e) => `.${e}`).join(",") : ACCEPT;

  const handle = async (files: File[]) => {
    const r = await fromFiles(files, consoleId);
    if (r && (r.added.length || r.existing.length)) close();
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void handle(Array.from(e.dataTransfer.files));
      }}
      className={`flex flex-col items-center rounded-2xl border border-dashed px-6 py-10 text-center transition-colors ${over ? "border-white/60 bg-white/[0.06]" : "border-white/15"}`}
    >
      <p className="font-display text-2xl font-bold">{busy ? t("import.deviceReading") : t("import.deviceDrop")}</p>
      <p className="mt-1 text-sm text-muted">{t("import.deviceHint")}</p>
      <button
        data-nav
        data-autofocus
        disabled={busy}
        onClick={() => input.current?.click()}
        className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
      >
        {t("import.chooseFiles")}
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          void handle(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}

function LinkTab() {
  const [url, setUrl] = useState("");
  const [allowed, setAllowed] = useState(false);
  const consoleId = useUI((s) => s.importConsole);
  const close = useUI((s) => s.closeImport);
  const { busy, fromUrl } = useImport();
  const t = useT();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await fromUrl(url.trim(), { forceConsole: consoleId });
        if (r && (r.added.length || r.existing.length)) close();
      }}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-2 text-sm">
        <span className="text-muted">{t("import.linkLabel")}</span>
        <input
          data-autofocus
          type="url"
          inputMode="url"
          required
          placeholder="https://example.com/my-homebrew.nes"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="rounded-xl border border-line bg-black/40 px-4 py-3 text-base outline-none focus:border-white/40"
        />
      </label>
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" checked={allowed} onChange={(e) => setAllowed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-white" />
        <span>{t("import.linkOwn")}</span>
      </label>
      <p className="text-xs text-faint">{t("import.linkNote")}</p>
      <button
        type="submit"
        disabled={!allowed || !url || busy}
        className="rounded-full bg-white py-2.5 text-sm font-semibold text-black disabled:opacity-40"
      >
        {busy ? t("import.linkDownloading") : t("import.linkSubmit")}
      </button>
    </form>
  );
}

function DemoTab() {
  const games = useGames();
  const consoleId = useUI((s) => s.importConsole);
  const { fromUrl } = useImport();
  const t = useT();
  const [loading, setLoading] = useState<string | null>(null);
  const list = consoleId ? DEMO_GAMES.filter((d) => d.consoleId === consoleId) : DEMO_GAMES;
  const owned = new Set(games?.map((g) => `${g.consoleId}:${g.title}`));

  const add = async (d: DemoGame) => {
    setLoading(d.rom);
    const cover = await fetch(d.cover).then((r) => (r.ok ? r.blob() : undefined)).catch(() => undefined);
    await fromUrl(d.rom, { title: d.title, author: d.author, cover, source: "demo", forceConsole: d.consoleId });
    setLoading(null);
  };

  if (!list.length) return <p className="py-8 text-center text-sm text-muted">{t("import.demoNone")}</p>;

  return (
    <div className="flex flex-col gap-2">
      {list.map((d) => {
        const c = getConsole(d.consoleId)!;
        const have = owned.has(`${d.consoleId}:${d.title}`);
        return (
          <div key={d.rom} className="flex items-center gap-4 rounded-2xl border border-line bg-white/[0.02] p-3" style={{ ["--accent" as string]: c.accent }}>
            <div className="h-12 w-1 shrink-0 rounded-full" style={{ background: c.accent }} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{d.title}</p>
              <p className="truncate text-xs text-muted">
                {c.short}, by {d.author}. {d.note}
              </p>
            </div>
            <a href={d.homepage} target="_blank" rel="noreferrer" className="hidden text-xs text-muted underline-offset-4 hover:underline sm:block">
              {t("import.demoSource")}
            </a>
            <button
              data-nav
              disabled={have || loading !== null}
              onClick={() => void add(d)}
              className="shrink-0 rounded-full border border-white/20 px-4 py-1.5 text-sm font-medium transition-colors hover:bg-white hover:text-black disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-white"
            >
              {have ? t("import.demoAdded") : loading === d.rom ? t("import.demoAdding") : t("import.demoAdd")}
            </button>
          </div>
        );
      })}
      <p className="mt-2 text-xs text-faint">{t("import.demoFooter")}</p>
    </div>
  );
}
