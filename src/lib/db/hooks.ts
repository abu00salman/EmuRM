"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type GameRecord } from "./schema";
import type { ConsoleId } from "@/lib/consoles/types";

export function useGames(consoleId?: ConsoleId): GameRecord[] | undefined {
  return useLiveQuery(
    () => (consoleId ? db().games.where("consoleId").equals(consoleId).toArray() : db().games.toArray()),
    [consoleId],
  );
}

export function useGame(id: string | null): GameRecord | undefined | null {
  return useLiveQuery(async () => (id ? (await db().games.get(id)) ?? null : null), [id]);
}

/** Recently played games that have an auto-save to resume from. */
export function useQuickResume(limit = 8) {
  return useLiveQuery(async () => {
    const recent = await db().games.orderBy("lastPlayedAt").reverse().filter((g) => g.lastPlayedAt > 0).limit(limit).toArray();
    const states = await Promise.all(recent.map((g) => db().states.get(`${g.id}:auto`)));
    return recent.map((g, i) => ({ game: g, auto: states[i] }));
  }, [limit]);
}

export function useCountsByConsole(): Record<string, number> | undefined {
  return useLiveQuery(async () => {
    const counts: Record<string, number> = {};
    await db().games.each((g) => {
      counts[g.consoleId] = (counts[g.consoleId] ?? 0) + 1;
    });
    return counts;
  });
}

export function useCollections() {
  return useLiveQuery(() => db().collections.orderBy("name").toArray());
}

export function useStates(gameId: string | null) {
  return useLiveQuery(async () => (gameId ? db().states.where("gameId").equals(gameId).toArray() : []), [gameId]);
}

export function useSetting<T>(key: string, fallback: T): T {
  const v = useLiveQuery(async () => (await db().settings.get(key))?.value as T | undefined, [key]);
  return v === undefined ? fallback : v;
}
