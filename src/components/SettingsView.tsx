"use client";
import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { CONSOLES } from "@/lib/consoles/registry";
import type { ConsoleDef } from "@/lib/consoles/types";
import { db } from "@/lib/db/schema";
import { deleteBios, putBios, requestPersistence, storageEstimate } from "@/lib/db/repo";
import { formatBytes } from "@/lib/format";
import { useUI } from "@/stores/ui";
import { useT } from "@/lib/i18n";
import { RemapEditor } from "./RemapEditor";

const CORE_BASE = process.env.NEXT_PUBLIC_CORE_BASE ?? "";

export function SettingsView() {
  const t = useT();
  return (
    <div className="mx-auto max-w-3xl px-[max(1rem,var(--safe-l))] pb-24 pt-[calc(var(--safe-t)+6.5rem)] sm:px-8">
      <h1 className="font-display text-[clamp(2.75rem,6vw,5.5rem)] font-extrabold leading-[0.85]">{t("settings.title")}</h1>

      <Section id="controls" title={t("settings.controls.title")} lead={t("settings.controls.lead")}>
        <RemapEditor />
      </Section>

      <Section id="bios" title={t("settings.bios.title")} lead={t("settings.bios.lead")}>
        <div className="flex flex-col gap-2">
          {CONSOLES.filter((c) => c.bios.length).map((c) => (
            <BiosRow key={c.id} c={c} />
          ))}
        </div>
      </Section>

      <Section id="storage" title={t("settings.storage.title")} lead={t("settings.storage.lead")}>
        <StorageInfo />
      </Section>

      <Section id="emulators" title={t("settings.emulators.title")} lead={t("settings.emulators.lead")}>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[560px] text-start text-sm">
            <thead className="text-xs text-faint">
              <tr><th className="px-4 py-3 font-normal">{t("settings.table.system")}</th><th className="px-4 py-3 font-normal">{t("settings.table.emulator")}</th><th className="px-4 py-3 font-normal">{t("settings.table.license")}</th><th className="px-4 py-3 font-normal">{t("settings.table.status")}</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {CONSOLES.map((c) => {
                const core = c.cores[0];
                const available = core.hosting === "cdn" || !!CORE_BASE;
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3"><span className="me-2 inline-block h-2 w-2 rounded-full" style={{ background: c.accent }} />{c.name}</td>
                    <td className="px-4 py-3"><a className="underline-offset-4 hover:underline" href={core.upstream} target="_blank" rel="noreferrer">{core.id}</a></td>
                    <td className="px-4 py-3 text-muted">{core.license}</td>
                    <td className="px-4 py-3 text-muted">{available ? t(c.status === "experimental" ? "settings.status.experimental" : "settings.status.ready") : t("settings.status.needsHosting")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-faint">{t("settings.legalNote")}</p>
      </Section>

      <Section id="about" title={t("settings.about.title")} lead="">
        <p className="text-sm leading-relaxed text-muted">{t("settings.about.body")}</p>
      </Section>
    </div>
  );
}

function Section({ id, title, lead, children }: { id: string; title: string; lead: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-14 scroll-mt-28">
      <h2 className="font-display text-3xl font-bold">{title}</h2>
      {lead && <p className="mt-1 max-w-[60ch] text-sm text-muted">{lead}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function BiosRow({ c }: { c: ConsoleDef }) {
  const have = useLiveQuery(() => db().bios.where("consoleId").equals(c.id).toArray(), [c.id]);
  const input = useRef<HTMLInputElement>(null);
  const toast = useUI((s) => s.toast);
  const t = useT();
  const names = new Map(have?.map((b) => [b.fileName.toLowerCase(), b]));

  return (
    <div className="rounded-2xl border border-line p-4" style={{ ["--accent" as string]: c.accent }}>
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full" style={{ background: c.accent }} />
        <p className="flex-1 font-semibold">{c.name}</p>
        <button data-nav onClick={() => input.current?.click()} className="rounded-full border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10">{t("settings.addFiles")}</button>
        <input
          ref={input}
          type="file"
          multiple
          className="sr-only"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            for (const f of files) {
              const match = c.bios.find((b) => b.fileName.toLowerCase() === f.name.toLowerCase());
              if (!match) {
                toast({ message: t("settings.wrongFile", { name: f.name, system: c.short, expected: c.bios.map((b) => b.fileName).join(", ") }), tone: "error" });
                continue;
              }
              await putBios(c.id, match.fileName, f);
              toast({ message: t("settings.addedFile", { name: match.fileName }) });
            }
          }}
        />
      </div>
      <ul className="mt-3 flex flex-col gap-1.5 text-sm">
        {c.bios.map((b) => {
          const rec = names.get(b.fileName.toLowerCase());
          return (
            <li key={b.fileName} className="flex items-center gap-3">
              <span className={`h-1.5 w-1.5 rounded-full ${rec ? "bg-emerald-400" : b.required ? "bg-amber-300" : "bg-white/20"}`} />
              <code className="text-xs">{b.fileName}</code>
              <span className="flex-1 truncate text-xs text-muted">{b.description}{b.required ? "" : t("settings.optional")}</span>
              {rec && (
                <button onClick={() => void deleteBios(rec.key)} className="text-xs text-faint hover:text-red-300">{t("settings.remove")}</button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StorageInfo() {
  const [est, setEst] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const counts = useLiveQuery(async () => ({ games: await db().games.count(), states: await db().states.count() }));
  const t = useT();

  useEffect(() => {
    void storageEstimate().then(setEst);
    void navigator.storage?.persisted?.().then(setPersisted);
  }, [counts]);

  return (
    <div className="rounded-2xl border border-line p-5 text-sm">
      <div className="flex flex-wrap gap-x-10 gap-y-3">
        <p><span className="block text-xs text-faint">{t("settings.games")}</span>{counts?.games ?? "…"}</p>
        <p><span className="block text-xs text-faint">{t("settings.saveStates")}</span>{counts?.states ?? "…"}</p>
        <p><span className="block text-xs text-faint">{t("settings.spaceUsed")}</span>{est ? t("settings.spaceOf", { used: formatBytes(est.usage), quota: formatBytes(est.quota) }) : t("settings.unknown")}</p>
      </div>
      {est && est.quota > 0 && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, (est.usage / est.quota) * 100)}%` }} />
        </div>
      )}
      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-muted">{t(persisted ? "settings.protected" : "settings.notProtected")}</p>
        {!persisted && (
          <button data-nav onClick={async () => setPersisted(await requestPersistence())} className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
            {t("settings.protectLibrary")}
          </button>
        )}
      </div>
    </div>
  );
}
