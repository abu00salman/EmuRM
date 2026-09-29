import type { ConsoleId } from "@/lib/consoles/types";

export interface ParsedRom {
  id: string;
  title: string;
  fileName: string;
  size: number;
  candidates: ConsoleId[];
  files: { name: string; bytes: Uint8Array }[];
  /** Tracks referenced by a .cue that weren't provided */
  missing: string[];
}

export type WorkerRequest =
  | { id: number; type: "parse"; files: { name: string; buffer: ArrayBuffer }[] }
  | { id: number; type: "thumbnail"; blob: Blob; width: number };

export type WorkerResponse =
  | { id: number; ok: true; type: "parse"; roms: ParsedRom[] }
  | { id: number; ok: true; type: "thumbnail"; blob: Blob }
  | { id: number; ok: false; error: string };
