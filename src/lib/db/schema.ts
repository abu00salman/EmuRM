import Dexie, { type EntityTable } from "dexie";
import type { ConsoleId } from "@/lib/consoles/types";

export interface GameRecord {
  /** SHA-1 of the primary ROM — the same file imported twice is the same game. */
  id: string;
  title: string;
  consoleId: ConsoleId;
  /** Name of the primary file handed to the core (drives its format detection). */
  fileName: string;
  size: number;
  addedAt: number;
  lastPlayedAt: number;
  playTimeSec: number;
  /** 0 | 1 so it can be indexed */
  favorite: 0 | 1;
  collections: string[];
  source: "file" | "url" | "demo";
  sourceUrl?: string;
  author?: string;
  cover?: Blob;
  /** Core override; falls back to the console default. */
  coreId?: string;
}

/** ROM bytes live apart from metadata so the library never loads them to render a grid. */
export interface RomRecord {
  id: string;
  files: { name: string; blob: Blob }[];
}

export type SlotId = "auto" | "1" | "2" | "3" | "4";

export interface StateRecord {
  key: string; // `${gameId}:${slot}`
  gameId: string;
  slot: SlotId;
  createdAt: number;
  state: Blob;
  thumbnail?: Blob;
}

export interface SramRecord {
  gameId: string;
  blob: Blob;
  updatedAt: number;
}

export interface CollectionRecord {
  id: string;
  name: string;
  createdAt: number;
}

export interface BiosRecord {
  /** `${consoleId}/${fileName}` */
  key: string;
  consoleId: ConsoleId;
  fileName: string;
  blob: Blob;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}

export class RetroDB extends Dexie {
  games!: EntityTable<GameRecord, "id">;
  roms!: EntityTable<RomRecord, "id">;
  states!: EntityTable<StateRecord, "key">;
  srams!: EntityTable<SramRecord, "gameId">;
  collections!: EntityTable<CollectionRecord, "id">;
  bios!: EntityTable<BiosRecord, "key">;
  settings!: EntityTable<SettingRecord, "key">;

  constructor() {
    super("emurm");
    this.version(1).stores({
      games: "id, consoleId, lastPlayedAt, addedAt, favorite, title, *collections",
      roms: "id",
      states: "key, gameId, createdAt",
      srams: "gameId",
      collections: "id, name",
      bios: "key, consoleId",
      settings: "key",
    });
  }
}

let instance: RetroDB | null = null;

/** Lazily opened so server rendering / static export never touches IndexedDB. */
export function db(): RetroDB {
  if (!instance) instance = new RetroDB();
  return instance;
}
