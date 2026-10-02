"use client";
import { db, type GameRecord } from "@/lib/db/schema";
import { requestPersistence } from "@/lib/db/repo";
import type { ConsoleId } from "@/lib/consoles/types";
import type { ParsedRom } from "@/workers/rom.protocol";
import { makeThumbnail, parseFiles } from "./worker-client";
import { fetchBoxArt } from "./boxart";
import { getT } from "@/lib/i18n";

export interface ImportOptions {
  /** Called when the bytes fit more than one system (e.g. a bare .bin). */
  chooseConsole: (rom: ParsedRom, candidates: ConsoleId[]) => Promise<ConsoleId | null>;
  source?: GameRecord["source"];
  sourceUrl?: string;
  author?: string;
  cover?: Blob;
  titleOverride?: string;
  forceConsole?: ConsoleId;
}

export interface ImportResult {
  added: GameRecord[];
  existing: GameRecord[];
  skipped: { name: string; reason: string }[];
}

export class ImportError extends Error {}

export async function importFiles(files: File[], opts: ImportOptions): Promise<ImportResult> {
  const payload = await Promise.all(files.map(async (f) => ({ name: f.name, buffer: await f.arrayBuffer() })));
  return importBuffers(payload, opts);
}

export async function importUrl(url: string, opts: ImportOptions & { signal?: AbortSignal }): Promise<ImportResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ImportError(getT()("import.error.badLink"));
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new ImportError(getT()("import.error.httpsOnly"));
  }
  let res: Response;
  try {
    res = await fetch(parsed, { signal: opts.signal, mode: "cors" });
  } catch {
    throw new ImportError(getT()("import.error.corsBlocked"));
  }
  if (!res.ok) throw new ImportError(getT()("import.error.httpStatus", { status: String(res.status) }));
  const disposition = res.headers.get("content-disposition") ?? "";
  const fromHeader = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1];
  const name = decodeURIComponent(fromHeader ?? parsed.pathname.split("/").pop() ?? "download.bin");
  const buffer = await res.arrayBuffer();
  return importBuffers([{ name, buffer }], { ...opts, source: opts.source ?? "url", sourceUrl: url });
}

async function importBuffers(payload: { name: string; buffer: ArrayBuffer }[], opts: ImportOptions): Promise<ImportResult> {
  const roms = await parseFiles(payload);
  const result: ImportResult = { added: [], existing: [], skipped: [] };
  if (roms.length === 0) {
    result.skipped.push(...payload.map((p) => ({ name: p.name, reason: "No playable game file found inside" })));
    return result;
  }

  for (const rom of roms) {
    if (rom.missing.length) {
      result.skipped.push({ name: rom.fileName, reason: `Missing track files: ${rom.missing.join(", ")}. Drop the .cue together with its .bin files.` });
      continue;
    }
    const existing = await db().games.get(rom.id);
    if (existing) {
      result.existing.push(existing);
      continue;
    }

    // A console page's "Import game" pins forceConsole to that system. If the file's own
    // detected candidates definitively exclude it (e.g. a .gba dropped on the NES page),
    // don't silently hand it to the wrong core — reject with a clear reason instead.
    if (opts.forceConsole && rom.candidates.length > 0 && !rom.candidates.includes(opts.forceConsole)) {
      result.skipped.push({ name: rom.fileName, reason: getT()("import.formatMismatchReason") });
      continue;
    }

    let consoleId: ConsoleId | null | undefined = opts.forceConsole;
    if (!consoleId) {
      if (rom.candidates.length === 1) consoleId = rom.candidates[0];
      else consoleId = await opts.chooseConsole(rom, rom.candidates);
    }
    if (!consoleId) {
      result.skipped.push({ name: rom.fileName, reason: "No system chosen" });
      continue;
    }

    // Explicit cover (demo catalog, custom import) wins; otherwise best-effort box art
    // for a known official title, so a plain drag-and-drop still gets real cover art
    // instead of only ever showing the generated placeholder.
    const rawCover = opts.cover ?? (await fetchBoxArt(consoleId, rom.fileName, rom.title).catch(() => null)) ?? undefined;

    const game: GameRecord = {
      id: rom.id,
      title: opts.titleOverride ?? rom.title,
      consoleId,
      fileName: rom.fileName,
      size: rom.size,
      addedAt: Date.now(),
      lastPlayedAt: 0,
      playTimeSec: 0,
      favorite: 0,
      collections: [],
      source: opts.source ?? "file",
      sourceUrl: opts.sourceUrl,
      author: opts.author,
      cover: rawCover ? await makeThumbnail(rawCover, 480).catch(() => rawCover) : undefined,
    };
    const d = db();
    await d.transaction("rw", [d.games, d.roms], async () => {
      await d.games.add(game);
      await d.roms.add({ id: rom.id, files: rom.files.map((f) => ({ name: f.name, blob: new Blob([f.bytes as BlobPart]) })) });
    });
    result.added.push(game);
  }

  if (result.added.length) void requestPersistence();
  return result;
}

export async function importCoverImage(gameId: string, file: File) {
  if (!file.type.startsWith("image/")) throw new ImportError("Covers must be an image file.");
  const thumb = await makeThumbnail(file, 480);
  await db().games.update(gameId, { cover: thumb });
}
