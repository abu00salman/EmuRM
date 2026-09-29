"use client";
import type { ParsedRom, WorkerRequest, WorkerResponse } from "@/workers/rom.protocol";

type Pending = { resolve: (r: WorkerResponse) => void; reject: (e: Error) => void };

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("../../workers/rom.worker.ts", import.meta.url), { type: "module", name: "rom-worker" });
  worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
    const p = pending.get(ev.data.id);
    if (!p) return;
    pending.delete(ev.data.id);
    if (ev.data.ok) p.resolve(ev.data);
    else p.reject(new Error(ev.data.error));
  };
  worker.onerror = (ev) => {
    for (const p of pending.values()) p.reject(new Error(ev.message || "ROM worker crashed"));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;

function call(req: WithoutId<WorkerRequest>, transfer: Transferable[] = []): Promise<WorkerResponse> {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ ...req, id }, transfer);
  });
}

export async function parseFiles(files: { name: string; buffer: ArrayBuffer }[]): Promise<ParsedRom[]> {
  const res = await call({ type: "parse", files }, files.map((f) => f.buffer));
  if (res.ok && res.type === "parse") return res.roms;
  throw new Error("Unexpected worker response");
}

export async function makeThumbnail(blob: Blob, width = 480): Promise<Blob> {
  const res = await call({ type: "thumbnail", blob, width });
  if (res.ok && res.type === "thumbnail") return res.blob;
  throw new Error("Unexpected worker response");
}
