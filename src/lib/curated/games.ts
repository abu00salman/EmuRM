import raw from "../../../data/games.json";
import type { ConsoleId } from "@/lib/consoles/types";

export type CuratedStatus = "verified" | "broken" | "untested";

export interface CuratedGame {
  id: string;
  title: string;
  platform: string;
  type: "instant" | "requires-user-file";
  sourceUrl: string;
  license: string;
  licenseEvidenceUrl: string;
  assetLicenses?: string[];
  author: string;
  genres: string[];
  description: { en: string; ar: string };
  cover: string;
  launch:
    | { kind: "html5"; entry: string; readyText?: string }
    | { kind: "rom"; consoleId: ConsoleId; file: string; filename: string }
    | { kind: "local-file"; consoleId: ConsoleId };
  redistribution: "permitted" | "not-permitted";
  engine: string;
  browserPlayable: "hosted" | "local-file" | "none";
  permissionNote?: string;
  status: CuratedStatus;
}

export const CURATED_GAMES = raw.games as CuratedGame[];

export function getCurated(id: string) {
  return CURATED_GAMES.find((game) => game.id === id);
}

export function instantGames() {
  return CURATED_GAMES.filter((game) => game.type === "instant");
}

export function userFileGames() {
  return CURATED_GAMES.filter((game) => game.type === "requires-user-file");
}
