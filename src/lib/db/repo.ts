"use client";
import { db, type GameRecord, type SlotId, type StateRecord } from "./schema";

/* ---------- Games ---------- */

export async function getGame(id: string) {
  return db().games.get(id);
}

export async function getRom(id: string) {
  return db().roms.get(id);
}

export async function toggleFavorite(id: string) {
  const g = await db().games.get(id);
  if (!g) return;
  await db().games.update(id, { favorite: g.favorite ? 0 : 1 });
}

export async function renameGame(id: string, title: string) {
  await db().games.update(id, { title: title.trim() || "Untitled" });
}

export async function setCover(id: string, cover: Blob | undefined) {
  await db().games.update(id, { cover });
}

export async function deleteGame(id: string) {
  const d = db();
  await d.transaction("rw", [d.games, d.roms, d.states, d.srams], async () => {
    await d.games.delete(id);
    await d.roms.delete(id);
    await d.states.where("gameId").equals(id).delete();
    await d.srams.delete(id);
  });
}

export async function markPlayed(id: string, addSeconds: number) {
  await db().games.where("id").equals(id).modify((g) => {
    g.lastPlayedAt = Date.now();
    g.playTimeSec = Math.round((g.playTimeSec || 0) + addSeconds);
  });
}

/* ---------- Save states ---------- */

export async function putState(gameId: string, slot: SlotId, state: Blob, thumbnail?: Blob) {
  const rec: StateRecord = { key: `${gameId}:${slot}`, gameId, slot, createdAt: Date.now(), state, thumbnail };
  await db().states.put(rec);
  return rec;
}

export async function getState(gameId: string, slot: SlotId) {
  return db().states.get(`${gameId}:${slot}`);
}

export async function listStates(gameId: string) {
  return db().states.where("gameId").equals(gameId).toArray();
}

/* ---------- SRAM (in-game battery saves) ---------- */

export async function putSram(gameId: string, blob: Blob) {
  if (blob.size === 0) return;
  await db().srams.put({ gameId, blob, updatedAt: Date.now() });
}

export async function getSram(gameId: string) {
  return (await db().srams.get(gameId))?.blob;
}

/* ---------- Collections ---------- */

export async function createCollection(name: string) {
  const id = crypto.randomUUID();
  await db().collections.add({ id, name: name.trim(), createdAt: Date.now() });
  return id;
}

export async function deleteCollection(id: string) {
  const d = db();
  await d.transaction("rw", [d.collections, d.games], async () => {
    await d.collections.delete(id);
    await d.games.where("collections").equals(id).modify((g) => {
      g.collections = g.collections.filter((c) => c !== id);
    });
  });
}

export async function toggleInCollection(gameId: string, collectionId: string) {
  await db().games.where("id").equals(gameId).modify((g) => {
    g.collections = g.collections.includes(collectionId)
      ? g.collections.filter((c) => c !== collectionId)
      : [...g.collections, collectionId];
  });
}

/* ---------- BIOS ---------- */

export async function putBios(consoleId: GameRecord["consoleId"], fileName: string, blob: Blob) {
  await db().bios.put({ key: `${consoleId}/${fileName}`, consoleId, fileName, blob });
}

export async function listBios(consoleId: GameRecord["consoleId"]) {
  return db().bios.where("consoleId").equals(consoleId).toArray();
}

export async function deleteBios(key: string) {
  await db().bios.delete(key);
}

/* ---------- Settings ---------- */

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const rec = await db().settings.get(key);
  return rec ? (rec.value as T) : fallback;
}

export async function setSetting<T>(key: string, value: T) {
  await db().settings.put({ key, value });
}

/* ---------- Storage ---------- */

export async function requestPersistence() {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}

export async function storageEstimate() {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const e = await navigator.storage.estimate();
  return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
}
